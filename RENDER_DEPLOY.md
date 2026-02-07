# Deploying to Render (Free Tier)

Render is the recommended free deployment option because it supports **Docker**, which is required for Tesseract OCR. Vercel's free tier (Serverless) makes installing system dependencies like Tesseract very difficult.

## 🚀 Quick Deployment Guide

### Option 1: Blueprints (Automated)

1. **Sign up**: Go to [dashboard.render.com](https://dashboard.render.com) and sign up/login.
2. **Connect GitHub**: Connect your GitHub account.
3. **New Blueprint**: 
   - Click **New +** -> **Blueprint**.
   - Select your repository (`ZEN-AI-Referral-Fax-Extractor`).
   - Click **Connect**.
4. **Configure Secrets**:
   - Render will detect the `render.yaml` file.
   - It will prompt you to enter your Environment Variables:
     - `AZURE_OPENAI_API_KEY`
     - `AZURE_OPENAI_ENDPOINT`
     - `AZURE_OPENAI_DEPLOYMENT`
     - `AZURE_OPENAI_API_VERSION`
     - `AZURE_STORAGE_CONNECTION_STRING` (Optional)
     - `AZURE_BLOB_CONTAINER` (Optional)
5. **Deploy**: Click **Apply**. Render will build the Docker container and deploy it.

### Option 2: Manual Setup

1. **New Web Service**: Click **New +** -> **Web Service**.
2. **Source**: Select "Build and deploy from a Git repository".
3. **Connect**: Choose your repository.
4. **Settings**:
   - **Name**: `medical-referral-extractor`
   - **Region**: Closest to you
   - **Branch**: `production`
   - **Runtime**: **Docker** (Important!)
5. **Environment Variables**:
   - Scroll down to "Environment Variables" and add your Azure keys.
6. **Create Web Service**: Click the button at the bottom.

---

## ⚠️ Free Tier Limitations (Render)
- **Spin Down**: The service will go to sleep after 15 minutes of inactivity. The first request after sleep will take ~30-60 seconds (cold start).
- **RAM**: 512 MB. This should be enough for basic OCR, but heavy PDFs might be slow.
- **Build Minutes**: 500 free minutes/month.

## Why not Vercel?
Vercel is great for React, but our backend uses **FastAPI + Tesseract OCR**.
- Tesseract requires system-level installation (`apt-get install tesseract-ocr`).
- Vercel Serverless functions don't persist system installations easily.
- Render's Docker runtime allows us to install whatever we want (configured in our `Dockerfile`).
