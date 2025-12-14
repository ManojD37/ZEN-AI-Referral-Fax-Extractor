# # # backend/Dockerfile

# FROM python:3.11-slim

# # Install system deps for pdf2image and tesseract
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     poppler-utils \
#     tesseract-ocr \
#     libtesseract-dev \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# COPY app ./app
# COPY .env .env 
# ENV PYTHONPATH=/app
# ENV UPLOAD_DIR=/app/uploads
# RUN mkdir -p /app/uploads

# EXPOSE 8000
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


#
## deployment dockerfile
# backend/Dockerfile
FROM python:3.11-slim

# Install system deps for pdf2image and tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \
    libtesseract-dev \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app

# Do NOT copy .env into the image in CI or production.
# Secrets / env vars should be configured at runtime on Render/Azure (not baked into image).
# If you need build-time values, use ARG and --build-arg (avoid secrets).

ENV PYTHONPATH=/app
ENV UPLOAD_DIR=/app/uploads

RUN mkdir -p /app/uploads

# Create a non-root user and give ownership of /app
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
