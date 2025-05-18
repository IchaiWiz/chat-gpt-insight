import json
from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod
from dateutil import parser as date_parser
import nltk

class ConversationData:
    """Loads conversation data from a JSON file."""
    def __init__(self, json_file: str):
        self.conversations = self.load_data(json_file)

    @staticmethod
    def load_data(json_file: str) -> List[Dict[str, Any]]:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except Exception as e:
            print(f"Error loading JSON file: {e}")
            return []

class PriceData:
    """Loads pricing data from a JSON file."""
    def __init__(self, price_file: str):
        self.prices = self.load_prices(price_file)

    @staticmethod
    def load_prices(price_file: str) -> Dict[str, Any]:
        try:
            with open(price_file, 'r', encoding='utf-8') as f:
                prices = json.load(f)
            return prices
        except Exception as e:
            print(f"Error loading price file: {e}")
            return {}

class BaseStat(ABC):
    """Base class for statistics."""
    def __init__(self, verbose: bool = False, logger=None):
        self.verbose = verbose
        self.logger = logger

    def log_progress(self, percentage: float, description: str):
        """Emits a progress message if a logger is available."""
        if self.logger:
            self.logger.info(f"[PROGRESS] {percentage:.1f}% - {description}")

    @abstractmethod
    def calculate(self) -> Any:
        pass

class PeriodHelper:
    """Tools for managing time periods."""
    @staticmethod
    def calculate_period_key(date: datetime, period: str) -> str:
        if period == 'hourly':
            return date.strftime('%Y-%m-%d %H:00')
        elif period == 'daily':
            return date.strftime('%Y-%m-%d')
        elif period == 'weekly':
            return date.strftime('%Y-%U')
        elif period == 'monthly':
            return date.strftime('%Y-%m')
        elif period == 'quarterly':
            quarter = (date.month - 1) // 3 + 1
            return f"{date.year}-Q{quarter}"
        elif period == 'semi-annually':
            half = 1 if date.month <= 6 else 2
            return f"{date.year}-H{half}"
        elif period == 'yearly':
            return date.strftime('%Y')
        else:
            raise ValueError("Invalid period.")

    @staticmethod
    def parse_period_key(key: str, period: str) -> datetime:
        try:
            if period == 'hourly':
                return datetime.strptime(key, '%Y-%m-%d %H:%M')
            elif period == 'daily':
                return datetime.strptime(key, '%Y-%m-%d')
            elif period == 'weekly':
                year, week = key.split('-')
                return datetime.strptime(f'{year} {week} 1', '%Y %U %w')
            elif period == 'monthly':
                return datetime.strptime(key, '%Y-%m')
            elif period == 'quarterly':
                year, quarter = key.split('-Q')
                month = (int(quarter) - 1) * 3 + 1
                return datetime(year=int(year), month=month, day=1)
            elif period == 'semi-annually':
                year, half = key.split('-H')
                month = 1 if half == '1' else 7
                return datetime(year=int(year), month=month, day=1)
            elif period == 'yearly':
                return datetime.strptime(key, '%Y')
        except Exception:
            return datetime.min

class BaseStatWithPeriod(BaseStat):
    """Base class for period-based statistics."""
    def __init__(self, data: List[Dict[str, Any]], period: str, verbose: bool=False, logger=None):
        super().__init__(verbose, logger)
        self.data = data
        self.period = period.lower()

    def calculate_period_key(self, date: datetime) -> str:
        return PeriodHelper.calculate_period_key(date, self.period)

    def parse_period_key(self, key: str) -> datetime:
        return PeriodHelper.parse_period_key(key, self.period)

class TokenStatsOverTime(BaseStatWithPeriod):
    """Counts input and output tokens per period."""
    def calculate(self) -> Dict[str, Dict[str, int]]:
        stats = defaultdict(lambda: {"input_tokens": 0, "output_tokens": 0})
        total_convs = len(self.data)
        
        for idx, conv in enumerate(self.data, 1):
            create_time = conv.get('create_time')
            if not create_time:
                continue
            date = datetime.fromtimestamp(create_time)
            period_key = self.calculate_period_key(date)

            msg_count = len(conv.get('messages', []))
            for msg_idx, msg in enumerate(conv.get('messages', []), 1):
                role = msg.get('role', 'unknown')
                token_count = msg.get('additional_info', {}).get('token_count', 0)
                if role == 'user':
                    stats[period_key]["input_tokens"] += token_count
                elif role in ['assistant', 'tool']:
                    stats[period_key]["output_tokens"] += token_count
                
                # Detailed progress per message
                progress = ((idx - 1) / total_convs) + ((msg_idx / msg_count) / total_convs)
                self.log_progress(46.9 + (progress * 2), 
                    f"Token Analysis - Processing conversation {idx}/{total_convs}, message {msg_idx}/{msg_count}")

        return dict(sorted(stats.items(), key=lambda x: self.parse_period_key(x[0])))

class CostStatsOverTime(BaseStatWithPeriod):
    """Calculates input and output costs per period."""
    def __init__(self, data: List[Dict[str, Any]], price_data: Dict[str, Any], period: str, verbose: bool=False, logger=None):
        super().__init__(data, period, verbose, logger)
        self.price_data = price_data
        self.default_model = self.price_data.get("default_model", "gpt-4o")

    def calculate(self) -> Dict[str, Any]:
        costs_over_time = defaultdict(lambda: {"input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0})
        costs_by_model = defaultdict(lambda: {
            "input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0,
            "input_tokens": 0, "output_tokens": 0, "total_tokens": 0
        })
        costs_by_image = defaultdict(float)
        total_cost_ref = [0.0]
        total_convs = len(self.data)

        for idx, conv in enumerate(self.data, 1):
            create_time = conv.get('create_time')
            if not create_time:
                continue
            date = datetime.fromtimestamp(create_time)
            period_key = self.calculate_period_key(date)

            msg_count = len(conv.get('messages', []))
            for msg_idx, msg in enumerate(conv.get('messages', []), 1):
                model = msg.get('model_slug', self.default_model)
                role = msg.get('role', 'unknown')
                token_count = msg.get('additional_info', {}).get('token_count', 0)
                content_type = msg.get('content_type', 'text')

                # Detailed progress per message
                progress = ((idx - 1) / total_convs) + ((msg_idx / msg_count) / total_convs)
                self.log_progress(48.9 + (progress * 2), 
                    f"Cost Calculation - Processing conversation {idx}/{total_convs}, message {msg_idx}/{msg_count}")

                model_prices = self.price_data.get("models", {}).get(
                    model,
                    self.price_data.get("models", {}).get(self.default_model, {})
                )

                # Token cost
                if role == 'user':
                    price_per_token = self.get_price_per_token(model_prices, content_type, "input")
                    cost = (token_count / 1_000_000) * price_per_token
                    costs_over_time[period_key]["input_cost"] += cost
                    costs_by_model[model]["input_cost"] += cost
                    costs_by_model[model]["input_tokens"] += token_count
                elif role in ['assistant', 'tool']:
                    price_per_token = self.get_price_per_token(model_prices, content_type, "output")
                    cost = (token_count / 1_000_000) * price_per_token
                    costs_over_time[period_key]["output_cost"] += cost
                    costs_by_model[model]["output_cost"] += cost
                    costs_by_model[model]["output_tokens"] += token_count
                else:
                    cost = 0.0

                costs_by_model[model]["total_tokens"] += token_count
                costs_over_time[period_key]["total_cost"] += cost
                costs_by_model[model]["total_cost"] += cost
                total_cost_ref[0] += cost

                # Image cost
                self.process_images(msg, role, period_key, model, costs_over_time, costs_by_model, costs_by_image, total_cost_ref)

        total_cost = total_cost_ref[0]
        return {
            "total_cost": round(total_cost, 4),
            "costs_by_model": dict(costs_by_model),
            "costs_by_image": dict(costs_by_image),
            "costs_over_time": dict(sorted(costs_over_time.items(), key=lambda x: self.parse_period_key(x[0]))),
            "message_stats_over_time": {}
        }

    def get_price_per_token(self, model_prices: Dict[str, float], content_type: str, direction: str) -> float:
        if f"{direction}_audio" in model_prices and content_type == 'audio':
            return model_prices[f"{direction}_audio"]
        return model_prices.get(direction, 2.50 if direction == "input" else 10.00)

    def process_images(self, msg: Dict[str, Any], role: str, period_key: str, model: str,
                       costs_over_time: defaultdict, costs_by_model: defaultdict,
                       costs_by_image: defaultdict, total_cost_ref: list):
        images = msg.get('additional_info', {}).get('images', [])
        number_of_images = len(images)
        if number_of_images > 0:
            image_price = self.price_data.get("images", {}).get("dalle.text2im", 0.020)
            image_cost = number_of_images * image_price
            costs_by_image['dalle.text2im'] += image_cost
            if role == 'user':
                costs_over_time[period_key]["input_cost"] += image_cost
                costs_by_model[model]["input_cost"] += image_cost
            else:
                costs_over_time[period_key]["output_cost"] += image_cost
                costs_by_model[model]["output_cost"] += image_cost
            costs_by_model[model]["total_cost"] += image_cost
            costs_over_time[period_key]["total_cost"] += image_cost
            total_cost_ref[0] += image_cost

class MessageStatsOverTime(BaseStatWithPeriod):
    """Counts the number of user/assistant/tool messages per period."""
    def calculate(self) -> Dict[str, Dict[str, int]]:
        stats = defaultdict(lambda: {"user_messages": 0, "assistant_messages": 0, "tool_messages": 0, "total_messages": 0})
        total_convs = len(self.data)
        
        for idx, conv in enumerate(self.data, 1):
            create_time = conv.get('create_time')
            if not create_time:
                continue
            date = datetime.fromtimestamp(create_time)
            period_key = self.calculate_period_key(date)

            msg_count = len(conv.get('messages', []))
            for msg_idx, msg in enumerate(conv.get('messages', []), 1):
                role = msg.get('role', 'unknown')
                if role == 'user':
                    stats[period_key]["user_messages"] += 1
                elif role == 'assistant':
                    stats[period_key]["assistant_messages"] += 1
                elif role == 'tool':
                    stats[period_key]["tool_messages"] += 1
                stats[period_key]["total_messages"] += 1

                # Detailed progress per message
                progress = ((idx - 1) / total_convs) + ((msg_idx / msg_count) / total_convs)
                self.log_progress(50.8 + (progress * 2), 
                    f"Message Analysis - Processing conversation {idx}/{total_convs}, message {msg_idx}/{msg_count}")

        return dict(sorted(stats.items(), key=lambda x: self.parse_period_key(x[0])))

class CostStatsCombinedOverTime(CostStatsOverTime):
    """Combines model costs and image costs over the period, filterable by start/end date."""
    def __init__(self, data: List[Dict[str, Any]], price_data: Dict[str, Any],
                 period: str, start_date: Optional[str]=None, end_date: Optional[str]=None,
                 verbose: bool=False, logger=None):
        super().__init__(data, price_data, period, verbose, logger)
        self.start_date = date_parser.parse(start_date) if start_date else None
        self.end_date = date_parser.parse(end_date) if end_date else None

    def calculate(self) -> Dict[str, Any]:
        filtered_data = self.filter_data_by_date()
        total = len(filtered_data)
        total_messages = sum(len(conv.get('messages', [])) for conv in filtered_data)
        current_message = 0
        
        for idx, conv in enumerate(filtered_data, 1):
            for msg in conv.get('messages', []):
                current_message += 1
                progress = 50.0 + ((current_message / total_messages) * 15.0)
                self.log_progress(progress,
                    f"Combined Cost Analysis - Processing conversation {idx}/{total}, message {current_message}/{total_messages}")
        self.data = filtered_data
        return super().calculate()

    def filter_data_by_date(self) -> List[Dict[str, Any]]:
        filtered_data = []
        for conv in self.data:
            create_time = conv.get('create_time')
            if not create_time:
                continue
            date = datetime.fromtimestamp(create_time)
            if self.start_date and date < self.start_date:
                continue
            if self.end_date and date > self.end_date:
                continue
            filtered_data.append(conv)
        return filtered_data

class TextStats(BaseStat):
    """Calculates number of words, sentences, characters, tokens, etc."""
    def __init__(self, data: List[Dict[str, Any]], verbose: bool=False, logger=None):
        super().__init__(verbose, logger)
        self.data = data

    def calculate(self) -> Dict[str, Any]:
        total_words, total_sentences, total_chars, total_tokens = 0, 0, 0, 0
        conv_word_counts = []
        total_convs = len(self.data)

        for idx, conv in enumerate(self.data, 1):
            word_count_conv = 0
            msg_count = len(conv.get('messages', []))
            
            for msg_idx, msg in enumerate(conv.get('messages', []), 1):
                content = msg.get('additional_info', {}).get('text', '')
                if not content:
                    continue
                    
                # Detailed progress per message and operation
                base_progress = ((idx - 1) / total_convs) + ((msg_idx / msg_count) / total_convs)
                
                # Tokenization (1/3 of time) - 65.0 to 70.8
                self.log_progress(65.0 + (base_progress * 5.8),
                    f"Text Tokenization - Processing conversation {idx}/{total_convs}, message {msg_idx}/{msg_count}")
                words = nltk.word_tokenize(content)
                
                # Sentence analysis (1/3 of time) - 70.8 to 76.7
                self.log_progress(70.8 + (base_progress * 5.9),
                    f"Sentence Analysis - Processing conversation {idx}/{total_convs}, message {msg_idx}/{msg_count}")
                sentences = nltk.sent_tokenize(content)
                
                # Counting and statistics (1/3 of time) - 76.7 to 82.5
                self.log_progress(76.7 + (base_progress * 5.8),
                    f"Statistics Calculation - Processing conversation {idx}/{total_convs}, message {msg_idx}/{msg_count}")
                
                words = nltk.word_tokenize(content)
                wc = len(words)
                total_words += wc
                word_count_conv += wc

                sentences = nltk.sent_tokenize(content)
                total_sentences += len(sentences)
                total_chars += len(content)

                tokens = msg.get('additional_info', {}).get('token_count', 0)
                total_tokens += tokens

            conv_word_counts.append(word_count_conv)

        avg_words = (sum(conv_word_counts)/len(conv_word_counts)) if conv_word_counts else 0
        return {
            "total_words": total_words,
            "total_sentences": total_sentences,
            "total_characters": total_chars,
            "total_tokens": total_tokens,
            "average_words_per_conversation": round(avg_words)
        }

class GlobalStats(BaseStat):
    """Calculates global statistics (words, tokens, costs...) across all conversations."""
    def __init__(self, data: List[Dict[str, Any]], price_data: Dict[str, Any], verbose: bool=False, logger=None):
        super().__init__(verbose, logger)
        self.data = data
        self.price_data = price_data
        self.default_model = self.price_data.get("default_model", "gpt-4o")

    def calculate(self) -> Dict[str, Any]:
        total_conversations = len(self.data)
        total_words = 0
        total_tokens_in = 0
        total_tokens_out = 0
        total_cost = 0.0
        conv_word_counts = []

        for idx, conv in enumerate(self.data, 1):
            wconv = 0
            msg_count = len(conv.get('messages', []))
            
            for msg_idx, msg in enumerate(conv.get('messages', []), 1):
                # Detailed progress per message and operation
                base_progress = ((idx - 1) / total_conversations) + ((msg_idx / msg_count) / total_conversations)
                
                # Text analysis (1/3 of time) - 82.5 to 88.3
                self.log_progress(82.5 + (base_progress * 5.8),
                    f"Text Analysis - Processing conversation {idx}/{total_conversations}, message {msg_idx}/{msg_count}")
                content = msg.get('additional_info', {}).get('text', '')
                words = nltk.word_tokenize(content)
                
                # Token calculation (1/3 of time) - 88.3 to 94.2
                self.log_progress(88.3 + (base_progress * 5.9),
                    f"Token Calculation - Processing conversation {idx}/{total_conversations}, message {msg_idx}/{msg_count}")
                token_count = msg.get('additional_info', {}).get('token_count', 0)
                
                # Cost calculation (1/3 of time) - 94.2 to 100.0
                self.log_progress(94.2 + (base_progress * 5.8),
                    f"Cost Calculation - Processing conversation {idx}/{total_conversations}, message {msg_idx}/{msg_count}")
                
                content = msg.get('additional_info', {}).get('text', '')
                words = nltk.word_tokenize(content)
                wc = len(words)
                total_words += wc
                wconv += wc

                token_count = msg.get('additional_info', {}).get('token_count', 0)
                role = msg.get('role', 'unknown')
                if role == 'user':
                    total_tokens_in += token_count
                else:
                    total_tokens_out += token_count

                model = msg.get('model_slug', self.default_model)
                model_prices = self.price_data.get("models", {}).get(
                    model,
                    self.price_data.get("models", {}).get(self.default_model, {})
                )

                if role == 'user':
                    price_per_token = self.get_price_per_token(model_prices, msg.get('content_type'), "input")
                elif role in ['assistant', 'tool']:
                    price_per_token = self.get_price_per_token(model_prices, msg.get('content_type'), "output")
                else:
                    price_per_token = 0.0

                cost = (token_count / 1_000_000) * price_per_token

                # Images processing
                images = msg.get('additional_info', {}).get('images', [])
                nb_img = len(images)
                if nb_img > 0:
                    img_price = self.price_data.get("images", {}).get("dalle.text2im", 0.020)
                    cost += nb_img * img_price

                total_cost += cost

            conv_word_counts.append(wconv)

        avg_words_conv = (sum(conv_word_counts)/total_conversations) if total_conversations else 0
        return {
            "total_conversations": total_conversations,
            "total_words": total_words,
            "total_tokens_in": total_tokens_in,
            "total_tokens_out": total_tokens_out,
            "average_words_per_conversation": round(avg_words_conv),
            "total_cost": round(total_cost, 4)
        }

    def get_price_per_token(self, model_prices: Dict[str, float], content_type: str, direction: str) -> float:
        if f"{direction}_audio" in model_prices and content_type == 'audio':
            return model_prices[f"{direction}_audio"]
        return model_prices.get(direction, 2.50 if direction == "input" else 10.00)

class StatFactory:
    """Statistics factory."""
    @staticmethod
    def get_stat(stat_name: str, data: List[Dict[str, Any]], price_data: Optional[Dict[str, Any]]=None, **kwargs) -> BaseStat:
        verbose = kwargs.get('verbose', False)
        period = kwargs.get('period', 'monthly')
        logger = kwargs.get('logger', None)

        if stat_name == 'token_stats_over_time':
            return TokenStatsOverTime(data, period, verbose, logger)
        elif stat_name == 'cost_stats_over_time':
            if not price_data:
                raise ValueError("Price data is required for 'cost_stats_over_time'.")
            return CostStatsOverTime(data, price_data, period, verbose, logger)
        elif stat_name == 'message_stats_over_time':
            return MessageStatsOverTime(data, period, verbose, logger)
        elif stat_name == 'cost_stats_combined_over_time':
            if not price_data:
                raise ValueError("Price data is required for 'cost_stats_combined_over_time'.")
            start_date = kwargs.get('start_date')
            end_date = kwargs.get('end_date')
            return CostStatsCombinedOverTime(data, price_data, period, start_date, end_date, verbose, logger)
        elif stat_name == 'text_stats':
            return TextStats(data, verbose, logger)
        elif stat_name == 'global_stats':
            if not price_data:
                raise ValueError("Price data is required for 'global_stats'.")
            return GlobalStats(data, price_data, verbose, logger)
        else:
            raise ValueError(f"Unknown statistic: {stat_name}")
