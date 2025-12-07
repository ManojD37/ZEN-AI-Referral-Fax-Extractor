# app/schemas.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Any


class Word(BaseModel):
    text: str
    left: int
    top: int
    width: int
    height: int
    conf: int


class Line(BaseModel):
    text: str
    words: List[Word]


class Block(BaseModel):
    lines: List[Line]


class PageOCR(BaseModel):
    page_number: int
    width: int
    height: int
    blocks: List[Block]


class OCRDocument(BaseModel):
    pages: List[PageOCR]


class DocumentMeta(BaseModel):
    title: Optional[str] = Field(None, description="Document title (best guess)")
    date: Optional[str] = Field(None, description="Document date (ISO if available)")
    pages: Optional[int] = Field(None, description="Number of pages detected")


class ReferralInfo(BaseModel):
    referral_to: Optional[str] = None
    referral_focal_point: Optional[str] = None
    referral_phone: Optional[str] = None
    referral_location: Optional[str] = None
    referral_email: Optional[str] = None

    referring_from: Optional[str] = None
    referring_focal_point: Optional[str] = None
    referring_phone: Optional[str] = None
    referring_location: Optional[str] = None
    referring_email: Optional[str] = None


class PatientInfo(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    accompanied_by_care_provider: Optional[bool] = None


class FunctionalStatus(BaseModel):
    mobility: Optional[str] = None
    precautions: Optional[str] = None
    self_care: Optional[str] = None
    cognitive_impairment: Optional[str] = None
    assistive_devices_provided: Optional[List[str]] = []
    assistive_devices_required: Optional[List[str]] = []


class Diagnoses(BaseModel):
    primary_diagnoses: Optional[List[str]] = []
    other_diagnoses: Optional[List[str]] = []


class ReferralExtraction(BaseModel):
    document_meta: DocumentMeta
    referral: ReferralInfo
    patient: PatientInfo
    diagnoses: Optional[Diagnoses] = Diagnoses()
    treatments: Optional[List[str]] = []
    reason_for_referral: Optional[str] = None
    transportation_needs: Optional[List[str]] = []
    follow_up_requirements: Optional[List[str]] = []
    functional_status: Optional[FunctionalStatus] = None
    compiled_by: Optional[str] = None
    signature: Optional[str] = None
    position: Optional[str] = None
    file_number: Optional[str] = None

    @validator("treatments", pre=True, always=True)
    def ensure_treatments_list(cls, v):
        return v or []

    @validator("transportation_needs", pre=True, always=True)
    def ensure_transport_list(cls, v):
        return v or []

    @validator("follow_up_requirements", pre=True, always=True)
    def ensure_followup_list(cls, v):
        return v or []


class StructuredResult(BaseModel):
    job_id: str
    extracted: Any
    raw_ocr: OCRDocument
