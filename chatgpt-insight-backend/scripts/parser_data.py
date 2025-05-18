import json

def parse_conversations(json_file_path):
    """
    Lit un fichier JSON et génère chaque conversation individuellement.
    """
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for conversation in data:
                yield conversation
    except json.JSONDecodeError as e:
        print(f"Erreur de décodage JSON: {e}")
    except FileNotFoundError:
        print(f"Fichier non trouvé: {json_file_path}")
