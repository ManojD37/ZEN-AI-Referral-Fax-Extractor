# Azure App Service Deployment Guide (Docker Container)

## 🎯 Overview

This guide explains how to deploy the Medical Referral Extractor to **Azure App Service** using **Docker containers** via **GitHub Actions**.

**Why Docker on App Service?**
- ✅ Tesseract OCR included (no need for Azure Document Intelligence)
- ✅ Automated deployment via GitHub Actions
- ✅ Still uses Azure App Service (managed PaaS)
- ✅ Easy to update and scale

---

## 📋 Prerequisites

1. **Azure Account** with active subscription
2. **GitHub Repository** for your code
3. **Azure CLI** installed (for initial setup)

---

## 🚀 Step-by-Step Deployment

### Step 1: Create Azure Resources

**1.1 Create Resource Group**
```bash
az group create \
  --name medical-referral-rg \
  --location eastus
```

**1.2 Create Container Registry (ACR) - OPTIONAL**
*You can use GitHub Container Registry instead (free)*

```bash
# Skip this if using GitHub Container Registry
az acr create \
  --resource-group medical-referral-rg \
  --name medicalreferralacr \
  --sku Basic
```

**1.3 Create App Service Plan (Linux)**
```bash
az appservice plan create \
  --name medical-referral-plan \
  --resource-group medical-referral-rg \
  --is-linux \
  --sku B1
```

**1.4 Create Web App for Containers**
```bash
az webapp create \
  --resource-group medical-referral-rg \
  --plan medical-referral-plan \
  --name medical-referral-extractor \
  --deployment-container-image-name nginx  # Placeholder, will be replaced by workflow
```

---

### Step 2: Configure Azure Web App

**2.1 Configure Container Settings**
```bash
az webapp config appsettings set \
  --resource-group medical-referral-rg \
  --name medical-referral-extractor \
  --settings \
    WEBSITES_PORT=8000 \
    DOCKER_REGISTRY_SERVER_URL=https://ghcr.io \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
```

**2.2 Add Environment Variables**
```bash
az webapp config appsettings set \
  --resource-group medical-referral-rg \
  --name medical-referral-extractor \
  --settings \
    AZURE_OPENAI_ENDPOINT="your-endpoint" \
    AZURE_OPENAI_API_KEY="your-api-key" \
    AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini" \
    AZURE_OPENAI_API_VERSION="2024-08-01-preview" \
    AZURE_STORAGE_CONNECTION_STRING="your-connection-string" \
    AZURE_BLOB_CONTAINER="extraction-results" \
    ENVIRONMENT="azure" \
    DEBUG="false"
```

**2.3 Enable Continuous Deployment**
```bash
az webapp deployment container config \
  --resource-group medical-referral-rg \
  --name medical-referral-extractor \
  --enable-cd true
```

---

### Step 3: Setup GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

**Required:**
1. `AZURE_WEBAPP_PUBLISH_PROFILE`
   ```bash
   # Get publish profile
   az webapp deployment list-publishing-profiles \
     --resource-group medical-referral-rg \
     --name medical-referral-extractor \
     --xml
   ```
   Copy the entire XML output

2. `AZURE_RESOURCE_GROUP`
   ```
   medical-referral-rg
   ```

**Optional (if using Azure Container Registry):**
3. `AZURE_CONTAINER_REGISTRY`
   ```
   medicalreferralacr.azurecr.io
   ```

4. `ACR_USERNAME` and `ACR_PASSWORD`
   ```bash
   az acr credential show --name medicalreferralacr
   ```

---

### Step 4: Update Workflow File

Edit `.github/workflows/azure-deploy.yml`:

```yaml
env:
  AZURE_WEBAPP_NAME: medical-referral-extractor  # ← Change this
```

---

### Step 5: Deploy

**Push to GitHub:**
```bash
git add .
git commit -m "Add Azure deployment workflow"
git push origin main
```

**GitHub Actions will automatically:**
1. Build Docker image with Tesseract
2. Push to GitHub Container Registry
3. Deploy to Azure App Service
4. Restart the app

**Monitor deployment:**
- GitHub: `https://github.com/your-repo/actions`
- Azure: `https://portal.azure.com`

---

### Step 6: Verify Deployment

**Check deployment:**
```bash
az webapp show \
  --resource-group medical-referral-rg \
  --name medical-referral-extractor \
  --query defaultHostName \
  --output tsv
```

**Open in browser:**
```
https://medical-referral-extractor.azurewebsites.net
```

**Check logs:**
```bash
az webapp log tail \
  --resource-group medical-referral-rg \
  --name medical-referral-extractor
```

---

## 🔧 Troubleshooting

### Container Won't Start

**Check logs:**
```bash
az webapp log tail --name medical-referral-extractor --resource-group medical-referral-rg
```

**Common issues:**
- Wrong `WEBSITES_PORT` (should be 8501)
- Missing environment variables
- Container registry authentication

### Tesseract Not Working

**Verify Dockerfile includes:**
```dockerfile
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils
```

### App Too Slow

**Scale up:**
```bash
az appservice plan update \
  --name medical-referral-plan \
  --resource-group medical-referral-rg \
  --sku S1  # Standard tier
```

---

## 📊 Cost Estimation

| Resource | Tier | Monthly Cost |
|----------|------|--------------|
| App Service Plan (B1) | Basic | ~$13 |
| App Service Plan (S1) | Standard | ~$70 |
| Azure OpenAI | Pay-per-use | ~$5-20 |
| Blob Storage | Standard | ~$1-5 |
| **Total** | | **~$20-100** |

---

## 🔐 Security Best Practices

1. **Use Key Vault for secrets:**
   ```bash
   az keyvault create --name medical-referral-kv --resource-group medical-referral-rg
   ```

2. **Enable Managed Identity:**
   ```bash
   az webapp identity assign --name medical-referral-extractor --resource-group medical-referral-rg
   ```

3. **Configure Custom Domain + SSL:**
   ```bash
   az webapp config hostname add --webapp-name medical-referral-extractor \
     --resource-group medical-referral-rg --hostname your-domain.com
   ```

---

## 🔄 Update Process

**To deploy updates:**
1. Make code changes
2. Commit and push to `main` branch
3. GitHub Actions automatically deploys
4. App restarts with new version

**Manual restart:**
```bash
az webapp restart --name medical-referral-extractor --resource-group medical-referral-rg
```

---

## 📝 Summary

✅ **Docker container includes Tesseract** (no Document Intelligence needed)  
✅ **GitHub Actions automates deployment**  
✅ **Azure App Service manages infrastructure**  
✅ **Workflow file ready to use** (`.github/workflows/azure-deploy.yml`)

**Your deployment team can now:**
1. Set up Azure resources (one time)
2. Configure GitHub secrets (one time)
3. Push code to GitHub (deploys automatically)

---

## 🆘 Need Help?

**Check deployment logs:**
- GitHub Actions: Repository → Actions tab
- Azure Portal: App Service → Deployment Center
- Application logs: `az webapp log tail`

**Common commands:**
```bash
# View app status
az webapp show --name medical-referral-extractor --resource-group medical-referral-rg

# Download logs
az webapp log download --name medical-referral-extractor --resource-group medical-referral-rg

# SSH into container (for debugging)
az webapp ssh --name medical-referral-extractor --resource-group medical-referral-rg
```
