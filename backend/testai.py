# test_azure.py
import os
import traceback
from dotenv import load_dotenv
from openai import AzureOpenAI
from app.log import logger   # <-- your logging module

load_dotenv()

logger.info("=== Starting Azure OpenAI connectivity test ===")

endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
api_key  = os.getenv("AZURE_OPENAI_API_KEY")
deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

# Log the environment values (masked key)
logger.info(f"Endpoint: {endpoint}")
logger.info(f"Deployment: {deployment}")
logger.info(f"API Version: {api_version}")
logger.info(f"API Key present: {bool(api_key)} (masked)")

if not endpoint:
    logger.error("ERROR: AZURE_OPENAI_ENDPOINT missing in .env")
    raise SystemExit("Missing AZURE_OPENAI_ENDPOINT")

if not api_key:
    logger.error("ERROR: AZURE_OPENAI_API_KEY missing in .env")
    raise SystemExit("Missing AZURE_OPENAI_API_KEY")

# Initialize Azure client
try:
    logger.info("Initializing AzureOpenAI client...")
    client = AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version,
    )
except Exception as e:
    logger.exception(f"Client initialization failed: {e}")
    raise

# Perform model call
logger.info(f"Sending test chat completion to deployment '{deployment}'...")

try:
    resp = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "I am going to Paris, what should I see?"}
        ],
        max_tokens=100,
        temperature=0.7,
    )
    logger.info("Azure API call succeeded!")

    # Robust message extraction
    choice = resp.choices[0]
    msg = getattr(choice, "message", None)
    content = getattr(msg, "content", None) if msg else None

    if content is None:
        try:
            content = choice.get("message", {}).get("content")
        except Exception:
            logger.warning("Message extraction via dict fallback failed.")

    logger.info("Model responded successfully.")
    print("\n=== MODEL RESPONSE ===\n")
    print(content)
    print("\n======================\n")

    # Optional: raw response debug log
    logger.debug(f"Raw response object: {resp}")

except Exception as e:
    logger.error("Azure OpenAI request failed.")
    logger.error(str(e))
    logger.debug(traceback.format_exc())
    raise

logger.info("=== Azure OpenAI connectivity test completed ===")
