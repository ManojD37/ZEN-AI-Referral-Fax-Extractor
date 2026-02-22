# app/classifier.py
"""
Enhanced Medical Referral Document Classifier.
Uses keyword matching, pattern recognition, and weighted scoring for high accuracy classification.
"""
import re
from typing import Dict, List
from app.log import logger


class ReferralClassifier:
    """
    Classifies documents to determine if they are medical referrals.
    Uses multi-tier keyword matching and pattern recognition with weighted scoring.
    """
    
    # Tier 1: Definitive referral indicators (highest weight)
    DEFINITIVE_KEYWORDS = [
        'referral', 'referral form', 'patient referral', 'medical referral',
        'referral letter', 'referral request', 'refer this patient',
        'referring physician', 'referred by', 'referred to',
        'consultation request', 'transfer of care', 'request for consultation'
    ]
    
    # Tier 2: Strong referral indicators
    STRONG_KEYWORDS = [
        'referring', 'refer to', 'refer patient', 'consult request',
        'specialist referral', 'outpatient referral', 'inpatient referral',
        'please see this patient', 'please evaluate', 'requesting evaluation',
        'for your opinion', 'for further management', 'for consultation'
    ]
    
    # Tier 3: Medical context keywords
    MEDICAL_KEYWORDS = [
        'patient', 'diagnosis', 'diagnoses', 'treatment', 'medication',
        'medical history', 'symptoms', 'condition', 'prognosis',
        'physician', 'doctor', 'dr.', 'md', 'm.d.', 'clinic', 'hospital',
        'healthcare', 'medical center', 'specialist', 'primary care',
        'insurance', 'icd-10', 'cpt', 'npi', 'dea'
    ]
    
    # Tier 4: Document structure keywords
    STRUCTURE_KEYWORDS = [
        'patient name', 'date of birth', 'dob', 'patient id', 'mrn',
        'phone', 'fax', 'address', 'contact', 'appointment',
        'file number', 'medical record', 'chart number',
        'signature', 'signed by', 'authorized by', 'date signed'
    ]
    
    # Regex patterns for referral documents
    REFERRAL_PATTERNS = [
        r'referr(?:al|ing|ed)\s+(?:to|from|by)',
        r'(?:to|from):\s*(?:dr\.?|doctor|clinic|hospital|specialist)',
        r'reason\s+(?:for\s+)?referral',
        r'referring\s+(?:physician|doctor|provider|facility)',
        r'consultation\s+request(?:ed)?',
        r'please\s+(?:see|evaluate|consult)',
        r'patient\s+(?:is\s+)?referred',
        r'(?:urgent|routine|emergent)\s+referral',
        r'referral\s+(?:date|number|id)',
        r'(?:requesting|receiving)\s+(?:physician|provider|facility)'
    ]
    
    # Negative patterns (reduce score if present)
    NEGATIVE_PATTERNS = [
        r'invoice|billing|payment|amount due|total due',
        r'advertisement|promotional|subscribe|unsubscribe',
        r'newsletter|marketing|sale|discount|offer'
    ]
    
    def __init__(self, threshold_definitive: int = 1, threshold_score: int = 15):
        """
        Initialize classifier with thresholds.
        
        Args:
            threshold_definitive: Minimum definitive keywords for auto-classification
            threshold_score: Minimum total score required for classification
        """
        self.threshold_definitive = threshold_definitive
        self.threshold_score = threshold_score
    
    def classify(self, text: str) -> Dict:
        """
        Classify if the text is a medical referral document.
        
        Scoring:
        - Definitive keywords: 15 points each
        - Strong keywords: 8 points each
        - Pattern matches: 6 points each
        - Medical keywords: 2 points each
        - Structure keywords: 1 point each
        - Negative patterns: -10 points each
        """
        if not text or len(text.strip()) < 50:
            return {
                'is_referral': False,
                'confidence': 0.0,
                'score': 0,
                'details': {},
                'reason': 'Insufficient text content for classification'
            }
        
        text_lower = text.lower()
        
        # Count keyword matches by tier
        definitive_count = self._count_keywords(text_lower, self.DEFINITIVE_KEYWORDS)
        strong_count = self._count_keywords(text_lower, self.STRONG_KEYWORDS)
        medical_count = self._count_keywords(text_lower, self.MEDICAL_KEYWORDS)
        structure_count = self._count_keywords(text_lower, self.STRUCTURE_KEYWORDS)
        pattern_count = self._count_patterns(text_lower, self.REFERRAL_PATTERNS)
        negative_count = self._count_patterns(text_lower, self.NEGATIVE_PATTERNS)
        
        # Calculate weighted score
        score = (
            definitive_count * 15 +
            strong_count * 8 +
            pattern_count * 6 +
            medical_count * 2 +
            structure_count * 1 -
            negative_count * 10
        )
        
        # Ensure non-negative score
        score = max(0, score)
        
        # Determine if it's a referral
        # Auto-classify if definitive keyword found OR high enough score with medical context
        is_referral = (
            (definitive_count >= self.threshold_definitive) or
            (score >= self.threshold_score and medical_count >= 3) or
            (strong_count >= 2 and medical_count >= 2)
        )
        
        # Calculate confidence (0-1 scale)
        # Max realistic score is around 60, but high confidence at 30+
        if is_referral:
            if definitive_count >= 2:
                confidence = min(0.95, 0.7 + (score / 100))
            else:
                confidence = min(0.9, score / 50.0)
        else:
            confidence = max(0.0, min(0.4, score / 50.0))
        
        # Generate reason
        reason = self._generate_reason(
            is_referral, definitive_count, strong_count, 
            medical_count, pattern_count, negative_count, score
        )
        
        details = {
            'definitive_keywords': definitive_count,
            'strong_keywords': strong_count,
            'medical_keywords': medical_count,
            'structure_keywords': structure_count,
            'pattern_matches': pattern_count,
            'negative_patterns': negative_count,
            'total_score': score
        }
        
        logger.info(
            f"Classification: is_referral={is_referral}, "
            f"confidence={confidence:.2f}, score={score}, "
            f"definitive={definitive_count}, strong={strong_count}"
        )
        
        return {
            'is_referral': is_referral,
            'confidence': round(confidence, 2),
            'score': score,
            'details': details,
            'reason': reason
        }
    
    def _count_keywords(self, text: str, keywords: List[str]) -> int:
        """Count unique keyword matches in text (not total occurrences)."""
        count = 0
        for keyword in keywords:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
            if re.search(pattern, text):
                count += 1
        return count
    
    def _count_patterns(self, text: str, patterns: List[str]) -> int:
        """Count pattern matches in text."""
        count = 0
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                count += 1
        return count
    
    def _generate_reason(
        self, is_referral: bool, definitive: int, strong: int,
        medical: int, patterns: int, negative: int, score: int
    ) -> str:
        """Generate human-readable classification reason."""
        if is_referral:
            if definitive >= 2:
                return f"High confidence: Found {definitive} definitive referral terms (e.g., 'referral', 'consultation request')"
            elif definitive >= 1:
                return f"Document identified as referral: Contains referral terminology with {medical} medical terms"
            elif strong >= 2:
                return f"Likely referral: Found {strong} referral indicators with medical context"
            else:
                return f"Classified as referral based on combined indicators (score: {score})"
        else:
            if negative > 0:
                return f"Non-referral: Contains {negative} negative indicators (billing/marketing content)"
            elif medical < 3:
                return "Non-referral: Lacks sufficient medical terminology"
            elif definitive == 0 and strong == 0:
                return "Non-referral: No referral-specific language detected"
            else:
                return f"Non-referral: Score {score} below classification threshold ({self.threshold_score})"


# Module-level singleton — avoids re-creating the classifier on every API call
_classifier_instance = ReferralClassifier()


def classify_document(text: str) -> Dict:
    """
    Convenience function to classify a document.
    Uses a module-level singleton to avoid repeated initialization.
    
    Args:
        text: Extracted text from document
        
    Returns:
        Classification result dictionary
    """
    return _classifier_instance.classify(text)