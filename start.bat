@echo off
echo ====================================
echo Medical Referral Extractor - Startup
echo ====================================
echo.

REM Check if .env file exists
if not exist "backend\.env" (
    echo ERROR: .env file not found!
    echo Please copy .env.example to backend\.env and configure your Azure credentials
    pause
    exit /b 1
)

echo Installing dependencies...
python -m pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting services...
echo.
echo FastAPI will run on: http://localhost:8000
echo Streamlit will run on: http://localhost:8501
echo.

REM Start FastAPI in background
start "FastAPI Backend" cmd /c "cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait a moment for FastAPI to start
timeout /t 3 /nobreak > nul

REM Start Streamlit in foreground
streamlit run app.py --server.port 8501

echo.
echo Shutting down...
taskkill /FI "WindowTitle eq FastAPI Backend*" /T /F
