def extract_conversation_details(conversation):
    """
    Extrait des détails spécifiques d'une conversation.
    """
    details = {}
    details['create_time'] = conversation.get('create_time', None)
    details['is_archived'] = conversation.get('is_archived', False)

    user_count = 0
    assistant_count = 0
    tool_count = 0
    message_ids = []
    tools_used = set()

    mapping = conversation.get('mapping', {})
    for message_id, message_info in mapping.items():
        message = message_info.get('message', {})
        if not message:
            continue
        author = message.get('author', {})
        role = author.get('role', '')
        tool_name = author.get('name', None) if role == 'tool' else None

        content = message.get('content', {})
        content_type = content.get('content_type', '')
        parts = content.get('parts', [])

        if role == 'system' and content_type == 'text' and parts == [""]:
            continue
        if content_type == 'text' and all(isinstance(part, str) and part.strip() == "" for part in parts):
            continue

        if role == 'user':
            user_count += 1
        elif role == 'assistant':
            assistant_count += 1
        elif role == 'tool':
            tool_count += 1
            if tool_name:
                tools_used.add(tool_name)

        message_ids.append(message_id)

    details['user_message_count'] = user_count
    details['assistant_message_count'] = assistant_count
    details['tool_message_count'] = tool_count
    details['tools_used'] = list(tools_used)
    details['message_ids'] = message_ids

    return details
