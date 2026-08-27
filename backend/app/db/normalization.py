"""Central normalization utilities for PlaceMind entity deduplication and canonical keys."""
import re
import unicodedata
from typing import Optional

def normalize_email(email: Optional[str]) -> str:
    """Normalize email address: trim, lowercase, unicode normalize."""
    if not email:
        return ""
    email_clean = unicodedata.normalize("NFKC", str(email).strip().lower())
    return email_clean

def normalize_company_name(name: Optional[str]) -> str:
    """Derive canonical company name and alphanumeric companyKey."""
    if not name:
        return ""
    # Clean whitespace and unicode
    clean = unicodedata.normalize("NFKC", str(name).strip())
    # Remove trailing long timestamps/numeric IDs
    clean = re.sub(r"\b\d{6,}\b", "", clean).strip()
    return clean

def build_company_key(name: Optional[str]) -> str:
    """Build a deterministic unique key for company deduplication.
    
    Example:
      "TechNova Solutions, Inc." -> "technovasolutions"
      " TECHNOVA SOLUTIONS " -> "technovasolutions"
    """
    clean = normalize_company_name(name).lower()
    # Strip common entity punctuation
    clean = re.sub(r"[\s\.,\-_&/\(\)\[\]]+", "", clean)
    return clean

def normalize_job_role(role: Optional[str]) -> str:
    """Normalize job role title for consistent comparison."""
    if not role:
        return ""
    clean = unicodedata.normalize("NFKC", str(role).strip().lower())
    clean = re.sub(r"\s+", " ", clean)
    return clean

def build_drive_key(company_key: str, role_title: str) -> str:
    """Build a logical unique key for placement drives."""
    clean_role = normalize_job_role(role_title)
    role_key = re.sub(r"[\s\.,\-_&/\(\)\[\]]+", "", clean_role)
    return f"{company_key}::{role_key}"

def build_room_key(block: Optional[str], room_number: Optional[str]) -> str:
    """Derive canonical room key.
    
    Example:
      Block="Block B", Room="B-386" -> "BLOCK-B::B-386"
    """
    b = str(block or "").strip().upper()
    r = str(room_number or "").strip().upper()
    return f"{b}::{r}"

def build_panel_key(panel_name: Optional[str]) -> str:
    """Derive canonical panel key."""
    if not panel_name:
        return ""
    clean = str(panel_name).strip().upper()
    # Strip trailing numeric noise
    clean = re.sub(r"\b\d{6,}\b", "", clean).strip()
    clean = re.sub(r"\s+", " ", clean)
    return clean

def build_notification_key(
    notification_type: str,
    recipient_id: str,
    application_id: str = "",
    student_id: str = "",
    drive_id: str = "",
    event_id: str = "",
    title: str = "",
    notif_id: str = "",
) -> str:
    """Build deterministic idempotent notification key to prevent duplicate alerts.
    
    Example:
      APPLICATION_RECEIVED + recipient_id + application_id
      APPLICATION_SHORTLISTED + recipient_id + application_id
    """
    t = str(notification_type or "").strip().upper()
    r = str(recipient_id or "").strip()
    app = str(application_id or "").strip()
    s = str(student_id or "").strip()
    d = str(drive_id or "").strip()
    e = str(event_id or "").strip()
    tit = re.sub(r"\s+", "", str(title or "").lower())

    if app:
        return f"{t}::RECIP_{r}::APP_{app}"
    elif d and s:
        return f"{t}::RECIP_{r}::STUD_{s}::DRIVE_{d}"
    elif e:
        return f"{t}::RECIP_{r}::EVT_{e}"
    elif tit:
        return f"{t}::RECIP_{r}::TIT_{tit}"
    elif notif_id:
        return f"{t}::RECIP_{r}::ID_{notif_id}"
    else:
        return f"{t}::RECIP_{r}::STUD_{s}"
