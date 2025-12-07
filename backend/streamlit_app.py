# streamlit_app.py
import streamlit as st
import requests
from io import BytesIO
from pdf2image import convert_from_bytes
from PIL import Image
import json
import os

# ---------- SETTINGS ----------
BACKEND_UPLOAD_URL = os.getenv("BACKEND_UPLOAD_URL", "http://localhost:8000/upload")

st.set_page_config(layout="wide", page_title="Medical Referral Extractor")

st.title("Medical Referral Extractor — Multi-format Support")

with st.sidebar:
    st.header("Supported Formats")
    st.write("✅ PDF")
    st.write("✅ JPG/JPEG/PNG")
    st.write("✅ TXT")
    st.write("✅ DOCX (Word)")
    
    st.markdown("---")
    st.header("Backend Settings")
    backend_url = st.text_input("Backend `/upload` URL", BACKEND_UPLOAD_URL)
    
    st.markdown("---")
    st.write("**How it works:**")
    st.write("1. Upload any medical document")
    st.write("2. Text is extracted automatically")
    st.write("3. AI analyzes and extracts referral info")
    st.write("4. Review and edit the results")

# File uploader - now supports multiple formats
uploaded_file = st.file_uploader(
    "Upload medical referral document",
    type=["pdf", "jpg", "jpeg", "png", "txt", "docx"],
    help="Supports PDF, images, text files, and Word documents"
)

if not uploaded_file:
    st.info("👆 Upload a medical referral document to get started")
    st.stop()

# Show file info
file_details = {
    "Filename": uploaded_file.name,
    "File size": f"{uploaded_file.size / 1024:.2f} KB",
    "File type": uploaded_file.type
}
st.write("**File Details:**", file_details)

st.info("🔄 Processing document... This may take 10-30 seconds.")

# Upload to backend
try:
    files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
    resp = requests.post(backend_url, files=files, timeout=120)
except Exception as e:
    st.error(f"❌ Failed to contact backend at {backend_url}: {e}")
    st.stop()

if resp.status_code != 200:
    st.error(f"❌ Backend responded with status {resp.status_code}: {resp.text}")
    st.stop()

data = resp.json()
job_id = data.get("job_id", "unknown")
file_type = data.get("file_type", "unknown")
text_stats = data.get("text_stats", {})
extracted = data.get("extracted", {})

st.success("✅ Document processed successfully!")

# Show extraction stats
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("File Type", file_type)
with col2:
    st.metric("Characters Extracted", text_stats.get("character_count", 0))
with col3:
    st.metric("Words Extracted", text_stats.get("word_count", 0))

# Layout: Preview (if image/PDF) and Extracted Fields
left_col, right_col = st.columns([1, 1])

with left_col:
    st.subheader("📄 Document Preview")
    
    # Show preview based on file type
    if uploaded_file.name.lower().endswith('.pdf'):
        try:
            images = convert_from_bytes(uploaded_file.getvalue(), dpi=150)
            st.write(f"Showing first page of {len(images)} page(s)")
            st.image(images[0], use_container_width=True)
            
            # Show more pages if requested
            if len(images) > 1:
                if st.checkbox("Show all pages"):
                    for idx, img in enumerate(images[1:], start=2):
                        st.image(img, caption=f"Page {idx}", use_container_width=True)
        except Exception as e:
            st.warning(f"Could not generate PDF preview: {e}")
            
    elif uploaded_file.name.lower().endswith(('.jpg', '.jpeg', '.png')):
        st.image(uploaded_file, use_container_width=True)
        
    elif uploaded_file.name.lower().endswith('.txt'):
        
        st.text_area("Text File Content", uploaded_file.getvalue().decode('utf-8'), height=400)
        
    elif uploaded_file.name.lower().endswith('.docx'):
        st.info("📝 Word document processed. Preview not available, but text has been extracted.")

with right_col:
    st.subheader("📋 Extracted Information (Editable)")
    
    # Document metadata
    with st.expander("📄 Document Metadata", expanded=True):
        doc_meta = extracted.get("document_meta") or {}
        title = st.text_input("Title", value=doc_meta.get("title") or "")
        date = st.text_input("Date", value=doc_meta.get("date") or "")
        pages = st.number_input("Pages", value=doc_meta.get("pages") or 1, min_value=1)
    
    # Referral information
    with st.expander("🏥 Referral Information", expanded=True):
        ref = extracted.get("referral") or {}
        
        st.markdown("**Referring To:**")
        col1, col2 = st.columns(2)
        with col1:
            referral_to = st.text_input("Facility/Doctor", value=ref.get("referral_to") or "")
        with col2:
            referral_focal_point = st.text_input("Contact Person", value=ref.get("referral_focal_point") or "")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            referral_phone = st.text_input("Phone", value=ref.get("referral_phone") or "")
        with col2:
            referral_email = st.text_input("Email", value=ref.get("referral_email") or "")
        with col3:
            referral_location = st.text_input("Location", value=ref.get("referral_location") or "")
        
        st.markdown("**Referring From:**")
        col1, col2 = st.columns(2)
        with col1:
            referring_from = st.text_input("Facility/Doctor ", value=ref.get("referring_from") or "")
        with col2:
            referring_focal_point = st.text_input("Contact Person ", value=ref.get("referring_focal_point") or "")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            referring_phone = st.text_input("Phone ", value=ref.get("referring_phone") or "")
        with col2:
            referring_email = st.text_input("Email ", value=ref.get("referring_email") or "")
        with col3:
            referring_location = st.text_input("Location ", value=ref.get("referring_location") or "")
    
    # Patient information
    with st.expander("👤 Patient Information", expanded=True):
        pat = extracted.get("patient") or {}
        patient_name = st.text_input("Full Name", value=pat.get("full_name") or "")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            patient_phone = st.text_input("Phone Number", value=pat.get("phone") or "")
        with col2:
            patient_dob = st.text_input("Date of Birth", value=pat.get("date_of_birth") or "")
        with col3:
            patient_gender = st.text_input("Gender", value=pat.get("gender") or "")
        
        patient_address = st.text_input("Address", value=pat.get("address") or "")
        patient_accompanied = st.checkbox(
            "Accompanied by care provider",
            value=pat.get("accompanied_by_care_provider") or False
        )
    
    # Medical information
    with st.expander("🏥 Medical Information", expanded=True):
        diag = extracted.get("diagnoses") or {}
        primary_d = "\n".join(diag.get("primary_diagnoses", []))
        other_d = "\n".join(diag.get("other_diagnoses", []))
        
        primary_d_input = st.text_area("Primary Diagnoses (one per line)", value=primary_d, height=100)
        other_d_input = st.text_area("Other Diagnoses (one per line)", value=other_d, height=80)
        
        treatments = "\n".join(extracted.get("treatments", []))
        treatments_input = st.text_area("Treatments (one per line)", value=treatments, height=100)
        
        reason = st.text_area("Reason for Referral", value=extracted.get("reason_for_referral") or "", height=80)
    
    # Functional status
    with st.expander("♿ Functional Status"):
        func = extracted.get("functional_status") or {}
        mobility = st.text_input("Mobility", value=func.get("mobility") or "")
        precautions = st.text_input("Precautions", value=func.get("precautions") or "")
        self_care = st.text_input("Self Care", value=func.get("self_care") or "")
        cognitive = st.text_input("Cognitive Impairment", value=func.get("cognitive_impairment") or "")
    
    # Additional information
    with st.expander("📝 Additional Information"):
        transport = "\n".join(extracted.get("transportation_needs", []))
        transport_input = st.text_area("Transportation Needs", value=transport, height=60)
        
        followup = "\n".join(extracted.get("follow_up_requirements", []))
        followup_input = st.text_area("Follow-up Requirements", value=followup, height=60)
        
        compiled_by = st.text_input("Compiled By", value=extracted.get("compiled_by") or "")
        signature = st.text_input("Signature", value=extracted.get("signature") or "")
        position = st.text_input("Position", value=extracted.get("position") or "")
        file_number = st.text_input("File Number", value=extracted.get("file_number") or "")

# Export options
st.markdown("---")
st.subheader("💾 Export Options")

col1, col2 = st.columns(2)

with col1:
    if st.button("📥 Download as JSON", use_container_width=True):
        final = {
            "job_id": job_id,
            "document_meta": {"title": title, "date": date, "pages": pages},
            "referral": {
                "referral_to": referral_to,
                "referral_focal_point": referral_focal_point,
                "referral_phone": referral_phone,
                "referral_email": referral_email,
                "referral_location": referral_location,
                "referring_from": referring_from,
                "referring_focal_point": referring_focal_point,
                "referring_phone": referring_phone,
                "referring_email": referring_email,
                "referring_location": referring_location
            },
            "patient": {
                "full_name": patient_name,
                "phone": patient_phone,
                "date_of_birth": patient_dob,
                "gender": patient_gender,
                "address": patient_address,
                "accompanied_by_care_provider": patient_accompanied
            },
            "diagnoses": {
                "primary_diagnoses": [s.strip() for s in primary_d_input.splitlines() if s.strip()],
                "other_diagnoses": [s.strip() for s in other_d_input.splitlines() if s.strip()]
            },
            "treatments": [s.strip() for s in treatments_input.splitlines() if s.strip()],
            "reason_for_referral": reason,
            "transportation_needs": [s.strip() for s in transport_input.splitlines() if s.strip()],
            "follow_up_requirements": [s.strip() for s in followup_input.splitlines() if s.strip()],
            "functional_status": {
                "mobility": mobility,
                "precautions": precautions,
                "self_care": self_care,
                "cognitive_impairment": cognitive
            },
            "compiled_by": compiled_by,
            "signature": signature,
            "position": position,
            "file_number": file_number
        }
        st.download_button(
            "⬇️ Click to download",
            data=json.dumps(final, indent=2),
            file_name=f"{job_id}_referral.json",
            mime="application/json",
            use_container_width=True
        )

with col2:
    if st.button("📋 View Raw Response", use_container_width=True):
        st.json(data)

st.markdown("---")
st.caption("🤖 Powered by Azure OpenAI | 📄 Supports PDF, Images, TXT, DOCX")