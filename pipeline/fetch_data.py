import yfinance as yf
import pandas as pd
from google.cloud import bigquery
import os
from dotenv import load_dotenv
import logging

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DATASET_ID = os.getenv("BQ_DATASET_ID", "gold_forecasting")
TABLE_ID = f"{DATASET_ID}.gold_prices"

client = bigquery.Client()

def ensure_dataset_exists():
    """Create BigQuery dataset if it doesn't exist."""
    dataset_ref = bigquery.DatasetReference(client.project, DATASET_ID)
    try:
        client.get_dataset(dataset_ref)
        logger.info(f"Dataset {DATASET_ID} already exists.")
    except Exception:
        logger.info(f"Creating dataset {DATASET_ID}...")
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = "US"
        client.create_dataset(dataset)
        logger.info(f"Dataset {DATASET_ID} created.")

def fetch_gold_prices():
    """Fetch 5 years of gold prices (GC=F) from Yahoo Finance."""
    logger.info("Fetching 5-year gold prices from Yahoo Finance...")
    gold = yf.Ticker("GC=F")
    df = gold.history(period="5y")
    
    if df.empty:
        logger.error("No data fetched from Yahoo Finance.")
        return None
    
    df = df.reset_index()
    df['Date'] = df['Date'].dt.tz_localize(None) # Remove timezone for BQ compatibility
    df.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close'}, inplace=True)
    
    # Select needed columns
    df = df[["date", "open", "high", "low", "close"]]
    return df

def upload_to_bigquery(df):
    """Upload dataframe to BigQuery."""
    if df is None or df.empty:
        logger.warning("No data to upload.")
        return

    # Define schema explicitly for table creation
    schema = [
        bigquery.SchemaField("date", "TIMESTAMP"),
        bigquery.SchemaField("open", "FLOAT64"),
        bigquery.SchemaField("high", "FLOAT64"),
        bigquery.SchemaField("low", "FLOAT64"),
        bigquery.SchemaField("close", "FLOAT64"),
    ]

    job_config = bigquery.LoadJobConfig(
        schema=schema,
        write_disposition="WRITE_TRUNCATE",
    )

    logger.info(f"Uploading {len(df)} rows to {TABLE_ID}...")
    try:
        job = client.load_table_from_dataframe(df, TABLE_ID, job_config=job_config)
        job.result()
        logger.info("Upload complete.")
    except Exception as e:
        logger.error(f"Error uploading to BigQuery: {e}")

if __name__ == "__main__":
    ensure_dataset_exists()
    df = fetch_gold_prices()
    upload_to_bigquery(df)
