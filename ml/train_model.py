import pandas as pd
import numpy as np
import pickle
from statsmodels.tsa.statespace.sarimax import SARIMAX
from prophet import Prophet
from google.cloud import bigquery
import os
import pickle
from dotenv import load_dotenv
import logging
from datetime import datetime, timedelta

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DATASET_ID = os.getenv("BQ_DATASET_ID", "gold_forecasting")
client = bigquery.Client()

def load_data():
    query = f"SELECT date, close FROM `{DATASET_ID}.gold_prices` ORDER BY date ASC"
    return client.query(query).to_dataframe()

def get_current_mape(model_name):
    metric_key = f"{model_name}_MAPE"
    query = f"""
        SELECT metric_value 
        FROM `{DATASET_ID}.model_metrics` 
        WHERE metric_name = '{metric_key}' 
        ORDER BY timestamp DESC 
        LIMIT 1
    """
    try:
        results = client.query(query).to_dataframe()
        if not results.empty:
            return results.iloc[0]['metric_value']
    except Exception as e:
        logger.warning(f"Could not fetch current MAPE for {model_name}: {e}")
    return float('inf')

def train_sarimax(df):
    logger.info("Training SARIMAX model with trend...")
    # trend='t' allows the model to capture a linear trend (drift)
    model = SARIMAX(df['close'], order=(1, 1, 1), trend='t')
    model_fit = model.fit(disp=False)
    
    # Backtest for MAPE (last 30 days)
    train_size = len(df) - 30
    train, test = df.iloc[:train_size], df.iloc[train_size:]
    test_model = SARIMAX(train['close'], order=(1, 1, 1), trend='t').fit(disp=False)
    pred = test_model.forecast(steps=30)
    mape = np.mean(np.abs((test['close'] - pred) / test['close'])) * 100
    
    return model_fit, mape

def train_prophet(df):
    logger.info("Training Prophet model...")
    pdf = df.reset_index().rename(columns={'date': 'ds', 'close': 'y'})
    pdf['ds'] = pdf['ds'].dt.tz_localize(None) # Remove timezone
    model = Prophet(daily_seasonality=True)
    model.fit(pdf)
    
    # Backtest for MAPE (last 30 days)
    train_size = len(pdf) - 30
    train, test = pdf.iloc[:train_size], pdf.iloc[train_size:]
    test_model = Prophet(daily_seasonality=True).fit(train)
    future = test_model.make_future_dataframe(periods=30)
    forecast = test_model.predict(future)
    pred = forecast['yhat'].iloc[-30:].values
    mape = np.mean(np.abs((test['y'] - pred) / test['y'])) * 100
    
    return model, mape

def save_to_bigquery(forecast_df, mape, model_name):
    # Save forecasts
    table_id = f"{DATASET_ID}.forecasts"
    # We add a model_name column for comparison
    forecast_df['model_name'] = model_name
    # We truncate the forecast table so only the LATEST (best) predictions are active
    job_config = bigquery.LoadJobConfig(write_disposition="WRITE_TRUNCATE")
    client.load_table_from_dataframe(forecast_df, table_id, job_config=job_config).result()
    
    # Save metrics
    metrics_table = f"{DATASET_ID}.model_metrics"
    metrics_df = pd.DataFrame([{
        'metric_name': f'{model_name}_MAPE',
        'metric_value': mape,
        'timestamp': datetime.now()
    }])
    client.load_table_from_dataframe(metrics_df, metrics_table, job_config=bigquery.LoadJobConfig(write_disposition="WRITE_APPEND")).result()
    logger.info(f"{model_name} saved. MAPE: {mape:.2f}%")

if __name__ == "__main__":
    raw_data = load_data()
    if not raw_data.empty:
        raw_data['date'] = pd.to_datetime(raw_data['date'])
        df = raw_data.set_index('date').resample('D').last().ffill()

        # SARIMAX
        current_s_mape = get_current_mape("SARIMAX")
        s_model, s_mape = train_sarimax(df)
        
        if s_mape < current_s_mape:
            logger.info(f"SARIMAX Improved! New MAPE: {s_mape:.2f}% (Previous: {current_s_mape:.2f}%)")
            with open('sarimax_model.pkl', 'wb') as f:
                pickle.dump(s_model, f)
                
            s_forecast = s_model.get_forecast(steps=365).summary_frame()
            s_res = pd.DataFrame({
                'forecast_date': [df.index[-1] + timedelta(days=i) for i in range(1, 366)],
                'forecast_value': s_forecast['mean'].values,
                'lower_bound': s_forecast['mean_ci_lower'].values,
                'upper_bound': s_forecast['mean_ci_upper'].values
            })
            save_to_bigquery(s_res, s_mape, "SARIMAX")
        else:
            logger.info(f"SARIMAX did not improve (New: {s_mape:.2f}%, Existing: {current_s_mape:.2f}%). Keeping existing model.")

        # Prophet
        current_p_mape = get_current_mape("Prophet")
        p_model, p_mape = train_prophet(df)
        
        if p_mape < current_p_mape:
            logger.info(f"Prophet Improved! New MAPE: {p_mape:.2f}% (Previous: {current_p_mape:.2f}%)")
            with open('prophet_model.pkl', 'wb') as f:
                pickle.dump(p_model, f)
                
            p_future = p_model.make_future_dataframe(periods=365)
            p_forecast = p_model.predict(p_future).iloc[-365:]
            p_res = pd.DataFrame({
                'forecast_date': p_forecast['ds'].values,
                'forecast_value': p_forecast['yhat'].values,
                'lower_bound': p_forecast['yhat_lower'].values,
                'upper_bound': p_forecast['yhat_upper'].values
            })
            save_to_bigquery(p_res, p_mape, "Prophet")
        else:
            logger.info(f"Prophet did not improve (New: {p_mape:.2f}%, Existing: {current_p_mape:.2f}%). Keeping existing model.")
        
        logger.info("All models trained and validated.")
    else:
        logger.error("No data found in BigQuery to train model.")
