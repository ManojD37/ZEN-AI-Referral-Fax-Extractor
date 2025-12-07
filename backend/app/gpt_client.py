# app/gpt_client.py (updated version)
import json
import re
from typing import Any, Dict
from .config import (
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT,
    AZURE_OPENAI_API_VERSION,
)
from .json_schema import JSON_SCHEMA

SKIP_MODE = AZURE_OPENAI_API_KEY.lower() == "skip"

if SKIP_MODE:
    def extract_referral_from_text(raw_text: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "document_meta": {"title": "Unknown (stub)", "date": None, "pages": 1},
            "referral": {},
            "patient": {},
            "diagnoses": {"primary_diagnoses": [], "other_diagnoses": []},
            "treatments": [],
            "reason_for_referral": None,
            "transportation_needs": [],
            "follow_up_requirements": [],
            "functional_status": {},
            "compiled_by": None,
            "signature": None,
            "position": None,
            "file_number": None
        }
else:
    try:
        from openai import AzureOpenAI
        from openai import OpenAIError
    except Exception as e:
        raise RuntimeError("openai package required") from e

    client = AzureOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
    )

    def call_azure(system_prompt: str, user_prompt: str, max_tokens: int = 2000, temperature: float = 0.0) -> str:
        """Call Azure OpenAI with system and user prompts."""
        try:
            resp = client.chat.completions.create(
                model=AZURE_OPENAI_DEPLOYMENT,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except OpenAIError as e:
            raise RuntimeError(f"Azure OpenAI request failed: {e}")
        
        try:
            content = resp.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"Unexpected Azure response: {e}")
        
        return content

    def parse_json_output(raw: str) -> Any:
        """Extract and parse JSON from LLM response."""
        raw = raw.strip()
        
        # Try direct parsing
        try:
            return json.loads(raw)
        except Exception:
            pass
        
        # Try extracting JSON object
        m = re.search(r"\{(?:.|\n)*\}", raw)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        
        # Try extracting JSON array
        m = re.search(r"\[(?:.|\n)*\]", raw)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        
        raise ValueError(f"Could not parse JSON from model output. Raw: {raw[:500]}")

    def extract_referral_from_text(raw_text: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract medical referral information from raw text using LLM.
        
        This is the main function that:
        1. Takes ANY text (from PDF, image, Word, etc.)
        2. Asks LLM to intelligently extract medical referral data
        3. Returns structured JSON matching the schema
        """
        
        system_prompt = """You are a medical document analysis expert specialized in extracting referral information.

Your task is to analyze medical documents and extract structured referral information.

IMPORTANT RULES:
1. Return ONLY valid JSON matching the provided schema
2. Extract information ONLY if it's clearly present in the document
3. Use null for missing scalar values
4. Use [] for missing arrays
5. For document_meta.title: If no clear title, use "Medical Referral Form" or best guess
6. Focus on REFERRAL-SPECIFIC information (referring doctor to another doctor/facility)
7. If the document is NOT a medical referral, still extract any relevant medical information present

Medical referral documents typically contain:
- Referral source (referring facility/doctor)
- Referral destination (where patient is being referred to)
- Patient information
- Reason for referral
- Diagnoses and treatments
- Contact information for both facilities
"""

        user_prompt = f"""Analyze this document and extract medical referral information according to the schema below.

SCHEMA:
{json.dumps(schema, indent=2)}

DOCUMENT TEXT:
{raw_text[:8000]}  # Limit to avoid token overflow

Return ONLY the JSON output, no explanations."""

        # Call LLM
        raw_response = call_azure(system_prompt, user_prompt, max_tokens=2000, temperature=0.0)
        
        # Parse JSON
        parsed = parse_json_output(raw_response)
        
        return parsed


# Keep backward compatibility with old function name
def structure_document_with_llm(ocr_doc: Dict[str, Any], schema: Dict[str, Any], instructions: str) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility.
    Converts OCR document to text and calls extract_referral_from_text.
    """
    # Convert OCR structure to plain text
    text_parts = []
    for page in ocr_doc.get("pages", []):
        page_num = page.get("page_number", "?")
        text_parts.append(f"--- Page {page_num} ---")
        for block in page.get("blocks", []):
            for line in block.get("lines", []):
                text_parts.append(line.get("text", ""))
    
    raw_text = "\n".join(text_parts)
    return extract_referral_from_text(raw_text, schema)