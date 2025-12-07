# app/json_schema.py
# JSON Schema used to instruct the LLM. Keep in sync with pydantic models above.

JSON_SCHEMA = {
  "type": "object",
  "properties": {
    "document_meta": {
      "type": "object",
      "properties": {
        "title": {"type": ["string", "null"]},
        "date": {"type": ["string", "null"], "format": "date"},
        "pages": {"type": ["integer", "null"]}
      },
      "required": ["title"]
    },
    "referral": {
      "type": "object",
      "properties": {
        "referral_to": {"type": ["string", "null"]},
        "referral_focal_point": {"type": ["string", "null"]},
        "referral_phone": {"type": ["string", "null"]},
        "referral_location": {"type": ["string", "null"]},
        "referral_email": {"type": ["string", "null"]},
        "referring_from": {"type": ["string", "null"]},
        "referring_focal_point": {"type": ["string", "null"]},
        "referring_phone": {"type": ["string", "null"]},
        "referring_location": {"type": ["string", "null"]},
        "referring_email": {"type": ["string", "null"]}
      }
    },
    "patient": {
      "type": "object",
      "properties": {
        "full_name": {"type": ["string", "null"]},
        "phone": {"type": ["string", "null"]},
        "date_of_birth": {"type": ["string", "null"], "format": "date"},
        "gender": {"type": ["string", "null"]},
        "address": {"type": ["string", "null"]},
        "accompanied_by_care_provider": {"type": ["boolean", "null"]}
      }
    },
    "diagnoses": {
      "type": "object",
      "properties": {
        "primary_diagnoses": {"type": "array", "items": {"type": "string"}},
        "other_diagnoses": {"type": "array", "items": {"type": "string"}}
      }
    },
    "treatments": {"type": "array", "items": {"type": "string"}},
    "reason_for_referral": {"type": ["string", "null"]},
    "transportation_needs": {"type": "array", "items": {"type": "string"}},
    "follow_up_requirements": {"type": "array", "items": {"type": "string"}},
    "functional_status": {
      "type": "object",
      "properties": {
        "mobility": {"type": ["string", "null"]},
        "precautions": {"type": ["string", "null"]},
        "self_care": {"type": ["string", "null"]},
        "cognitive_impairment": {"type": ["string", "null"]},
        "assistive_devices_provided": {"type": "array", "items": {"type": "string"}},
        "assistive_devices_required": {"type": "array", "items": {"type": "string"}}
      }
    },
    "compiled_by": {"type": ["string", "null"]},
    "signature": {"type": ["string", "null"]},
    "position": {"type": ["string", "null"]},
    "file_number": {"type": ["string", "null"]}
  },
  "required": ["document_meta", "referral", "patient"]
}
