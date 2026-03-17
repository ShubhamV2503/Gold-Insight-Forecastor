# --- Build Frontend ---
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Inject the production API URL (relative to the same domain)
ENV VITE_API_URL=/api
RUN npm run build

# --- Build Backend & Final Image ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (including Nginx for serving frontend)
RUN apt-get update && apt-get install -y \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy backend and install dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code and pre-trained models
COPY backend/ ./backend/
COPY ml/ ./ml/

# Copy built frontend to Nginx html directory
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Configure Nginx to proxy /api to the FastAPI backend
RUN echo 'server { \
    listen 7860; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://localhost:8000/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/sites-available/default

# Re-link for safety
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Entrypoint script
COPY run.sh ./
RUN chmod +x run.sh

# Hugging Face Spaces uses port 7860 by default
EXPOSE 7860

CMD ["./run.sh"]
