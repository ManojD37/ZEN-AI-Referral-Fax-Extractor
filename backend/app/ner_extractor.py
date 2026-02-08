# app/ner_extractor.py
"""
Named Entity Recognition (NER) based extraction using spaCy and regex patterns.
Provides structured data extraction from raw OCR text.
"""
import re
from typing import Dict, List, Optional, Any
from datetime import datetime

from app.log import logger

# Try to import spaCy
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logger.warning("spaCy not installed. NER extraction will use regex fallback.")

# Load spaCy model
_nlp = None

def get_nlp():
    """Lazy load spaCy model."""
    global _nlp
    if _nlp is None and SPACY_AVAILABLE:
        try:
            _nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model loaded successfully")
        except OSError:
            logger.warning("spaCy model 'en_core_web_sm' not found. Using regex fallback.")
    return _nlp


# Regex patterns for medical document extraction
PATTERNS = {
    # Date patterns - multiple formats
    'date': [
        r'(?:Date|DATE):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'(?:Date\s+of\s+birth|DOB|dob):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',
        r'\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b',
        r'\b(\d{1,2}\.\d{1,2}\.\d{4})\b',
    ],
    # Phone patterns - various formats
    'phone': [
        r'(?:Phone|PHONE|phone):\s*(\+?\d{1,3}[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4})',
        r'\+\d{1,3}[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}',
    ],
    # Email pattern
    'email': [
        r'(?:Email|EMAIL|email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
    ],
    # File/ID numbers - must be at end or clearly labeled
    'file_number': [
        r'(?:FILE\s+NUMBER|File\s+Number|file\s+number):\s*(\d+)',
        r'(?:FILE\s+NUMBER|File\s+Number|file\s+number):\s*([A-Z0-9-]+)',
    ],
    # Patient name - MUST be after "Full Name:" label specifically
    'patient_name': [
        r'(?:Full\s+Name|Full\s+name|FULL\s+NAME):\s*([A-Z][a-z]+\s+[A-Z][a-z]+)',
    ],
    # Referral To - facility (stop at newline or "Focal")
    'referral_to_facility': [
        r'(?:Referral\s+to|REFERRAL\s+TO):\s*([A-Za-z\s]+(?:Medical\s+Center|Hospital|Clinic|Facility)[^\n]*?)(?=\n)',
    ],
    # Referral To - focal point (person name after "Focal point:")
    'referral_to_focal': [
        r'(?:Referral\s+to|REFERRAL\s+TO)[^\n]*\n\s*(?:Focal\s+point|FOCAL\s+POINT):\s*([A-Z][a-z]+\s+[A-Z][a-z]+)',
    ],
    # Referral To - phone (first phone after "Referral to")
    'referral_to_phone': [
        r'(?:Referral\s+to|REFERRAL\s+TO)[^\n]*\n[^\n]*(?:Phone|PHONE):\s*(\+?\d{1,3}[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4})',
    ],
    # Referral To - email
    'referral_to_email': [
        r'(?:Referral\s+to|REFERRAL\s+TO)[^\n]*\n[^\n]*\n[^\n]*(?:Email|EMAIL):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
    ],
    # Referring From - facility
    'referring_from_facility': [
        r'(?:Referring\s+from|REFERRING\s+FROM):\s*([A-Za-z\s]+(?:Medical\s+Center|Hospital|Clinic|Facility)[^\n]*?)(?=\n)',
    ],
    # Referring From - focal point
    'referring_from_focal': [
        r'(?:Referring\s+from|REFERRING\s+FROM)[^\n]*\n\s*(?:Focal\s+point|FOCAL\s+POINT):\s*([A-Z][a-z]+\s+[A-Z][a-z]+)',
    ],
    # Referring From - phone
    'referring_from_phone': [
        r'(?:Referring\s+from|REFERRING\s+FROM)[^\n]*\n[^\n]*(?:Phone|PHONE):\s*(\+?\d{1,3}[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4})',
    ],
    # Referring From - email
    'referring_from_email': [
        r'(?:Referring\s+from|REFERRING\s+FROM)[^\n]*\n[^\n]*\n[^\n]*(?:Email|EMAIL):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
    ],
    # Patient phone - specifically after "Full Name:" section
    'patient_phone': [
        r'(?:Full\s+Name|FULL\s+NAME):[^\n]*(?:Phone|PHONE):\s*(\+?\d{1,3}[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4})',
    ],
    # Diagnosis patterns - numbered list
    'primary_diagnosis': [
        r'(?:Primary\s+Diagnos(?:e|is|es)|PRIMARY\s+DIAGNOS(?:E|IS|ES))[^\n]*\n\s*\d+\.\s*([^\n]+)',
    ],
    'other_diagnosis': [
        r'(?:Other\s+Diagnos(?:e|is|es)|OTHER\s+DIAGNOS(?:E|IS|ES))[^\n]*\n\s*[-•]\s*([^\n]+)',
    ],
    # Reason for referral
    'reason': [
        r'(?:Reason\s+for\s+referral|REASON\s+FOR\s+REFERRAL):\s*\n?\s*([A-Za-z]+)',
    ],
    # Gender
    'gender': [
        r'(?:Gender|GENDER):\s*(Male|Female|male|female|M|F)',
    ],
    # Address - after "Address" label
    'address': [
        r'(?:Address\s+of\s+discharge\s+destination|Address|ADDRESS):\s*([^\n]+)',
    ],
    # Compiled by - person name
    'compiled_by': [
        r'(?:Compiled\s+by|COMPILED\s+BY):\s*([A-Z][a-z]+\s+[A-Z][a-z]+)',
    ],
    # Position
    'position': [
        r'(?:Position|POSITION):\s*([A-Za-z\s]+?)(?=\n|$)',
    ],
    # Treatments - bullet points with Treatment letter
    'treatments': [
        r'[•\-]\s*(Treatment\s+[A-Z](?:\s*\([^)]+\))?)',
    ],
}



def extract_with_regex(text: str, pattern_key: str) -> List[str]:
    """Extract values using regex patterns."""
    results = []
    patterns = PATTERNS.get(pattern_key, [])
    
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        results.extend(matches)
    
    # Clean and deduplicate
    cleaned = []
    for r in results:
        if isinstance(r, tuple):
            r = r[0]
        r = r.strip()
        if r and r not in cleaned:
            cleaned.append(r)
    
    return cleaned


def extract_entities_spacy(text: str) -> Dict[str, List[str]]:
    """Extract named entities using spaCy."""
    nlp = get_nlp()
    if nlp is None:
        return {}
    
    doc = nlp(text[:100000])  # Limit to prevent memory issues
    
    entities = {
        'PERSON': [],
        'ORG': [],
        'DATE': [],
        'GPE': [],  # Geopolitical entities (locations)
    }
    
    for ent in doc.ents:
        if ent.label_ in entities:
            entities[ent.label_].append(ent.text)
    
    return entities


def extract_structured_data(raw_text: str) -> Dict[str, Any]:
    """
    Extract structured referral data from raw OCR text.
    Returns data in the same schema as GPT extraction.
    """
    text = raw_text.strip()
    
    if not text:
        return create_empty_result()
    
    # Get spaCy entities
    spacy_entities = extract_entities_spacy(text)
    
    # Extract using patterns
    dates = extract_with_regex(text, 'date')
    phones = extract_with_regex(text, 'phone')
    emails = extract_with_regex(text, 'email')
    file_numbers = extract_with_regex(text, 'file_number')
    patient_names = extract_with_regex(text, 'patient_name')
    
    # Referral To fields
    referral_to_facility = extract_with_regex(text, 'referral_to_facility')
    referral_to_focal = extract_with_regex(text, 'referral_to_focal')
    referral_to_phone = extract_with_regex(text, 'referral_to_phone')
    referral_to_email = extract_with_regex(text, 'referral_to_email')
    
    # Referring From fields
    referring_from_facility = extract_with_regex(text, 'referring_from_facility')
    referring_from_focal = extract_with_regex(text, 'referring_from_focal')
    referring_from_phone = extract_with_regex(text, 'referring_from_phone')
    referring_from_email = extract_with_regex(text, 'referring_from_email')
    
    # Patient specific
    patient_phone = extract_with_regex(text, 'patient_phone')
    
    # Other fields
    primary_diagnoses = extract_with_regex(text, 'primary_diagnosis')
    other_diagnoses = extract_with_regex(text, 'other_diagnosis')
    reasons = extract_with_regex(text, 'reason')
    genders = extract_with_regex(text, 'gender')
    addresses = extract_with_regex(text, 'address')
    compiled_by = extract_with_regex(text, 'compiled_by')
    positions = extract_with_regex(text, 'position')
    treatments = extract_with_regex(text, 'treatments')
    
    # Use spaCy for additional person names if needed
    if not patient_names and spacy_entities.get('PERSON'):
        patient_names = spacy_entities['PERSON'][:1]
    
    # Use spaCy organizations for facilities if regex didn't find them
    orgs = spacy_entities.get('ORG', [])
    
    # Build structured result
    result = {
        "patient": {
            "full_name": patient_names[0].strip() if patient_names else None,
            "date_of_birth": parse_date(dates[1]) if len(dates) > 1 else None,
            "gender": normalize_gender(genders[0]) if genders else None,
            "phone": patient_phone[0].strip() if patient_phone else None,
            "address": addresses[0].strip() if addresses else None,
        },
        "referral": {
            "referral_to": referral_to_facility[0].strip() if referral_to_facility else (orgs[0] if orgs else None),
            "referral_focal_point": referral_to_focal[0].strip() if referral_to_focal else None,
            "referral_phone": referral_to_phone[0].strip() if referral_to_phone else None,
            "referral_email": referral_to_email[0].strip() if referral_to_email else None,
            "referring_from": referring_from_facility[0].strip() if referring_from_facility else (orgs[1] if len(orgs) > 1 else None),
            "referring_focal_point": referring_from_focal[0].strip() if referring_from_focal else None,
            "referring_phone": referring_from_phone[0].strip() if referring_from_phone else None,
            "referring_email": referring_from_email[0].strip() if referring_from_email else None,
        },
        "diagnoses": {
            "primary_diagnoses": primary_diagnoses if primary_diagnoses else [],
            "other_diagnoses": other_diagnoses if other_diagnoses else [],
        },
        "document_meta": {
            "title": extract_title(text),
            "date": parse_date(dates[0]) if dates else None,
        },
        "treatments": treatments if treatments else [],
        "reason_for_referral": reasons[0].strip() if reasons else None,
        "compiled_by": compiled_by[0].strip() if compiled_by else None,
        "position": positions[0].strip() if positions else None,
        "signature": None,
        "file_number": file_numbers[0] if file_numbers else None,
    }
    
    return result




def create_empty_result() -> Dict[str, Any]:
    """Create empty extraction result."""
    return {
        "patient": {
            "full_name": None,
            "date_of_birth": None,
            "gender": None,
            "phone": None,
            "address": None,
        },
        "referral": {
            "referral_to": None,
            "referral_focal_point": None,
            "referral_phone": None,
            "referral_email": None,
            "referring_from": None,
            "referring_focal_point": None,
            "referring_phone": None,
            "referring_email": None,
        },
        "diagnoses": {
            "primary_diagnoses": [],
            "other_diagnoses": [],
        },
        "document_meta": {"title": None, "date": None},
        "treatments": [],
        "reason_for_referral": None,
        "compiled_by": None,
        "position": None,
        "signature": None,
        "file_number": None,
    }


def parse_date(date_str: Optional[str]) -> Optional[str]:
    """Try to parse and normalize a date string."""
    if not date_str:
        return None
    
    # Common date formats
    formats = [
        '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d',
        '%m-%d-%Y', '%d-%m-%Y',
        '%B %d, %Y', '%b %d, %Y',
        '%m/%d/%y', '%d/%m/%y',
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    return date_str


def normalize_gender(gender: Optional[str]) -> Optional[str]:
    """Normalize gender string."""
    if not gender:
        return None
    
    g = gender.strip().lower()
    if g in ['m', 'male']:
        return 'Male'
    elif g in ['f', 'female']:
        return 'Female'
    return gender


def extract_title(text: str) -> Optional[str]:
    """Extract document title from first few lines."""
    lines = text.strip().split('\n')[:5]
    for line in lines:
        line = line.strip()
        if len(line) > 10 and len(line) < 100:
            # Likely a title
            if any(kw in line.lower() for kw in ['referral', 'form', 'patient', 'medical']):
                return line
    return None
