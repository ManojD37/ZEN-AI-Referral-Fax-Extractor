#!/bin/bash

echo "===================================="
echo "Medical Referral Extractor - Startup"
echo "===================================="
echo

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.example to backend/.env and configure your Azure credentials"
    exit 1
fi

echo "Installing dependencies..."
pip install -r backend/requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo
echo "Starting services..."
echo
echo "FastAPI will run on: http://localhost:8000"
echo "Streamlit will run on: http://localhost:8501"
echo

# Start FastAPI in background
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
FASTAPI_PID=$!
cd ..

# Wait a moment for FastAPI to start
sleep 3

# Start Streamlit (foreground)
streamlit run app.py --server.port 8501

# Cleanup
echo
echo "Shutting down..."
kill $FASTAPI_PID
