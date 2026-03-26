# Production Dockerfile for Medical Referral Extractor
# Multi-stage build: Frontend (React) + Backend (FastAPI)

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build Python backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (Poppler for PDF processing)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app ./app

# Copy React build from Stage 1 to backend's static directory
COPY --from=frontend-build /app/client/build ./static

# Create necessary directories
RUN mkdir -p uploads logs && \
    chmod 777 uploads logs

# Expose port (8000 for FastAPI serving both API and Frontend)
EXPOSE 8000

# Health check (API health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run FastAPI with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
