# test_http.py — direct HTTP test to Azure OpenAI (no SDK)
import os, json, traceback
import requests
from dotenv import load_dotenv

load_dotenv()

endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
api_key = os.getenv("AZURE_OPENAI_API_KEY")
deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
api_version = os.getenv("AZURE_OPENAI_API_VERSION")   

if not (endpoint and api_key and deployment):
    print("Missing env vars. Check .env")
    raise SystemExit(2)

# build full URL: /openai/deployments/{deployment}/chat/completions?api-version=...
url = endpoint.rstrip("/") + f"/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
# url="https://aifaxreferralprojectrg.cognitiveservices.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2025-01-01-preview"

payload = {
  "messages": [{"role":"user","content":"Say hi in one short sentence."}],
  "max_tokens": 20
}

headers = {
    "api-key": api_key,
    "Content-Type": "application/json"
}

print("POST ->", url)
try:
    r = requests.post(url, headers=headers, json=payload, timeout=15)
    print("HTTP status:", r.status_code)
    # Print full response body (masked keys if needed)
    print("Response body:", r.text)
except requests.exceptions.SSLError as e:
    print("SSL error:", e)
    traceback.print_exc()
except requests.exceptions.ProxyError as e:
    print("Proxy error:", e)
    traceback.print_exc()
except Exception as e:
    print("Other connection error:", type(e), e)
    traceback.print_exc()
