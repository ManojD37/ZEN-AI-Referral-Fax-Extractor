# ⚡ Quick Start Guide

## 🚀 Get Running in 3 Steps

### Step 1: Configure Azure Credentials

1. Copy the example environment file:
   ```
   Copy: .env.example
   Paste as: backend\.env
   ```

2. Open `backend\.env` and add your Azure OpenAI credentials:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key-here
   AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
   AZURE_OPENAI_API_VERSION=2024-08-01-preview
   ```

   *(Optional - for history feature)*
   ```env
   AZURE_STORAGE_CONNECTION_STRING=your-connection-string
   AZURE_BLOB_CONTAINER=extraction-results
   ```

### Step 2: Install Tesseract OCR

**Windows:**
- Download: https://github.com/UB-Mannheim/tesseract/wiki
- Install and add to PATH
- Or install to default location: `C:\Program Files\Tesseract-OCR\`

**Mac:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr poppler-utils
```

### Step 3: Run the Application

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

---

## 🌐 Access the Application

Once started, open your browser:

- **Streamlit UI**: http://localhost:8501
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 📤 Test with Sample File

1. Go to http://localhost:8501
2. Click "📤 Upload"  
3. Choose a file from `Test Files/` folder
4. Click "🚀 Extract Referral Data"
5. View results in "📊 Results" page

---

## 🛑 Stop the Application

Press `Ctrl + C` in the terminal running Streamlit

---

## ❓ Troubleshooting

### "Tesseract not found"
- Windows: Add Tesseract to PATH or set in code
- Mac/Linux: Ensure installed via package manager

### "Port already in use"
Change ports in `start.bat`/`start.sh`:
```bash
--port 8000  # Change to 8001
--server.port 8501  # Change to 8502
```

### "Module not found"
Reinstall dependencies:
```bash
pip install -r backend/requirements.txt --force-reinstall
```

### "Azure API error"
Check your credentials in `backend/.env`:
- Endpoint URL is correct
- API key is valid
- Deployment name matches

---

## 📚 Full Documentation

- **README.md** - Complete documentation
- **DEPLOYMENT.md** - Deployment options (Docker, Azure)  
- **walkthrough.md** - All changes made

---

**Need help? Check the logs in `backend/logs/`**
