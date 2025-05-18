from utils import is_audio_message
from config import SHOW_MESSAGE_TEXT

def extract_message_details(conversation_id, message_id, message_info, conversation_mapping=None):
    details = {
        'conversation_id': conversation_id,
        'message_id': message_id,
        'role': None,
        'tool_name': None,
        'model_slug': None,
        'content_type': None,
        'message_type': None,
        'is_multimodal': False,
        'contains_images': False,
        'contains_videos': False,
        'contains_audios': False,
        'contains_files': False,
        'contains_embeds': False,
        'contains_interactive_elements': False,
        'contains_reactions': False,
        'contains_media': False,
        'is_audio': False,
        'create_time': None,
        'additional_info': {}
    }

    if not message_info or 'message' not in message_info or not message_info['message']:
        details['message_type'] = 'Not found'
        return details

    message = message_info['message']
    details['create_time'] = message.get('create_time', None)
    author = message.get('author', {})
    role = author.get('role', '')
    details['role'] = role
    if role == 'tool':
        details['tool_name'] = author.get('name', 'Inconnu')

    if role == 'tool' and details['tool_name'] == 'a8km123' and conversation_mapping:
        children_ids = message_info.get('children', [])
        if children_ids:
            child_id = children_ids[0]
            child_message_info = conversation_mapping.get(child_id, {})
            child_details = extract_message_details(conversation_id, child_id, child_message_info, conversation_mapping)
            details['model_slug'] = child_details.get('model_slug', 'Not found')
        else:
            details['model_slug'] = 'Not found'
    elif role != 'user':
        metadata = message.get('metadata', {})
        if is_audio_message(message):
            details['is_audio'] = True
            details['model_slug'] = 'gpt-4o-audio-preview'
        else:
            details['model_slug'] = metadata.get('model_slug', 'Not found')
    elif role == 'user' and conversation_mapping:
        children_ids = message_info.get('children', [])
        if children_ids:
            child_id = children_ids[0]
            child_message_info = conversation_mapping.get(child_id, {})
            child_details = extract_message_details(conversation_id, child_id, child_message_info, conversation_mapping)
            details['model_slug'] = child_details.get('model_slug', 'Not found')
        else:
            details['model_slug'] = 'Not found'

    content = message.get('content', {})
    ctype = content.get('content_type', 'Not found')
    details['content_type'] = ctype

    if ctype == 'code':
        code_text = content.get('text', None)
        if code_text is not None:
            details['additional_info']['text'] = code_text
    elif ctype == 'tether_browsing_display':
        result = content.get('result', '')
        if result:
            details['additional_info']['text'] = result
    elif ctype == 'tether_quote':
        quote_text = content.get('text', '')
        if quote_text:
            details['additional_info']['text'] = quote_text

    message_type = None
    if role != 'user':
        metadata = message.get('metadata', {})
        message_type = metadata.get('message_type', None)
    if not message_type:
        message_type = ctype
    details['message_type'] = message_type if message_type else 'Not found'

    if ctype in ['multimodal_text', 'embed', 'interactive']:
        details['is_multimodal'] = True

    parts = content.get('parts', [])
    for part in parts:
        if isinstance(part, dict):
            ptype = part.get('content_type', '')
            if ptype in ['image_asset_pointer', 'image']:
                details['contains_images'] = True
                details['contains_media'] = True
            elif ptype == 'video':
                details['contains_videos'] = True
                details['contains_media'] = True
                details['is_audio'] = False
            elif ptype == 'audio':
                details['contains_audios'] = True
                details['contains_media'] = True
                details['is_audio'] = True
                audio_metadata = part.get('metadata', {})
                end_time = audio_metadata.get('end', None)
                if end_time:
                    details['additional_info']['audio_duration'] = end_time
            elif ptype == 'file':
                details['contains_files'] = True
                details['contains_media'] = True
            elif ptype == 'embed':
                details['contains_embeds'] = True
                details['contains_media'] = True
            elif ptype == 'interactive':
                details['contains_interactive_elements'] = True
            elif ptype == 'reaction':
                details['contains_reactions'] = True
            elif ptype == 'audio_transcription':
                if SHOW_MESSAGE_TEXT:
                    transcription_text = part.get('text', '')
                    if transcription_text:
                        details['additional_info']['transcription_text'] = transcription_text
                        if role == 'user':
                            details['additional_info']['transcription_direction'] = 'in'
                        elif role == 'assistant':
                            details['additional_info']['transcription_direction'] = 'out'
            if 'text' in part:
                txt = part.get('text', '')
                if txt:
                    if 'text' not in details['additional_info']:
                        details['additional_info']['text'] = txt
                    else:
                        details['additional_info']['text'] += ' ' + txt
        elif isinstance(part, str):
            if 'text' not in details['additional_info']:
                details['additional_info']['text'] = part
            else:
                details['additional_info']['text'] += ' ' + part

    attachments = message.get('metadata', {}).get('attachments', []) if role != 'user' else []
    for att in attachments:
        mime_type = att.get('mime_type', '')
        if mime_type.startswith('image/'):
            details['contains_images'] = True
            details['contains_media'] = True
            if role == 'user':
                img_details = {
                    'size_bytes': att.get('size', 0),
                    'width': None,
                    'height': None
                }
                if 'images' not in details['additional_info']:
                    details['additional_info']['images'] = []
                details['additional_info']['images'].append(img_details)
        elif mime_type.startswith('video/'):
            details['contains_videos'] = True
            details['contains_media'] = True
        elif mime_type.startswith('audio/'):
            details['contains_audios'] = True
            details['contains_media'] = True
            details['is_audio'] = True
            audio_metadata = att.get('metadata', {})
            end_time = audio_metadata.get('end', None)
            if end_time:
                details['additional_info']['audio_duration'] = end_time
        elif mime_type.startswith('application/'):
            details['contains_files'] = True
            details['contains_media'] = True
        elif mime_type.startswith('embed/'):
            details['contains_embeds'] = True
            details['contains_media'] = True

    if role != 'user':
        if 'url' in content:
            details['additional_info']['url'] = content['url']
    if 'language' in content:
        details['additional_info']['language'] = content['language']

    recipient = message.get('recipient', '')
    if recipient == 'bio':
        details['additional_info']['recipient_info'] = 'Mémoire interne'
    elif recipient == 'dalle.text2im':
        details['additional_info']['recipient_info'] = 'Texte envoyé à DALL·E'

    return details
