# app/classifier.py
import re
from typing import Dict, List, Tuple
from app.log import logger

class ReferralClassifier:
    """
    Classifies documents to determine if they are medical referrals.
    Uses keyword matching and pattern recognition on extracted text.
    """
    
    # Keywords that strongly indicate a referral document
    STRONG_KEYWORDS = [
        'referral', 'referring', 'referred to', 'refer to',
        'transfer of care', 'consultation request',
        'medical referral', 'patient referral'
    ]
    
    # Medical context keywords
    MEDICAL_KEYWORDS = [
        'patient', 'diagnosis', 'diagnoses', 'treatment',
        'medical history', 'symptoms', 'condition',
        'physician', 'doctor', 'dr.', 'md', 'clinic',
        'hospital', 'healthcare', 'medical center'
    ]
    
    # Contact/administrative keywords
    ADMIN_KEYWORDS = [
        'phone', 'fax', 'email', 'address',
        'contact', 'appointment', 'date of birth',
        'patient id', 'file number', 'medical record'
    ]
    
    # Structural patterns
    REFERRAL_PATTERNS = [
        r'referr(?:al|ing|ed)\s+(?:to|from)',
        r'to:\s*(?:dr\.|doctor|clinic|hospital)',
        r'from:\s*(?:dr\.|doctor|clinic|hospital)',
        r'reason\s+for\s+referral',
        r'referring\s+(?:physician|doctor)',
        r'consultation\s+request',
    ]
    
    def __init__(self, threshold_strong: int = 1, threshold_total: int = 10):
        """
        Initialize classifier with thresholds.
        
        Args:
            threshold_strong: Minimum strong keywords required (default: 1)
            threshold_total: Minimum total keyword score required (default: 10)
        """
        self.threshold_strong = threshold_strong
        self.threshold_total = threshold_total
    
    def classify(self, text: str) -> Dict:
        """
        Classify if the text is a medical referral document.
        
        Args:
            text: Extracted text from document
            
        Returns:
            Dict with classification results including:
                - is_referral: bool
                - confidence: float (0-1)
                - score: int
                - details: dict with keyword counts
                - reason: str explaining the classification
        """
        if not text or len(text.strip()) < 50:
            return {
                'is_referral': False,
                'confidence': 0.0,
                'score': 0,
                'details': {},
                'reason': 'Insufficient text content'
            }
        
        text_lower = text.lower()
        
        # Count keyword matches
        strong_count = self._count_keywords(text_lower, self.STRONG_KEYWORDS)
        medical_count = self._count_keywords(text_lower, self.MEDICAL_KEYWORDS)
        admin_count = self._count_keywords(text_lower, self.ADMIN_KEYWORDS)
        pattern_count = self._count_patterns(text_lower, self.REFERRAL_PATTERNS)
        
        # Calculate scores
        # Strong keywords are worth 10 points each
        # Pattern matches are worth 8 points each
        # Medical keywords are worth 2 points each
        # Admin keywords are worth 1 point each
        score = (
            strong_count * 10 +
            pattern_count * 8 +
            medical_count * 2 +
            admin_count * 1
        )
        
        # Determine if it's a referral
        is_referral = (
            strong_count >= self.threshold_strong and 
            score >= self.threshold_total
        )
        
        # Calculate confidence (0-1 scale)
        # Max realistic score is around 50, normalize to that
        confidence = min(score / 50.0, 1.0) if is_referral else max(0.0, score / 50.0)
        
        # Generate reason
        if is_referral:
            reason = f"Document contains {strong_count} strong referral indicators and meets classification thresholds"
        elif strong_count > 0:
            reason = f"Document has some referral keywords but insufficient overall score ({score}/{self.threshold_total})"
        elif medical_count > 5:
            reason = "Document appears to be medical but lacks referral-specific language"
        else:
            reason = "Document does not appear to be a medical referral"
        
        details = {
            'strong_keywords': strong_count,
            'medical_keywords': medical_count,
            'admin_keywords': admin_count,
            'pattern_matches': pattern_count,
            'total_score': score
        }
        
        logger.info(
            f"Classification result: is_referral={is_referral}, "
            f"confidence={confidence:.2f}, score={score}, details={details}"
        )
        
        return {
            'is_referral': is_referral,
            'confidence': round(confidence, 2),
            'score': score,
            'details': details,
            'reason': reason
        }
    
    def _count_keywords(self, text: str, keywords: List[str]) -> int:
        """Count occurrences of keywords in text."""
        count = 0
        for keyword in keywords:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
            matches = re.findall(pattern, text)
            if matches:
                count += len(matches)
        return count
    
    def _count_patterns(self, text: str, patterns: List[str]) -> int:
        """Count pattern matches in text."""
        count = 0
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                count += len(matches)
        return count


def classify_document(text: str) -> Dict:
    """
    Convenience function to classify a document.
    
    Args:
        text: Extracted text from document
        
    Returns:
        Classification result dictionary
    """
    classifier = ReferralClassifier()
    return classifier.classify(text)