# String Processing Functions

This module provides a collection of utility functions for processing text extracted from documents.

## Available Functions

The following string processing functions are available:

1. **extract_uppercase_words** - Extract all words that contain only uppercase letters
2. **extract_integers** - Extract all words that contain only integer values
3. **extract_capitalized_words** - Extract all words that start with a capital letter
4. **extract_float_values** - Extract all float values with decimal point
5. **extract_float_values_with_comma** - Extract all float values with dot or comma
6. **extract_alphanumeric_words** - Extract all words that contain only alphanumeric characters
7. **extract_dates** - Extract dates in various formats
8. **convert_date_format** - Convert dates to DD-MM-YYYY format
9. **remove_special_characters** - Remove all special characters
10. **extract_words_starting_with_number** - Extract words starting with a number
11. **extract_words_ending_with_number** - Extract words ending with a number
12. **extract_mixed_case_words** - Extract words with mixed case
13. **convert_to_lowercase** - Convert all text to lowercase
14. **convert_to_uppercase** - Convert all text to uppercase
15. **convert_to_title_case** - Capitalize the first letter of each word
16. **remove_punctuation** - Remove all punctuation
17. **normalize_spaces** - Replace multiple spaces with a single space
18. **standardize_whitespace** - Trim spaces from start and end
19. **format_numeric_values** - Convert numeric values to fixed decimal format

## Registering Functions in the Database

To register these functions in the database, run:

```
python manage.py shell < pdf_app/scripts/register_string_functions.py
```

## Usage in Templates

Once registered, you can select these functions from the dropdown in the field configuration UI.

## Direct Usage in Code

You can also use these functions directly in your code:

```python
from pdf_app.utils.string_processing_functions import extract_dates

# Process some text
text = "Meeting scheduled for 25/04/2023 and follow-up on 2023-05-15"
dates = extract_dates(text)
print(dates)  # Output: "25/04/2023 2023-05-15"
```

Each function includes detailed docstrings explaining how it works, what input it accepts, and what limitations it has. 