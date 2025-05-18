import json
from parser_data import parse_conversations
from extractor_conversation import extract_conversation_details
from extractor_message import extract_message_details
from config import SHOW_MESSAGE_TEXT, MESSAGE_TYPES_TO_ANALYZE
from token_analysis import analyze_text
from collections import defaultdict

def calculate_message_cost(message_details, price_data):
    """
    Calcule le coût d'un message en fonction du modèle et du nombre de tokens.
    """
    model = message_details.get('model_slug', 'gpt-4o')
    token_count = message_details.get('additional_info', {}).get('token_count', 0)
    role = message_details.get('role', 'Not found')
    
    model_prices = price_data.get("models", {}).get(model, price_data.get("models", {}).get('gpt-4o', {}))
    
    if role == 'user':
        price_per_token = model_prices.get('input', 2.50)
    else:
        price_per_token = model_prices.get('output', 10.00)
    
    cost = (token_count / 1_000_000) * price_per_token
    
    # Ajouter le coût des images si présent
    if message_details.get('contains_images', False):
        image_count = len(message_details.get('additional_info', {}).get('images', []))
        image_price = price_data.get("images", {}).get("dalle.text2im", 0.020)
        cost += image_count * image_price
    
    return cost

def process_conversations(json_file_path, logger=None, progress_callback=None):
    """
    Traite les conversations depuis un fichier JSON brut et retourne les données structurées.
    
    Args:
        json_file_path: Chemin vers le fichier JSON
        logger: Logger pour les messages de debug
        progress_callback: Fonction de callback pour la progression (reçoit un pourcentage et une description)
    """
    try:
        # Charger les prix
        try:
            with open('scripts/price.json', 'r', encoding='utf-8') as f:
                price_data = json.load(f)
        except Exception as e:
            if logger:
                logger.error("Erreur lors du chargement des prix: %s", e)
            price_data = {"models": {"gpt-4o": {"input": 2.50, "output": 10.00}}, "images": {"dalle.text2im": 0.020}}

        # Compter d'abord le nombre total de conversations
        total_conversations = sum(1 for _ in parse_conversations(json_file_path))
        if progress_callback:
            progress_callback(0, f"Démarrage du traitement de {total_conversations} conversations")

        conversations = parse_conversations(json_file_path)
        all_data = []
        
        for idx, conversation in enumerate(conversations, 1):
            conversation_id = conversation.get('id', 'id_non_specifie')
            title = conversation.get('title', 'Sans titre')
            details = extract_conversation_details(conversation)

            conversation_entry = {
                'id': conversation_id,
                'title': title,
                'create_time': details.get('create_time'),
                'is_archived': details.get('is_archived'),
                'user_message_count': details.get('user_message_count', 0),
                'assistant_message_count': details.get('assistant_message_count', 0),
                'tool_message_count': details.get('tool_message_count', 0),
                'tools_used': details.get('tools_used', []),
                'messages': [],
                'totalCost': 0.0  # Initialiser le coût total
            }

            valid_message_ids = details.get('message_ids', [])
            # Initialiser le compteur de tokens par modèle
            model_tokens = {}
            
            if progress_callback:
                progress = (idx / total_conversations) * 100
                progress_callback(progress, f"Processing conversation {idx}/{total_conversations}: {title}")
            
            if logger:
                logger.info(f"Processing conversation {conversation_id} - {title}")
            
            for message_id in valid_message_ids:
                message_info = conversation.get('mapping', {}).get(message_id, {})
                conversation_mapping = conversation.get('mapping', {})
                message_details = extract_message_details(conversation_id, message_id, message_info, conversation_mapping)

                if (message_details['content_type'] in MESSAGE_TYPES_TO_ANALYZE and
                    'text' in message_details.get('additional_info', {})):
                    text = message_details['additional_info']['text']
                    model = message_details.get('model_slug', 'gpt-4o')
                    stats = analyze_text(text, model)
                    message_details['additional_info'].update(stats)

                    # Compter les tokens par modèle
                    model_tokens[model] = model_tokens.get(model, 0) + stats['token_count']
                    if logger:
                        logger.debug(f"Message {message_id} - Modèle: {model}, Tokens: {stats['token_count']}")

                    if message_details['role'] == 'user':
                        conversation_entry.setdefault('input_tokens', 0)
                        conversation_entry['input_tokens'] += stats['token_count']
                    else:
                        conversation_entry.setdefault('output_tokens', 0)
                        conversation_entry['output_tokens'] += stats['token_count']

                # Calculer le coût du message
                message_cost = calculate_message_cost(message_details, price_data)
                message_details['cost'] = message_cost
                conversation_entry['totalCost'] += message_cost

                conversation_entry['messages'].append(message_details)
            
            # Déterminer le modèle dominant
            if model_tokens:
                if logger:
                    logger.info(f"Distribution des tokens par modèle pour la conversation {conversation_id}:")
                    for model, tokens in model_tokens.items():
                        logger.info(f"  - {model}: {tokens} tokens")
                
                dominant_model = max(model_tokens.items(), key=lambda x: x[1])[0]
                conversation_entry['dominant_model'] = dominant_model
                if logger:
                    logger.info(f"Modèle dominant pour la conversation {conversation_id}: {dominant_model} avec {model_tokens[dominant_model]} tokens")
            else:
                if logger:
                    logger.warning(f"Aucun modèle trouvé pour la conversation {conversation_id}")

            # Arrondir le coût total à 6 décimales
            conversation_entry['totalCost'] = round(conversation_entry['totalCost'], 6)
            all_data.append(conversation_entry)
        return all_data
    except Exception as e:
        if logger:
            logger.error("Erreur lors du traitement des conversations: %s", e)
        return []

def save_structured_data(all_data, output_file_path, logger=None):
    """
    Sauvegarde les données structurées (JSON détaillé) dans un fichier.
    """
    try:
        with open(output_file_path, 'w', encoding='utf-8') as outfile:
            json.dump(all_data, outfile, ensure_ascii=False, indent=4)
        if logger:
            logger.info("Les données structurées ont été sauvegardées dans %s", output_file_path)
    except Exception as e:
        if logger:
            logger.error("Erreur lors de la sauvegarde des données structurées: %s", e)
