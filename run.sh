#!/bin/bash

# Start the FastAPI backend in the background
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Start the Nginx server for the frontend
nginx -g 'daemon off;'
