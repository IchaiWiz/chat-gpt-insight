"""
Usage:
  run_script.py <raw_json_file> <structured_json_file> [--stats_output_file=<stats_output_file>] [--price_file=<price_file>] [--period=<period> ...] [--start_date=<start_date>] [--end_date=<end_date>] [--verbosity=<verbosity>]
  run_script.py -h | --help

Options:
  -h --help                                  Affiche l'aide.
  --stats_output_file=<stats_output_file>    Chemin du fichier JSON de statistiques [default: rapport_stats.json].
  --price_file=<price_file>                  Chemin du fichier JSON de prix (nécessaire pour certaines stats).
  --period=<period>                          Période(s) pour les stats temporelles (ex.: hourly, daily, weekly, monthly...).
  --start_date=<start_date>                  Date de début (YYYY-MM-DD) pour les stats combinées.
  --end_date=<end_date>                      Date de fin (YYYY-MM-DD) pour les stats combinées.
  --verbosity=<verbosity>                    Niveau de verbosité (silent, normal, detailed, progress) [default: normal].
"""

import sys
import json
import logging
from docopt import docopt
from data_processor import process_conversations, save_structured_data
from stats_factory import ConversationData, PriceData, StatFactory
from datetime import datetime
from utils import parse_period_key as parse_period_key_global, sort_period as sort_period_global

class ProgressTracker:
    """Gère le suivi de la progression du traitement."""
    def __init__(self, logger, total_steps=100):
        self.logger = logger
        self.total_steps = total_steps
        self.current_step = 0
        self.current_phase = ""
        
    def update(self, percentage, description):
        """Met à jour la progression avec un nouveau pourcentage et une description."""
        self.current_phase = description
        message = f"[PROGRESS] {percentage:.1f}% - {description}"
        self.logger.info(message)

def main():
    args = docopt(__doc__)

    raw_json_file = args['<raw_json_file>']
    structured_json_file = args['<structured_json_file>']
    stats_output_file = args['--stats_output_file']
    price_file = args['--price_file']
    periods = args['--period'] if args['--period'] else ['hourly']
    start_date = args['--start_date']
    end_date = args['--end_date']
    verbosity = args['--verbosity']

    # Initialiser le logger et le tracker de progression
    logger = logging.getLogger("RunScript")
    logger.setLevel(logging.DEBUG)
    # Forcer l'encodage UTF-8 pour le handler de console
    console_handler = logging.StreamHandler(
        stream=open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
    )
    # Configurer le format du logger selon le mode de verbosité
    if verbosity == "progress":
        formatter = logging.Formatter("%(message)s")  # Format simplifié pour le mode progress
        console_handler.setLevel(logging.INFO)
        # Filtre pour ne garder que les messages de progression
        class ProgressFilter(logging.Filter):
            def filter(self, record):
                return "[PROGRESS]" in record.getMessage()
        console_handler.addFilter(ProgressFilter())
    else:
        formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
        if verbosity == "silent":
            console_handler.setLevel(logging.ERROR)
        elif verbosity == "detailed":
            console_handler.setLevel(logging.DEBUG)
        else:
            console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    logger.debug("Arguments parsés via docopt: %s", args)

    # Calculer le nombre total d'étapes pour la progression
    total_steps = 100  # Base pour le traitement des conversations
    total_steps += len(periods) * len(['token_stats', 'cost_stats', 'message_stats'])  # Stats par période
    total_steps += len(['cost_stats_combined', 'text_stats', 'global_stats'])  # Stats globales
    
    progress_tracker = ProgressTracker(logger, total_steps)

    # Étape 1 : Traitement des données brutes -> structured_json_file
    logger.info("=== Étape 1 : Traitement des données brutes ===")
    def progress_callback(percentage, description):
        # Limiter cette phase à 20% de la progression totale
        adjusted_percentage = (percentage * 0.2)
        progress_tracker.update(adjusted_percentage, description)
        
    all_data = process_conversations(raw_json_file, logger, progress_callback)
    if not all_data:
        logger.error("Aucune donnée structurée générée. Terminaison du script.")
        sys.exit(1)
    save_structured_data(all_data, structured_json_file, logger)

    # Étape 2 : Charger ces données pour générer des stats
    data = ConversationData(structured_json_file).conversations
    logger.info("Nombre de conversations chargées pour les statistiques : %d", len(data))
    progress_tracker.update(25, "Données chargées pour l'analyse statistique")

    # Charger les prix (si nécessaire)
    price_data = None
    if price_file:
        price_data = PriceData(price_file).prices
        logger.debug("Fichier de prix chargé: %s", price_data)
    else:
        logger.debug("Pas de fichier de prix fourni, certaines stats peuvent être limitées.")

    # Préparer les kwargs pour la factory
    factory_kwargs = {
        'start_date': start_date,
        'end_date': end_date,
        'verbose': (verbosity == 'detailed')
    }

    # Définir nos stats
    per_period_stats = [
        'token_stats_over_time',
        'cost_stats_over_time',
        'message_stats_over_time'
    ]
    global_stats = [
        'cost_stats_combined_over_time',
        'text_stats',
        'global_stats'
    ]

    results = {}

    # Stats par période (25-50%)
    current_progress = 25
    progress_per_stat = 25 / (len(periods) * len(per_period_stats))
    
    for period in periods:
        logger.info("=== Traitement de la période : %s ===", period)
        factory_kwargs['period'] = period
        for stat_name in per_period_stats:
            current_progress += progress_per_stat
            progress_tracker.update(current_progress, f"Calcul de {stat_name} pour la période {period}")
            logger.info("--- Calcul de la statistique : %s (Période: %s) ---", stat_name, period)
            try:
                stat = StatFactory.get_stat(stat_name, data, price_data=price_data, **factory_kwargs)
            except ValueError as ve:
                logger.error("Erreur d'instanciation: %s", ve)
                continue
            try:
                result = stat.calculate()
                if stat_name not in results:
                    results[stat_name] = {}
                results[stat_name][period] = result
                logger.debug("Statistique '%s' (Période: %s) calculée avec succès.", stat_name, period)
            except Exception as e:
                logger.error("Erreur de calcul '%s' (Période: %s): %s", stat_name, period, e)
                continue

    # Stats globales
    # Répartition des pourcentages pour les stats globales (50-100%)
    progress_ranges = {
        'cost_stats_combined_over_time': (50.0, 65.0),  # 15%
        'text_stats': (65.0, 82.5),                     # 17.5%
        'global_stats': (82.5, 100.0)                   # 17.5%
    }
    
    for stat_name in global_stats:
        start_progress, end_progress = progress_ranges.get(stat_name, (0, 0))
        progress_tracker.update(start_progress, f"Starting calculation of {stat_name}")
        logger.info("--- Calcul de la statistique globale : %s ---", stat_name)
        try:
            stat = StatFactory.get_stat(stat_name, data, price_data=price_data, **factory_kwargs)
        except ValueError as ve:
            logger.error("Erreur d'instanciation stat globale: %s", ve)
            continue
        try:
            result = stat.calculate()
            results[stat_name] = result
            logger.debug("Statistique globale '%s' calculée avec succès.", stat_name)
        except Exception as e:
            logger.error("Erreur de calcul stat globale '%s': %s", stat_name, e)
            raise

    # Afficher les résultats (selon le niveau de verbosité)
    if verbosity == "detailed":
        logger.info("=== Résultats de Toutes les Statistiques ===")
        for stat_name, result in results.items():
            if stat_name in per_period_stats:
                logger.info("\nStat '%s' (découpée par période):", stat_name)
                for period_key in result:
                    logger.info(" Période: %s", period_key)
                    logger.info("  -> %s", json.dumps(result[period_key], indent=2))
            else:
                logger.info("\nStat globale '%s': %s", stat_name, json.dumps(result, indent=2))

    # Sauvegarder les résultats
    progress_tracker.update(100, "Sauvegarde des résultats finaux")
    logger.info("Sauvegarde des résultats dans %s ...", stats_output_file)
    try:
        sorted_results = {}
        for stat_name in sorted(results.keys()):
            if stat_name in per_period_stats:
                sorted_results[stat_name] = {}
                for pkey in sorted(results[stat_name].keys(), key=lambda p: parse_period_key_global(p, p)):
                    sorted_results[stat_name][pkey] = results[stat_name][pkey]
            else:
                sorted_results[stat_name] = results[stat_name]
        with open(stats_output_file, 'w', encoding='utf-8') as f:
            json.dump(sorted_results, f, ensure_ascii=False, indent=4)
        logger.info("Résultats sauvegardés avec succès dans %s", stats_output_file)
    except Exception as e:
        logger.error("Erreur lors de la sauvegarde des résultats: %s", e)

if __name__ == "__main__":
    main()
