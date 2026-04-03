import google.generativeai as genai
from django.conf import settings
import json
import random
import csv
import os

# Check if Gemini API is configured
DRINK_AI_AVAILABLE = bool(settings.GEMINI_API_KEY)

if DRINK_AI_AVAILABLE:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')


def _load_catalog():
    """
    Load and cache the ingredient catalog from CSVs (read-only).
    Returns a dict with 'syrups', 'sodas', 'addins' lists.
    """
    base_dir = settings.BASE_DIR

    def read_names_from_csv(filename):
        filepath = os.path.join(base_dir, 'backend', filename)
        names = []
        with open(filepath, mode='r', newline='') as file:
            reader = csv.reader(file)
            next(reader)  # Skip header
            for row in reader:
                if len(row) > 1:
                    names.append(row[1].lower())  # name is in column 1
        return names

    return {
        'syrups': read_names_from_csv('Syrups.csv'),
        'sodas': read_names_from_csv('Sodas.csv'),
        'addins': read_names_from_csv('AddIns.csv'),
    }


def _validate_ingredients(syrups, soda, addins, catalog):
    """
    Validate that all returned ingredients exist in the catalog.
    Returns True if all valid, False otherwise.
    """
    syrups_set = {s.lower() for s in syrups}
    addins_set = {a.lower() for a in addins}
    soda_lower = soda.lower()

    # Check syrups
    for s in syrups_set:
        if s not in catalog['syrups']:
            return False

    # Check soda
    if soda_lower not in catalog['sodas']:
        return False

    # Check addins
    for a in addins_set:
        if a not in catalog['addins']:
            return False

    return True


def _generate_random_drink(catalog):
    """
    Fallback: generate a random valid drink from the catalog.
    """
    soda = [random.choice(catalog['sodas'])]
    num_syrups = random.randint(1, 3)
    syrups = [random.choice(catalog['syrups']) for _ in range(num_syrups)]

    num_addins = random.randint(0, 2)
    addins = [random.choice(catalog['addins']) for _ in range(num_addins)]

    return {
        'syrups': syrups,
        'soda': soda,
        'addins': addins,
    }


def generate_soda(user_preferences, order_history=None):
    """
    Generate a personalized drink recommendation using Google Gemini.

    Args:
        user_preferences: list of ingredient names user likes (from Preference model)
        order_history: list of past drinks the user ordered (optional)
                      Each is a dict like {'syrups': [...], 'soda': '...', 'addins': [...]}

    Returns:
        dict with keys 'syrups' (list), 'soda' (list with 1 element), 'addins' (list)
        or None if AI is unavailable
    """
    if not DRINK_AI_AVAILABLE:
        return None

    catalog = _load_catalog()

    # Fallback if API key is not configured
    if not settings.GEMINI_API_KEY:
        return _generate_random_drink(catalog)

    # Build context strings
    pref_str = ", ".join(user_preferences) if user_preferences else "No preferences saved"

    order_history_str = ""
    if order_history and len(order_history) > 0:
        order_lines = []
        for i, order in enumerate(order_history[:5], 1):
            syrups_str = ", ".join(order.get('syrups', [])) or "none"
            soda_str = order.get('soda', 'unknown')
            addins_str = ", ".join(order.get('addins', [])) or "none"
            order_lines.append(
                f"  Order {i}: Soda={soda_str}, Syrups={syrups_str}, Add-Ins={addins_str}"
            )
        order_history_str = "Recent orders:\n" + "\n".join(order_lines)
    else:
        order_history_str = "No order history available"

    # Build ingredient lists for the prompt
    syrups_list = ", ".join(catalog['syrups'])
    sodas_list = ", ".join(catalog['sodas'])
    addins_list = ", ".join(catalog['addins'])

    # Create the prompt
    prompt = f"""You are a drink recommendation AI for CodePop, a custom soda shop.

User's saved flavor preferences:
{pref_str}

{order_history_str}

Available ingredients:
- Syrups: {syrups_list}
- Sodas: {sodas_list}
- Add-Ins: {addins_list}

Your task:
1. Create a personalized drink recommendation that complements the user's taste profile
2. Use 1-3 syrups, exactly 1 soda, and 0-2 add-ins
3. If the user has order history, try to introduce slight variety (don't just repeat past drinks)
4. Only use ingredient names from the lists above

Respond with ONLY a JSON object (no markdown, no explanation):
{{"syrups": ["name1", "name2"], "soda": "name", "addins": ["name1"]}}"""

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()

        # Try to parse JSON from response
        try:
            # Handle potential markdown code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            result = json.loads(response_text)

            # Validate ingredients
            syrups = result.get('syrups', [])
            soda = result.get('soda', '')
            addins = result.get('addins', [])

            if _validate_ingredients(syrups, soda, addins, catalog):
                return {
                    'syrups': syrups,
                    'soda': [soda],  # Keep as list for backwards compatibility
                    'addins': addins,
                }
            else:
                # Invalid ingredients returned, fall back to random
                return _generate_random_drink(catalog)

        except json.JSONDecodeError:
            # Could not parse JSON from response, fall back to random
            return _generate_random_drink(catalog)

    except Exception as e:
        # API error or network issue, fall back to random
        return _generate_random_drink(catalog)
