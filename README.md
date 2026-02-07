# 🏥 Medical Referral Extractor

An AI-powered system that extracts structured medical referral data from PDFs, faxes, and text documents using **Azure OpenAI GPT-4** and a modern **React** frontend.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-18.0-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688)
![Python](https://img.shields.io/badge/python-3.11+-green)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

---

## ⭐ Key Features

- 🧠 **Azure OpenAI GPT-4o-mini** - Advanced language model for precise data extraction
- 📄 **Multi-format Support** - PDF, Images (JPG/PNG), TXT, DOCX
- �️ **OCR Processing** - robust text extraction for scanned documents
- ⚛️ **Modern React UI** - Responsive, user-friendly interface with Tailwind CSS
- 💾 **History Tracking** - (Coming Soon) Persistent history with Azure Blob Storage
- ⚡ **High Performance** - FastAPI backend for rapid processing
- 🐳 **Dockerized** - Easy deployment with multi-stage builds

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ (for frontend)
- **Python** 3.11+ (for backend)
- **Tesseract OCR** installed on your system
- **Azure OpenAI API Key**

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Fax Ref"
```

### 2. Configure Environment

Copy `.env.example` to `backend/.env` and update with your credentials:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

### 3. Run with Docker (Recommended)

```bash
# Build and start services
docker-compose up --build
```

Access the app at **http://localhost:8000**

### 4. Run Locally (Development)

**Backend (Terminal 1):**
```bash
cd backend
python -m venv venv
# Activate venv: .\venv\Scripts\activate (Windows) or source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend (Terminal 2):**
```bash
cd client
npm install
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

---

## 📁 Project Structure

```
Fax Ref/
├── client/                 # React Frontend
│   ├── public/
│   └── src/
│       ├── components/     # UI Components (HomePage, UploadPage, etc.)
│       └── services/       # API Integration
├── backend/                # FastAPI Backend
│   ├── app/
│   │   ├── main.py         # Entry point & API routes
│   │   ├── gpt_client.py   # Azure OpenAI integration
│   │   └── ...
│   └── requirements.txt
├── .github/                # GitHub Actions Workflows
├── Dockerfile              # Multi-stage production build
├── docker-compose.yaml     # Local development orchestration
└── README.md               # Project documentation
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check & supported formats |
| POST | `/upload` | Upload file for extraction |
| GET | `/history` | Fetch extraction history |
| GET | `/health` | System health status |

---

## 🔐 Security

- **Environment Variables**: API keys are managed via `.env` files (excluded from git).
- **File Validation**: Strict file type and size limits enforced.
- **CORS Config**: configured to allow trusted origins.

---

## 📄 License

Proprietary Software. Internal Use Only.
