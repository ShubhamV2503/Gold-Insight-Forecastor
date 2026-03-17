from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import pickle
import pandas as pd
from datetime import datetime
from database import get_historical_data, get_forecast_data, get_model_metrics

app = FastAPI(title="Gold Price Forecasting API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = "/app/ml"

@app.get("/historical-data")
async def historical_data():
    try:
        data = get_historical_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/forecast")
async def forecast(model: str = Query(None)):
    try:
        data = get_forecast_data(model)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def metrics():
    try:
        data = get_model_metrics()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict-date")
async def predict_date(
    target_date: str = Query(..., description="Date in YYYY-MM-DD format"),
    model_name: str = Query("SARIMAX", description="Model to use (SARIMAX or Prophet)")
):
    try:
        model_file = "sarimax_model.pkl" if model_name == "SARIMAX" else "prophet_model.pkl"
        model_path = os.path.join(MODEL_DIR, model_file)
        
        if not os.path.exists(model_path):
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found.")
            
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
            
        target_dt = pd.to_datetime(target_date).tz_localize(None)
        
        # Get latest MAPE for context
        all_metrics = get_model_metrics()
        metric_key = f"{model_name}_MAPE"
        mape = next((m['metric_value'] for m in all_metrics if m['metric_name'] == metric_key), 0)

        if model_name == "SARIMAX":
            last_date = model.data.dates[-1].tz_localize(None)
            if target_dt <= last_date:
                return {"date": target_date, "prediction": None, "error": "Please select a future date."}
            days_ahead = (target_dt - last_date).days
            forecast = model.get_forecast(steps=days_ahead)
            summary = forecast.summary_frame().iloc[-1]
            pred, lower, upper = summary['mean'], summary['mean_ci_lower'], summary['mean_ci_upper']
        else:
            # Prophet
            # Check if target_dt is in the future relative to model history
            last_date = model.history['ds'].max()
            if target_dt <= last_date:
                return {"date": target_date, "prediction": None, "error": "Please select a future date."}
            
            future = pd.DataFrame({'ds': [target_dt]})
            forecast = model.predict(future).iloc[0]
            pred, lower, upper = forecast['yhat'], forecast['yhat_lower'], forecast['yhat_upper']
        
        return {
            "date": target_date,
            "prediction": pred,
            "lower_bound": lower,
            "upper_bound": upper,
            "mape": mape,
            "model_used": model_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy"}
