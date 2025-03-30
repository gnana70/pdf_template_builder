"""
String processing utility functions for template extraction.
These functions process input strings and return modified strings based on specific patterns.
"""
import re
import datetime


def extract_uppercase_words(input_string):
    """
    Extract all words that contain only uppercase letters.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of uppercase words
        
    Works with:
        - Words containing only uppercase letters (e.g., "NASA", "FBI")
        
    Doesn't work with:
        - Words with mixed case (e.g., "JavaScript")
        - Words with numbers or special characters (e.g., "NASA2023")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Match words containing only uppercase letters A-Z
    pattern = r'\b[A-Z]+\b'
    matches = re.findall(pattern, input_string)
    
    return " ".join(matches)


def extract_integers(input_string):
    """
    Extract all words that contain only integer values.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of integer values
        
    Works with:
        - Words containing only digits (e.g., "123", "42")
        
    Doesn't work with:
        - Words with decimal points (e.g., "123.45")
        - Words with alphanumeric characters (e.g., "123ABC")
        - Words with special characters (e.g., "$100")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Match words containing only digits
    pattern = r'\b\d+\b'
    matches = re.findall(pattern, input_string)
    
    return " ".join(matches)


def extract_capitalized_words(input_string):
    """
    Extract all words that start with a capital letter.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of capitalized words
        
    Works with:
        - Words starting with a capital letter (e.g., "John", "Monday")
        
    Doesn't work with:
        - All uppercase words (still included, but might not be what you want)
        - Words starting with lowercase (e.g., "apple")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Match words starting with uppercase letter followed by zero or more letters
    pattern = r'\b[A-Z][a-zA-Z]*\b'
    matches = re.findall(pattern, input_string)
    
    return " ".join(matches)


def extract_float_values(input_string):
    """
    Extract all words that represent float values (must have a decimal point).
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of float values
        
    Works with:
        - Numbers with decimal points (e.g., "123.45", "0.5")
        
    Doesn't work with:
        - Integer values without decimal points (e.g., "123")
        - Numbers with commas as decimal separators (e.g., "123,45")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Match floating point numbers with a decimal point
    pattern = r'\b\d+\.\d+\b'
    matches = re.findall(pattern, input_string)
    
    return " ".join(matches)


def extract_float_values_with_comma(input_string):
    """
    Extract all words that represent float values (with either dot or comma as decimal separator).
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of float values (dots and commas preserved as in original)
        
    Works with:
        - Numbers with decimal points (e.g., "123.45")
        - Numbers with commas as decimal separators (e.g., "123,45")
        
    Doesn't work with:
        - Integer values without decimal separators (e.g., "123")
        - Numbers with both comma and dot for different purposes (e.g., "1,234.56")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Match floating point numbers with either dot or comma as decimal separator
    pattern = r'\b\d+[.,]\d+\b'
    matches = re.findall(pattern, input_string)
    
    return " ".join(matches)


def extract_alphanumeric_words(input_string):
    """
    Extract all words that contain only alphanumeric characters.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of alphanumeric words
        
    Works with:
        - Words containing only letters and numbers (e.g., "ABC123", "User42")
        
    Doesn't work with:
        - Words containing special characters (e.g., "User@123", "test-123")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Match words containing only alphanumeric characters
    pattern = r'\b[a-zA-Z0-9]+\b'
    matches = re.findall(pattern, input_string)
    
    return " ".join(matches)


def extract_dates(input_string):
    """
    Extract dates in various formats from the input string.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of extracted dates in their original format
        
    Works with:
        - ISO format dates (e.g., "2023-04-25")
        - US format dates (e.g., "04/25/2023", "04-25-2023")
        - European format dates (e.g., "25/04/2023", "25-04-2023")
        - Date with month name (e.g., "25 April 2023", "April 25, 2023")
        
    Doesn't work with:
        - Dates without year (e.g., "25/04")
        - Non-standard date formats
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    patterns = [
        r'\b\d{4}-\d{1,2}-\d{1,2}\b',  # ISO format: 2023-04-25
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b',  # DD/MM/YYYY or MM/DD/YYYY
        r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b',  # DD Month YYYY
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:[,\s]+)?\d{4}\b',  # Month DD, YYYY
    ]
    
    # Combine all patterns
    combined_pattern = '|'.join(patterns)
    matches = re.findall(combined_pattern, input_string, re.IGNORECASE)
    
    return " ".join(matches)


def convert_date_format(input_string):
    """
    Convert dates in various formats to DD-MM-YYYY format.
    
    Args:
        input_string (str): The input string containing dates
        
    Returns:
        str: String with dates converted to DD-MM-YYYY format
        
    Works with:
        - ISO format dates (e.g., "2023-04-25")
        - US format dates (e.g., "04/25/2023", "04-25-2023")
        - European format dates (e.g., "25/04/2023", "25-04-2023")
        - Date with month name (e.g., "25 April 2023", "April 25, 2023")
        
    Doesn't work with:
        - Dates without year (e.g., "25/04")
        - Non-standard date formats
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # We'll try different patterns and parse them
    result = input_string
    
    # ISO format: YYYY-MM-DD
    pattern1 = r'\b(\d{4})-(\d{1,2})-(\d{1,2})\b'
    result = re.sub(pattern1, lambda m: f"{int(m.group(3)):02d}-{int(m.group(2)):02d}-{m.group(1)}", result)
    
    # DD/MM/YYYY or MM/DD/YYYY format
    # Note: This is ambiguous, we'll assume European format (DD/MM/YYYY)
    pattern2 = r'\b(\d{1,2})[/](\d{1,2})[/](\d{4})\b'
    result = re.sub(pattern2, lambda m: f"{int(m.group(1)):02d}-{int(m.group(2)):02d}-{m.group(3)}", result)
    
    # DD-MM-YYYY or MM-DD-YYYY format
    # Note: This is ambiguous, we'll assume European format (DD-MM-YYYY)
    pattern3 = r'\b(\d{1,2})-(\d{1,2})-(\d{4})\b'
    result = re.sub(pattern3, lambda m: f"{int(m.group(1)):02d}-{int(m.group(2)):02d}-{m.group(3)}", result)
    
    # Month names processing
    month_names = {
        'jan': 1, 'january': 1,
        'feb': 2, 'february': 2,
        'mar': 3, 'march': 3,
        'apr': 4, 'april': 4,
        'may': 5, 'may': 5,
        'jun': 6, 'june': 6,
        'jul': 7, 'july': 7,
        'aug': 8, 'august': 8,
        'sep': 9, 'september': 9,
        'oct': 10, 'october': 10,
        'nov': 11, 'november': 11,
        'dec': 12, 'december': 12
    }
    
    # DD Month YYYY format
    pattern4 = r'\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b'
    
    def replace_month_format1(match):
        day = int(match.group(1))
        month = month_names[match.group(2).lower()]
        year = match.group(3)
        return f"{day:02d}-{month:02d}-{year}"
    
    result = re.sub(pattern4, replace_month_format1, result, flags=re.IGNORECASE)
    
    # Month DD, YYYY format
    pattern5 = r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+)?(\d{4})\b'
    
    def replace_month_format2(match):
        month = month_names[match.group(1).lower()]
        day = int(match.group(2))
        year = match.group(3)
        return f"{day:02d}-{month:02d}-{year}"
    
    result = re.sub(pattern5, replace_month_format2, result, flags=re.IGNORECASE)
    
    return result


def remove_special_characters(input_string):
    """
    Remove all special characters from the input string.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: String with special characters removed
        
    Works with:
        - Any string containing special characters
        
    Doesn't remove:
        - Alphanumeric characters (letters and numbers)
        - Spaces
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Keep only alphanumeric characters and spaces
    result = re.sub(r'[^a-zA-Z0-9\s]', '', input_string)
    
    return result


def extract_words_starting_with_number(input_string):
    """
    Extract words that start with a number.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of words starting with a number
        
    Works with:
        - Words starting with a number (e.g., "100Days", "3DPrint")
        
    Doesn't work with:
        - Words not starting with a number (e.g., "Day100")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Match words that start with a digit followed by at least one letter
    pattern = r'\b\d+[a-zA-Z]+\w*\b'
    matches = re.findall(pattern, input_string)
    
    return " ".join(matches)


def extract_words_ending_with_number(input_string):
    """
    Extract words that end with a number.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of words ending with a number
        
    Works with:
        - Words ending with a number (e.g., "Data3", "Task1")
        
    Doesn't work with:
        - Words not ending with a number (e.g., "3Data")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Match words that have at least one letter followed by one or more digits at the end
    pattern = r'\b[a-zA-Z]+\w*\d+\b'
    matches = re.findall(pattern, input_string)
    
    return " ".join(matches)


def extract_mixed_case_words(input_string):
    """
    Extract words that have mixed case (not all uppercase or all lowercase).
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Space-separated string of mixed case words
        
    Works with:
        - Words with mixed case (e.g., "JavaScript", "iPhone")
        
    Doesn't work with:
        - Words that are all uppercase (e.g., "NASA")
        - Words that are all lowercase (e.g., "python")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Split input into words
    words = input_string.split()
    
    # Filter words that have mixed case (not all uppercase or all lowercase)
    mixed_case_words = [word for word in words if word.lower() != word and word.upper() != word]
    
    return " ".join(mixed_case_words)


def convert_to_lowercase(input_string):
    """
    Convert all text to lowercase.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Lowercase version of the input string
        
    Works with:
        - Any string containing uppercase characters
        
    Note:
        - This function preserves all non-alphabetic characters
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    return input_string.lower()


def convert_to_uppercase(input_string):
    """
    Convert all text to uppercase.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Uppercase version of the input string
        
    Works with:
        - Any string containing lowercase characters
        
    Note:
        - This function preserves all non-alphabetic characters
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    return input_string.upper()


def convert_to_title_case(input_string):
    """
    Capitalize the first letter of each word (Title Case).
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: Title case version of the input string
        
    Works with:
        - Any string
        
    Note:
        - This function capitalizes the first letter of each word,
          including small words like 'a', 'an', 'the', etc.
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    return input_string.title()


def remove_punctuation(input_string):
    """
    Remove all punctuation from the input string.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: String with punctuation removed
        
    Works with:
        - Any string containing punctuation marks
        
    Note:
        - This function removes standard punctuation characters but retains
          alphanumeric characters, spaces, and other symbols
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Remove all punctuation characters
    result = re.sub(r'[^\w\s]', '', input_string)
    
    return result


def normalize_spaces(input_string):
    """
    Replace multiple spaces with a single space.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: String with normalized spaces
        
    Works with:
        - Any string containing multiple consecutive spaces
        
    Note:
        - This function preserves a single space between words but removes extra spaces
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Replace multiple spaces with a single space
    result = re.sub(r'\s+', ' ', input_string)
    
    return result


def standardize_whitespace(input_string):
    """
    Standardize whitespace by trimming spaces from start and end and normalizing internal spaces.
    
    Args:
        input_string (str): The input string to process
        
    Returns:
        str: String with standardized whitespace
        
    Works with:
        - Any string with leading/trailing whitespace
        - Any string with multiple consecutive spaces
        
    Note:
        - This function removes all leading and trailing whitespace
        - This function replaces multiple consecutive spaces with a single space
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    # Trim leading and trailing whitespace and normalize internal spaces
    result = re.sub(r'\s+', ' ', input_string.strip())
    
    return result


def format_numeric_values(input_string, decimal_places=2):
    """
    Convert all numeric values to a fixed decimal format.
    
    Args:
        input_string (str): The input string to process
        decimal_places (int, optional): Number of decimal places to use. Defaults to 2.
        
    Returns:
        str: String with numeric values formatted to the specified decimal places
        
    Works with:
        - Integer values (e.g., "123" -> "123.00")
        - Float values (e.g., "123.456" -> "123.46")
        
    Doesn't work with:
        - Non-numeric strings
        - Numbers with commas as thousands separators (e.g., "1,234")
    """
    if not input_string or not isinstance(input_string, str):
        return ""
    
    def format_number(match):
        number = match.group(0)
        try:
            formatted = f"{float(number):.{decimal_places}f}"
            return formatted
        except ValueError:
            return number
    
    # Pattern to match numbers (integers or floats)
    pattern = r'\b\d+(?:\.\d+)?\b'
    result = re.sub(pattern, format_number, input_string)
    
    return result 