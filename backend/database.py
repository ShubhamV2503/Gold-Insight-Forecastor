from google.cloud import bigquery
import os
from dotenv import load_dotenv

load_dotenv()

import json
from google.oauth2 import service_account

DATASET_ID = os.getenv("BQ_DATASET_ID", "gold_forecasting")

# Flexible credentials for local vs Vercel
creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
if creds_json:
    info = json.loads(creds_json)
    credentials = service_account.Credentials.from_service_account_info(info)
    client = bigquery.Client(credentials=credentials, project=info.get('project_id'))
else:
    client = bigquery.Client()

def get_historical_data():
    query = f"SELECT * FROM `{DATASET_ID}.gold_prices` ORDER BY date ASC"
    df = client.query(query).to_dataframe()
    return df.to_dict(orient='records')

def get_forecast_data(model_name=None):
    if not model_name:
        # Default to the best model based on metrics
        metrics = get_model_metrics()
        # Find the one with lowest MAPE
        if metrics:
            best_model_metric = min(metrics, key=lambda x: x['metric_value'])
            model_name = best_model_metric['metric_name'].replace('_MAPE', '')
        else:
            model_name = 'SARIMAX'
            
    query = f"SELECT * FROM `{DATASET_ID}.forecasts` WHERE model_name = '{model_name}' ORDER BY forecast_date ASC"
    df = client.query(query).to_dataframe()
    return df.to_dict(orient='records')

def get_model_metrics():
    query = f"SELECT metric_name, metric_value, timestamp FROM `{DATASET_ID}.model_metrics` ORDER BY timestamp DESC"
    df = client.query(query).to_dataframe()
    # Keep only the latest for each model
    df = df.sort_values('timestamp', ascending=False).drop_duplicates('metric_name')
    return df.to_dict(orient='records')
