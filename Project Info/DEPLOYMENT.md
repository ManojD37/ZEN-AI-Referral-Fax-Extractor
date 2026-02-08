# 📋 Deployment Guide - Medical Referral Extractor

## 🎯 Deployment Options

### Option 1: Local Development (Recommended for Testing)
### Option 2: Docker Deployment
### Option 3: Azure App Service

---

## 🖥️ Option 1: Local Development

### Prerequisites
- Python 3.9+
- Tesseract OCR installed
- Azure OpenAI API key

### Steps

1. **Configure Environment**
   ```bash
   cp .env.example backend/.env
   ```
   
   Edit `backend/.env`:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key
   AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
   ```

2. **Install Tesseract**
   - Windows: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)
   - Mac: `brew install tesseract`
   - Linux: `sudo apt install tesseract-ocr poppler-utils`

3. **Run Application**
   ```bash
   # Windows
   start.bat
   
   # Linux/Mac
   chmod +x start.sh && ./start.sh
   ```

4. **Access**
   - Streamlit: http://localhost:8501
   - API: http://localhost:8000/docs

---

## 🐳 Option 2: Docker Deployment

### Prerequisites
- Docker installed
- Docker Compose installed

### Steps

1. **Configure Environment**
   ```bash
   cp .env.example backend/.env
   # Edit backend/.env with your Azure credentials
   ```

2. **Build & Run**
   ```bash
   docker-compose up --build
   ```

3. **Access**
   - Streamlit: http://localhost:8501
   - API: http://localhost:8000

4. **Stop**
   ```bash
   docker-compose down
   ```

### Production Docker

```bash
# Build production image
docker build -t medical-referral-extractor:latest .

# Run container
docker run -d \
  -p 8000:8000 \
  -p 8501:8501 \
  --env-file backend/.env \
  --name med-referral \
  medical-referral-extractor:latest
```

---

## ☁️ Option 3: Azure App Service

### Prerequisites
- Azure account
- Azure CLI installed
- Docker installed (for container deployment)

### Method A: Deploy as Web App (Python)

1. **Create App Service Plan**
   ```bash
   az appservice plan create \
     --name medical-referral-plan \
     --resource-group your-resource-group \
     --sku B1 \
     --is-linux
   ```

2. **Create Web App**
   ```bash
   az webapp create \
     --name medical-referral-extractor \
     --resource-group your-resource-group \
     --plan medical-referral-plan \
     --runtime "PYTHON:3.9"
   ```

3. **Configure Environment Variables**
   ```bash
   az webapp config appsettings set \
     --name medical-referral-extractor \
     --resource-group your-resource-group \
     --settings \
       AZURE_OPENAI_ENDPOINT="your-endpoint" \
       AZURE_OPENAI_API_KEY="your-key" \
       AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini"
   ```

4. **Deploy Code**
   ```bash
   az webapp up \
     --name medical-referral-extractor \
     --resource-group your-resource-group
   ```

### Method B: Deploy as Container

1. **Build and Push to Azure Container Registry**
   ```bash
   # Create ACR
   az acr create \
     --name yourregistry \
     --resource-group your-resource-group \
     --sku Basic
   
   # Build and push
   az acr build \
     --registry yourregistry \
     --image medical-referral:latest \
     --file Dockerfile .
   ```

2. **Create Web App for Containers**
   ```bash
   az webapp create \
     --name medical-referral-extractor \
     --resource-group your-resource-group \
     --plan medical-referral-plan \
     --deployment-container-image yourregistry.azurecr.io/medical-referral:latest
   ```

3. **Configure Ports**
   ```bash
   az webapp config appsettings set \
     --name medical-referral-extractor \
     --resource-group your-resource-group \
     --settings WEBSITES_PORT=8501
   ```

---

## 🔧 Post-Deployment Configuration

### Enable Blob Storage (History Feature)

1. **Create Storage Account**
   ```bash
   az storage account create \
     --name medicalreferralstorage \
     --resource-group your-resource-group \
     --location eastus \
     --sku Standard_LRS
   ```

2. **Get Connection String**
   ```bash
   az storage account show-connection-string \
     --name medicalreferralstorage \
     --resource-group your-resource-group
   ```

3. **Add to Environment Variables**
   ```env
   AZURE_STORAGE_CONNECTION_STRING=your-connection-string
   AZURE_BLOB_CONTAINER=extraction-results
   ```

### Enable Custom Domain

```bash
az webapp config hostname add \
  --webapp-name medical-referral-extractor \
  --resource-group your-resource-group \
  --hostname your-domain.com
```

### Enable SSL

```bash
az webapp config ssl bind \
  --name medical-referral-extractor \
  --resource-group your-resource-group \
  --certificate-thumbprint your-thumbprint \
  --ssl-type SNI
```

---

## 📊 Monitoring & Logs

### View Application Logs

```bash
# Stream logs
az webapp log tail \
  --name medical-referral-extractor \
  --resource-group your-resource-group

# Download logs
az webapp log download \
  --name medical-referral-extractor \
  --resource-group your-resource-group
```

### Enable Application Insights

```bash
az monitor app-insights component create \
  --app medical-referral-insights \
  --location eastus \
  --resource-group your-resource-group
```

---

## 🔐 Security Best Practices

1. **Use Azure Key Vault**
   ```bash
   # Create Key Vault
   az keyvault create \
     --name medical-referral-vault \
     --resource-group your-resource-group
   
   # Store secrets
   az keyvault secret set \
     --vault-name medical-referral-vault \
     --name "azure-openai-key" \
     --value "your-key"
   ```

2. **Enable Managed Identity**
   ```bash
   az webapp identity assign \
     --name medical-referral-extractor \
     --resource-group your-resource-group
   ```

3. **Configure CORS (if needed)**
   ```bash
   az webapp cors add \
     --name medical-referral-extractor \
     --resource-group your-resource-group \
     --allowed-origins "https://your-domain.com"
   ```

---

## 🧪 Testing Deployment

1. **Health Check**
   ```bash
   curl https://your-app.azurewebsites.net/health
   ```

2. **Upload Test**
   ```bash
   curl -X POST https://your-app.azurewebsites.net/upload \
     -F "file=@test.pdf"
   ```

3. **Check Logs**
   ```bash
   az webapp log tail --name medical-referral-extractor \
     --resource-group your-resource-group
   ```

---

## 🚨 Troubleshooting

### App Won't Start

**Check logs:**
```bash
az webapp log tail --name your-app --resource-group your-rg
```

**Common issues:**
- Missing environment variables
- Tesseract not in Docker image
- Port configuration (use 8501 for Streamlit)

### OCR Not Working

**Solution:** Ensure Tesseract is installed in Docker image
```dockerfile
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils
```

### Blob Storage Connection Failed

**Check:**
- Connection string is correct
- Container name matches configuration
- Storage account allows public access or managed identity

---

## 💰 Cost Estimation

### Azure App Service
- **Basic (B1)**: ~$13/month
- **Standard (S1)**: ~$70/month

### Azure OpenAI
- **GPT-4o-mini**: ~$0.15 per 1M tokens
- Estimate: ~$5-20/month for moderate use

### Azure Blob Storage
- **Standard LRS**: ~$0.02/GB/month
- Estimate: ~$1-5/month

**Total**: ~$20-100/month depending on usage

---

## 📝 Checklist

- [ ] Azure OpenAI configured
- [ ] Tesseract OCR installed (Docker) or available (App Service)
- [ ] Environment variables set
- [ ] Blob storage configured (optional)
- [ ] Health endpoint responding
- [ ] Upload functionality tested
- [ ] Logs accessible
- [ ] SSL enabled (production)
- [ ] Custom domain configured (optional)
- [ ] Monitoring enabled

---

## 🆘 Support

- **Logs**: Check `backend/logs/` or Azure portal
- **API Docs**: `/docs` endpoint
- **Health**: `/health` endpoint

---

**Deployment completed successfully! 🎉**
