import math
import re
from datetime import datetime
from dateutil import parser as dtparser

def is_audio_message(message):
    """
    Détermine si un message est audio.
    """
    content = message.get('content', {})
    parts = content.get('parts', [])
    for part in parts:
        if isinstance(part, dict):
            if part.get('content_type') == 'audio_asset_pointer':
                return True
    return False

def parse_period_key(key, period):
    """
    Fonction d'aide pour parser les clés de période pour le tri.
    """
    try:
        if ' ' in key and ':' in key:
            return dtparser.parse(key)
        return dtparser.parse(key)
    except Exception:
        return key

def sort_period(period_key, period):
    """
    Fonction pour trier les périodes.
    """
    try:
        val = parse_period_key(period_key, period)
        if isinstance(val, datetime):
            return val
        return datetime.min
    except:
        return datetime.min
