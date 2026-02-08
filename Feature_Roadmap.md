# Feature Roadmap & Improvement Suggestions

## Executive Summary
This document outlines key features and improvements to elevate the "Medical Referral Fax Extractor" from a prototype to an enterprise-grade solution focused on utility, compliance, and user experience.

---

## 1. High-Impact Workflow Improvements
*These features directly improve the daily efficiency of users.*

### ✅ Verification Status Workflow
Currently, documents are just "processed". Implementing a status lifecycle is crucial for medical records:
- **Status:** `New` → `In Review` → `Verified` → `Exported`
- **Action:** Add a "Verify & Complete" button at the bottom of the Output Page.
- **Why:** Leads need to know which documents are "done" and safe to enter into the EMR.

### 🖥️ Split-Screen Review (Side-by-Side)
Currently, the file preview is above the form.
- **Improvement:** Create a side-by-side layout where the PDF is on the **left (50%)** and the editable form is on the **right (50%)**.
- **Sync:** When a user clicks a field (e.g., "Patient Name"), highlight the corresponding area on the PDF (if bounding boxes are available from the Vision API).
- **Why:** Drastically speeds up manual verification and error checking.

### 📥 Bulk Upload & Queue Management
- **Improvement:** Allow uploading 50 files at once.
- **UI:** A "Processing Queue" global sidebar showing status (e.g., "Processing 3/10...").
- **Why:** Real-world fax servers receive batches of documents. Handling one by one is too slow for volume.

---

## 2. Enterprise & Compliance Features (The "Wow" Factor)
*These features demonstrate readiness for real-world healthcare deployment.*

### 🏥 HL7 FHIR Export
- **Current:** JSON export.
- **Proposal:** Add an option to export as **HL7 FHIR Bundle** (JSON/XML).
- **Why:** FHIR is the universal standard for healthcare data exchange. This shows the app can potentially integrate directly with Epic, Cerner, or other EMRs.

### 🔒 Audit Logs (HIPAA Compliance)
- **Feature:** Track every change made to extracted data.
- **Example:** "User 'Admin' changed 'Patient Name' from 'John Doe' to 'Jon Doe' at 10:42 AM".
- **Why:** Essential for compliance and data integrity audits.

### 🔐 Role-Based Access Control (RBAC) (Mockup)
- **Feature:** Even if not fully implemented, show UI elements for "Admin", "Reviewer", and "Auditor" roles.
- **Why:** Demonstrates security awareness.

---

## 3. Analytics Dashboard
*Leads love data. Add a "Dashboard" page.*

### 📊 Key Metrics to Visualize
1. **Referral Volume:** Bar chart of referrals per day/week.
2. **Top Referring Facilities:** Pie chart showing which clinics send the most patients (e.g., "City General: 40%").
3. **Processing Speed:** Average time to extract (e.g., "1.2 seconds").
4. **Accuracy Confidence:** Histogram of confidence scores.

---

## 4. UI/UX Polish (Quick Wins)
*Small changes that make the app feel "Pro".*

- **Smart Formatting:**
  - Auto-format phone numbers as `(XXX) XXX-XXXX`.
  - Date pickers for DOB and Referral Date.
- **Skeleton Loaders:** Specific skeleton screens (shaped like the form) instead of generic spinners during extraction.
- **Confidence Highlighting:**
  - Visually highlight fields with low confidence (<80%) in **orange** to draw the reviewer's eye immediately.
- **Dark Mode:** A toggle for dark mode (often requested by radiologists/staff working in dim rooms).

---

## 5. Technical "Next Steps" for the Presentation
If asked "What's next?", you can propose:

1. **EMR Integration:** Direct API connector to push verify data to the Electronic Medical Record.
2. **Email Ingestion:** Auto-process referrals sent to `referrals@clinic.com`.
3. **Fax Integration:** Integrate with eFax API (e.g., Twilio, RingCentral) to auto-download faxes.

---

## Suggested Demo Script for Leads
1. **Upload:** "Watch as we ingest a messy, handwritten fax PDF." (Upload sample)
2. **Speed:** "Within seconds, AI analyzes the layout and handwriting."
3. **Review:** "Our staff sees the data side-by-side. Notice how low-confidence fields are flagged for review."
4. **Correction:** "I make one quick edit..." (Edit field)
5. **Action:** "...and verify. The data is now ready for Epic/Cerner via FHIR export."
