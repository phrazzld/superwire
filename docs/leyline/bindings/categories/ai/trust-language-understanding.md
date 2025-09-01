---
derived_from: simplicity
enforced_by: code_review & architecture_review
id: trust-language-understanding
last_modified: '2025-08-27'
version: '0.2.0'
---
# Binding: Trust Language Understanding—Don't Rebuild What LLMs Already Do

LLMs understand language at a fundamental level. Never build parsing logic, regex patterns, or extraction rules for capabilities that models already possess. This is the cornerstone binding for AI development: trust the model's language understanding instead of wrapping it in brittle parsing layers.

## Rationale

Large language models have been trained on trillions of tokens of human language. They understand dates, emails, phone numbers, addresses, names, sentiments, intents, and countless other linguistic patterns better than any regex or parser you could write. Every parsing layer you add is a bet against the model's capabilities—a bet that always loses as models improve.

When you write regex to extract emails from LLM output, you're rebuilding what the model already knows how to do. When you create elaborate parsing rules for dates, you're ignoring that the model understands "next Tuesday at 3pm" better than your code ever will. This rebuilding creates maintenance burden, introduces bugs, and prevents you from benefiting when models improve.

## Rule Definition

This binding prohibits rebuilding language understanding that LLMs already possess:

**Never build:**
- Regex patterns to parse LLM outputs
- Entity extraction rules for common entities (dates, emails, phones, etc.)
- Format validators for natural language
- Parsing logic for structured data the LLM can already understand
- State machines for conversation flow
- Intent classifiers when the model understands intent
- Sentiment analyzers when the model understands sentiment

**Always prefer:**
- Direct questions: "What is the email address in this text?"
- Natural instructions: "Extract the meeting date and time"
- Semantic queries: "Is this feedback positive or negative?"
- Few-shot examples over parsing rules
- Natural language for everything the model understands

## Practical Implementation

### Trust Direct Extraction

```python
# ❌ BAD: Regex for what models understand
import re

def extract_contact_info(text):
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    phone_pattern = r'(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}'

    emails = re.findall(email_pattern, text)
    phones = re.findall(phone_pattern, text)

    return {"emails": emails, "phones": phones}

# ✅ GOOD: Trust the model's understanding
async def extract_contact_info(text):
    response = await llm.complete(
        f"Extract email addresses and phone numbers from this text: {text}. "
        "Return as JSON with 'emails' and 'phones' arrays."
    )
    return json.loads(response)
```

### Handle Temporal Understanding Naturally

```python
# ❌ BAD: Complex date parsing
from dateutil import parser
import re

def extract_meeting_time(text):
    # Complex patterns for various date formats
    patterns = [
        r'\b(\d{1,2}/\d{1,2}/\d{2,4})\b',
        r'\b(\d{4}-\d{2}-\d{2})\b',
        r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b',
        r'\b(next|last|this)\s+(week|month|year)\b'
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            try:
                return parser.parse(matches[0])
            except:
                continue

    return None

# ✅ GOOD: Models understand temporal references
async def extract_meeting_time(text, current_date=None):
    context = f"Today is {current_date}. " if current_date else ""
    response = await llm.complete(
        f"{context}When is the meeting mentioned in this text: {text}? "
        "Return the date and time in ISO format."
    )
    return response  # Model handles "next Tuesday at 3pm" naturally
```

### Let Models Handle Ambiguity

```python
# ❌ BAD: Rigid parsing for user input
def parse_user_command(input_text):
    commands = {
        "create ticket": r"create\s+ticket:\s*title:\s*(.*?)\s*priority:\s*(.*)",
        "update ticket": r"update\s+ticket\s+(\d+):\s*(.*)",
        "close ticket": r"close\s+ticket\s+(\d+)"
    }

    for cmd, pattern in commands.items():
        match = re.match(pattern, input_text, re.IGNORECASE)
        if match:
            return {"command": cmd, "params": match.groups()}

    return {"error": "Invalid command format"}

# ✅ GOOD: Natural language understanding
async def understand_user_intent(input_text):
    response = await llm.complete(
        f"""User said: {input_text}

        What action do they want to take? Return JSON with:
        - action: (create_ticket, update_ticket, close_ticket, or unknown)
        - details: relevant information extracted
        """
    )
    return json.loads(response)
    # Handles "I need a high priority ticket for the login bug" naturally
```

### Semantic Understanding Over Pattern Matching

```python
# ❌ BAD: Pattern matching for intent
def categorize_feedback(feedback):
    positive_words = ["good", "great", "excellent", "love", "fantastic"]
    negative_words = ["bad", "terrible", "hate", "awful", "horrible"]

    feedback_lower = feedback.lower()
    positive_count = sum(1 for word in positive_words if word in feedback_lower)
    negative_count = sum(1 for word in negative_words if word in feedback_lower)

    if positive_count > negative_count:
        return "positive"
    elif negative_count > positive_count:
        return "negative"
    else:
        return "neutral"

# ✅ GOOD: Semantic understanding
async def categorize_feedback(feedback):
    response = await llm.complete(
        f"Is this feedback positive, negative, or neutral: {feedback}"
    )
    return response
    # Handles sarcasm, context, and nuance that word matching misses
```

## Examples

### Example 1: Address Parsing

```python
# ❌ BAD: Regex for address components
def parse_address(address_text):
    patterns = {
        'street': r'(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr))',
        'city': r'([A-Za-z\s]+),\s*([A-Z]{2})',
        'zip': r'(\d{5}(?:-\d{4})?)'
    }
    # Complex parsing logic...

# ✅ GOOD: Natural understanding
async def parse_address(address_text):
    return await llm.complete(
        f"Parse this address into components: {address_text}. "
        "Return JSON with street, city, state, zip."
    )
    # Handles international formats, abbreviations, and variations
```

### Example 2: Error Message Understanding

```python
# ❌ BAD: Pattern matching for error types
def classify_error(error_message):
    if re.search(r'timeout|timed out', error_message, re.I):
        return "timeout"
    elif re.search(r'not found|404', error_message, re.I):
        return "not_found"
    elif re.search(r'unauthorized|401|forbidden|403', error_message, re.I):
        return "auth_error"
    # Many more patterns...

# ✅ GOOD: Semantic understanding
async def classify_error(error_message):
    return await llm.complete(
        f"What type of error is this: {error_message}? "
        "Categories: timeout, not_found, auth_error, server_error, client_error, unknown"
    )
    # Understands context and variations you didn't anticipate
```

## Real-World Impact

Teams that trust language understanding see:
- **95% less parsing code** to maintain
- **Better accuracy** on edge cases and variations
- **Automatic improvements** as models get better
- **International support** without code changes
- **Faster development** without parsing logic design

A customer support system replaced 10,000 lines of intent classification rules with simple LLM calls, achieving 40% better accuracy while handling languages and phrasings the rules never covered.

## Key Benefits

- **Zero maintenance** — No regex patterns to update
- **Better coverage** — Handles variations you didn't anticipate
- **Natural flexibility** — Users can express things naturally
- **Automatic improvement** — Benefits from model updates
- **International ready** — Models understand multiple languages

## Warning Signs You're Violating This Binding

- Writing regex patterns for LLM outputs
- Building extractors for common entities
- Creating format validators for natural language
- Designing elaborate parsing pipelines
- Writing rules for what models already understand
- Seeing `import re` near LLM code
- Finding string manipulation after LLM calls

## Related Bindings

- [simplicity](../../../tenets/simplicity.md) - Trusting models is simpler than parsing
- [compute-over-complexity](compute-over-complexity.md) - Use model capabilities rather than complex code
- [semantic-over-syntactic](semantic-over-syntactic.md) - Focus on meaning, not format
- [no-unnecessary-parsing](no-unnecessary-parsing.md) - The anti-pattern to avoid
