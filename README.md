📄 AI Fax Referral Extraction App
AI-powered system to extract structured medical referral data from PDFs, faxes, and text documents

This project is a complete AI document-processing platform that converts PDF/TXT medical referrals into clean structured JSON using OCR + LLM + FastAPI + React.

It includes:

🧠 AI LLM (Azure OpenAI / GPT-4o-mini) for structured extraction

📄 OCR pipeline using Tesseract & pdf2image

⚡ FastAPI backend

🎨 React + Tailwind frontend

🪵 Advanced logging system

🐳 Docker support

🚀 Features
✔ AI Extraction

Converts unstructured medical referral/fax documents into structured fields

Uses JSON schema validation

Supports Azure OpenAI deployments

✔ OCR Processing

Converts PDF → Image → Text

High-quality OCR (300 DPI)

Page-level structured output

✔ Frontend UI

React + Tailwind modern design

Fixed white navbar

Upload + Extract + History pages

Displays structured output beautifully

✔ Logging

Every run generates a timestamped log inside /backend/logs/.

✔ Production-ready

Modular FastAPI backend

Dockerfile included

GitHub-ready folder structure

📁 Project Structure
/Fax-Ref/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── ocr.py
│   │   ├── gpt_client.py
│   │   ├── config.py
│   │   ├── utils.py
│   │   ├── schemas.py
│   │   ├── json_schema.py
│   │   ├── log.py
│   │   └── __init__.py
│   ├── uploads/
│   ├── logs/
│   ├── testai.py
│   ├── requirements.txt
│   └── Dockerfile
│
└── client/
    ├── src/
    ├── public/
    ├── package.json
    └── tailwind.config.js

🛠 Tech Stack
Backend

Python 3.9+

FastAPI

Tesseract OCR

pdf2image

Azure OpenAI SDK

Pydantic

Python logging (per-run log files)

Frontend

React (Vite)

TailwindCSS

Lucide Icons

🔧 Backend Setup
1️⃣ Navigate to backend folder
cd backend

2️⃣ Create a virtual environment
python -m venv .venv

3️⃣ Activate it

Windows:

.venv\Scripts\activate

4️⃣ Install dependencies
pip install -r requirements.txt

🔐 Environment Variables (.env)

Create a .env file inside backend/:

AZURE_OPENAI_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2025-01-01-preview

MAX_PAGES=8
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe


If you don’t use Azure, we can switch to local LLMs later (LM Studio, Ollama, Docker models).

▶ Run Backend
uvicorn app.main:app --reload --port 8000

API Available at:

Swagger: http://localhost:8000/docs

Health check: http://localhost:8000/

🌐 Frontend Setup
1️⃣ Navigate to client folder
cd client

2️⃣ Install dependencies
npm install

3️⃣ Start development server
npm run dev


Frontend will run at:

👉 http://localhost:5173

🔄 End-to-End Flow

User uploads PDF/TXT

Backend receives file → saves → OCR → generates text

OCR output sent to Azure LLM

LLM structures the document using JSON Schema

Validated data returned to frontend

Log file saved at backend/logs/run_TIMESTAMP.log

🔍 Testing Azure OpenAI Connectivity

Run:

python testai.py


Outputs:

Endpoint

Deployment

Error logs

Connection issues (DNS failure, wrong endpoint, key invalid)

Logs also saved to:

backend/logs/testai_YYYY-MM-DD.log

🧪 API Documentation
POST /upload

Upload a PDF or TXT file.

Request:
multipart/form-data
file=<your-file>

Example Response:
{
  "job_id": "abc123",
  "extracted": {
    "patient_name": "...",
    "referral_reason": "...",
    ...
  },
  "raw_ocr": { ... }
}

🐳 Docker Support

Build backend:

cd backend
docker build -t fax-ref-backend .


Run:

docker run -p 8000:8000 fax-ref-backend

🪵 Logging System

Logs stored inside:

backend/logs/
   ├── run_2025-02-01_18-40-22.log
   ├── run_2025-02-01_18-45-10.log
   └── testai_2025-02-01.log


Each log includes:

OCR steps

Azure request details

Response or errors

Full traceback (DEBUG mode)

😕 Troubleshooting
❌ Azure DNS Error

Your endpoint must NOT include the resource group.

❌ Wrong:

https://aifaxreferralprojectrg.cognitiveservices.azure.com


✔ Correct:

https://aifaxreferralproject.cognitiveservices.azure.com

❌ OCR Not Working

Install Tesseract:

Windows: https://github.com/UB-Mannheim/tesseract/wiki

Update .env:

TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe

❌ React can't reach API

Enable CORS:

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

❌ "Client not pushed to GitHub"

Client folder was a Git repository itself → remove .git inside client.

cd client
rm -rf .git
cd ..
git add .
git commit -m "Added client"
git push

🧭 Future Enhancements

Add classification (is referral or not)

Add fine-tuned model for medical summaries

Add user authentication

Add cloud deployment (Azure App Service / ACA)

Add database to store extracted results

🤝 Contributing

Pull requests are welcome.
Please follow modular coding practices and include meaningful commit messages.

📄 License

MIT License
