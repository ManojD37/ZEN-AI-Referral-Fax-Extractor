# 🏥 AI Fax Referral Extraction App  
### **AI-powered system that extracts structured medical referral data from PDFs, faxes, and text documents**

![Banner](https://raw.githubusercontent.com/github/explore/main/topics/ai/ai.png)

---

## ⭐ Overview

This project is a complete **AI document-processing system** that converts medical fax referrals (PDF/TXT) into clean, structured JSON using:

- 🧠 **Azure OpenAI GPT-4o-mini** (LLM extraction)
- 📄 **Tesseract OCR + pdf2image** (PDF → text)
- ⚡ **FastAPI backend**
- 🎨 **React + Tailwind frontend**
- 🪵 **Advanced per-run logging**
- 🐳 **Docker support**
- 🗂 **Schema-validated structured output**

It is designed for clinical automation, referral triage systems, EMR integrations, and medical analytics pipelines.

---

# 📘 Table of Contents
- [⭐ Overview](#-overview)  
- [🚀 Features](#-features)  
- [📁 Project Structure](#-project-structure)  
- [🛠 Tech Stack](#-tech-stack)  
- [🔧 Backend Setup](#-backend-setup)  
- [🔐 Environment Variables](#-environment-variables)  
- [▶ Run Backend](#-run-backend)  
- [🌐 Frontend Setup](#-frontend-setup)  
- [🔄 End-to-End Flow](#-end-to-end-flow)  
- [🧪 Testing Azure Connectivity](#-testing-azure-connectivity)  
- [📡 API Documentation](#-api-documentation)  
- [🐳 Docker Support](#-docker-support)  
- [🪵 Logging System](#-logging-system)  
- [🛠 Git & GitHub Workflow](#-git--github-workflow)  
- [❗ Troubleshooting](#-troubleshooting)  
- [🧭 Roadmap](#-roadmap)  
- [🤝 Contributing](#-contributing)  
- [📄 License](#-license)  

---

# 🚀 Features

### ✔ AI Extraction  
- Converts unstructured medical faxes into structured referral data.  
- Uses strict JSONSchema validation.

### ✔ OCR Pipeline  
- PDF → Image → Text via Tesseract  
- 300 DPI conversion for high accuracy  
- Page-level structured response

### ✔ Modern UI  
- React + Tailwind  
- Clean design  
- Upload → Extract → View JSON → History

### ✔ Production-Grade Logging  
- Every request generates a log file:
