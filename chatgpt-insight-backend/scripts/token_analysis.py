import tiktoken
from collections import defaultdict
import re

ENCODINGS = {
    'o200k_base': tiktoken.get_encoding('o200k_base'),
    'p50k_base': tiktoken.get_encoding('p50k_base'),
    'cl100k_base': tiktoken.get_encoding('cl100k_base')
}

MODEL_ENCODINGS = {
    'gpt-4-browsing': 'o200k_base',
    'gpt-4-code-interpreter': 'o200k_base',
    'gpt-4-dalle': 'o200k_base',
    'gpt-4-gizmo': 'o200k_base',
    'gpt-4-plugins': 'o200k_base',
    'gpt-4o': 'o200k_base',
    'gpt-4o-audio-preview': 'o200k_base',
    'gpt-4o-mini': 'o200k_base',
    'o1-mini': 'o200k_base',
    'o1-preview': 'o200k_base',
    'text-davinci-002-render': 'p50k_base',
    'text-davinci-002-render-sha': 'p50k_base',
    'gpt-4': 'cl100k_base'
}

def get_encoding(model_slug):
    return ENCODINGS.get(MODEL_ENCODINGS.get(model_slug, 'cl100k_base'), ENCODINGS['cl100k_base'])

def count_tokens(text, model_slug):
    encoding = get_encoding(model_slug)
    return len(encoding.encode(text, disallowed_special=()))

def analyze_text(content, model_slug):
    stats = defaultdict(int)
    stats['character_count'] = len(content)
    stats['word_count'] = len(content.split())
    stats['sentence_count'] = len(re.findall(r'[.!?]+', content))
    stats['token_count'] = count_tokens(content, model_slug)
    return stats
