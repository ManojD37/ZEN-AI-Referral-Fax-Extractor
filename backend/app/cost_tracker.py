# app/cost_tracker.py
"""
Cost tracking for extraction operations.
Tracks usage of GPT vs Free OCR and calculates savings.
"""
import os
import json
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pathlib import Path

from app.log import logger

# Cost constants (per extraction)
COSTS = {
    "gpt": 0.015,      # ~$15 per 1000 docs
    "free": 0.0,       # Free (compute only)
}

# In-memory storage for stats (use database in production)
_stats: Dict[str, Any] = {
    "extractions": [],
    "total_gpt": 0,
    "total_free": 0,
    "total_cost_gpt": 0.0,
    "total_cost_free": 0.0,
}

# Settings storage
_settings: Dict[str, Any] = {
    "extraction_mode": os.getenv("DEFAULT_EXTRACTION_MODE", "gpt"),
    "auto_fallback": True,
    "confidence_threshold": 0.6,
}

# File path for persistence
STATS_FILE = Path(__file__).parent.parent / "data" / "extraction_stats.json"
SETTINGS_FILE = Path(__file__).parent.parent / "data" / "settings.json"


def ensure_data_dir():
    """Ensure data directory exists."""
    data_dir = STATS_FILE.parent
    data_dir.mkdir(parents=True, exist_ok=True)


def load_stats():
    """Load stats from file."""
    global _stats
    ensure_data_dir()
    if STATS_FILE.exists():
        try:
            with open(STATS_FILE, 'r') as f:
                _stats = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load stats: {e}")


def save_stats():
    """Save stats to file."""
    ensure_data_dir()
    try:
        with open(STATS_FILE, 'w') as f:
            json.dump(_stats, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save stats: {e}")


def load_settings():
    """Load settings from file."""
    global _settings
    ensure_data_dir()
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, 'r') as f:
                loaded = json.load(f)
                _settings.update(loaded)
        except Exception as e:
            logger.warning(f"Failed to load settings: {e}")


def save_settings():
    """Save settings to file."""
    ensure_data_dir()
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(_settings, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save settings: {e}")


# Initialize on module load
load_stats()
load_settings()


def get_extraction_mode() -> str:
    """Get current extraction mode."""
    return _settings.get("extraction_mode", "gpt")


def set_extraction_mode(mode: str) -> bool:
    """Set extraction mode ('gpt' or 'free')."""
    if mode not in ["gpt", "free"]:
        return False
    _settings["extraction_mode"] = mode
    save_settings()
    logger.info(f"Extraction mode set to: {mode}")
    return True


def get_settings() -> Dict[str, Any]:
    """Get all settings."""
    return _settings.copy()


def update_settings(new_settings: Dict[str, Any]) -> Dict[str, Any]:
    """Update settings."""
    for key in ["extraction_mode", "auto_fallback", "confidence_threshold"]:
        if key in new_settings:
            _settings[key] = new_settings[key]
    save_settings()
    return _settings.copy()


def record_extraction(mode: str, extraction_id: str, confidence: float = 1.0, processing_time: float = 0):
    """Record an extraction for cost tracking."""
    cost = COSTS.get(mode, 0)
    
    record = {
        "id": extraction_id,
        "mode": mode,
        "cost": cost,
        "confidence": confidence,
        "processing_time": processing_time,
        "timestamp": datetime.now().isoformat(),
    }
    
    _stats["extractions"].append(record)
    
    if mode == "gpt":
        _stats["total_gpt"] += 1
        _stats["total_cost_gpt"] += cost
    else:
        _stats["total_free"] += 1
        _stats["total_cost_free"] += cost
    
    # Keep only last 10000 records
    if len(_stats["extractions"]) > 10000:
        _stats["extractions"] = _stats["extractions"][-10000:]
    
    save_stats()


def get_cost_analytics(days: int = 30) -> Dict[str, Any]:
    """Get cost analytics for the specified period."""
    cutoff = datetime.now() - timedelta(days=days)
    cutoff_str = cutoff.isoformat()
    
    recent = [e for e in _stats["extractions"] if e.get("timestamp", "") >= cutoff_str]
    
    gpt_count = sum(1 for e in recent if e.get("mode") == "gpt")
    free_count = sum(1 for e in recent if e.get("mode") == "free")
    
    gpt_cost = gpt_count * COSTS["gpt"]
    free_cost = free_count * COSTS["free"]
    
    # Calculate what it would cost if all were GPT
    potential_cost = (gpt_count + free_count) * COSTS["gpt"]
    actual_cost = gpt_cost + free_cost
    savings = potential_cost - actual_cost
    savings_percent = (savings / potential_cost * 100) if potential_cost > 0 else 0
    
    # Average confidence by mode
    gpt_confidences = [e.get("confidence", 0) for e in recent if e.get("mode") == "gpt"]
    free_confidences = [e.get("confidence", 0) for e in recent if e.get("mode") == "free"]
    
    avg_gpt_confidence = sum(gpt_confidences) / len(gpt_confidences) if gpt_confidences else 0
    avg_free_confidence = sum(free_confidences) / len(free_confidences) if free_confidences else 0
    
    # Daily breakdown for chart
    daily_stats = {}
    for e in recent:
        date = e.get("timestamp", "")[:10]
        if date not in daily_stats:
            daily_stats[date] = {"gpt": 0, "free": 0, "cost": 0}
        daily_stats[date][e.get("mode", "gpt")] += 1
        daily_stats[date]["cost"] += e.get("cost", 0)
    
    return {
        "period_days": days,
        "total_documents": gpt_count + free_count,
        "gpt_count": gpt_count,
        "free_count": free_count,
        "gpt_cost": round(gpt_cost, 2),
        "free_cost": round(free_cost, 2),
        "total_cost": round(actual_cost, 2),
        "potential_cost": round(potential_cost, 2),
        "savings": round(savings, 2),
        "savings_percent": round(savings_percent, 1),
        "avg_gpt_confidence": round(avg_gpt_confidence * 100, 1),
        "avg_free_confidence": round(avg_free_confidence * 100, 1),
        "daily_breakdown": daily_stats,
        "all_time": {
            "total_gpt": _stats.get("total_gpt", 0),
            "total_free": _stats.get("total_free", 0),
            "total_cost_gpt": round(_stats.get("total_cost_gpt", 0), 2),
            "total_cost_free": round(_stats.get("total_cost_free", 0), 2),
        }
    }
