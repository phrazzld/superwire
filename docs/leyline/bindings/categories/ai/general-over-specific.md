---
derived_from: adaptability-and-reversibility
enforced_by: architecture_review & documentation_requirements
id: general-over-specific
last_modified: '2025-08-27'
version: '0.2.0'
---
# Binding: Build General Systems Over Domain-Specific Solutions

Build general learning systems that leverage foundation models rather than encoding brittle domain knowledge. The Bitter Lesson shows us that general methods powered by computation consistently outperform domain-specific, hand-crafted approaches. Avoid hardcoding business rules into prompts—let models learn patterns from examples.

## Rationale

Every domain-specific rule you encode becomes technical debt. When you hardcode industry jargon into prompts, build specialized parsers for your domain, or create elaborate rule engines, you're betting against the trajectory of AI progress. History shows this bet consistently loses.

General approaches using foundation models adapt to new requirements without code changes. A model that learns from examples can handle edge cases you never anticipated. A system built on general principles transfers to new domains, while specialized solutions require complete rewrites.

## Rule Definition

This binding requires choosing general, adaptable approaches over domain-specific solutions:

**Prohibited patterns:**
- Hardcoding domain rules in prompts
- Building domain-specific parsers or extractors
- Creating specialized prompt templates for narrow use cases
- Encoding business logic in prompt engineering
- Training custom models before trying foundation models with examples

**Required approaches:**
- Use foundation models with few-shot learning
- Provide examples rather than rules
- Build general interfaces that work across domains
- Use RAG to inject domain knowledge dynamically
- Let models discover patterns rather than encoding them

## Practical Implementation

### Use Few-Shot Learning Instead of Rules

```python
# ❌ BAD: Domain-specific rules hardcoded
class MedicalDataExtractor:
    def __init__(self):
        self.medical_terms = load_medical_dictionary()
        self.icd_codes = load_icd_codes()
        self.drug_database = load_drug_database()

    def extract(self, text):
        prompt = f"""
        Extract medical information following these rules:
        - Diagnoses must match ICD-10 codes
        - Medications must be from approved drug list
        - Dosages must follow standard formats
        - Symptoms must use medical terminology

        Valid ICD codes: {self.icd_codes}
        Valid drugs: {self.drug_database}
        """
        return self.process_with_rules(text, prompt)

# ✅ GOOD: General approach with examples
async def extract_medical_data(text, examples=None):
    if examples:
        prompt = "Here are some examples of medical data extraction:\n"
        for example in examples:
            prompt += f"Input: {example['input']}\n"
            prompt += f"Output: {example['output']}\n\n"
        prompt += f"Now extract from: {text}"
    else:
        prompt = f"Extract medical information from: {text}"

    return await llm.complete(prompt)
```

### Build Domain-Agnostic Interfaces

```python
# ❌ BAD: Domain-specific interface
class FinancialAnalyzer:
    def analyze_earnings_call(self, transcript):
        # Hardcoded financial metrics
        return self.extract_financial_metrics(transcript)

    def analyze_10k_filing(self, document):
        # Specific parsing for SEC format
        return self.parse_sec_document(document)

    def analyze_analyst_report(self, report):
        # Custom logic for analyst reports
        return self.process_analyst_format(report)

# ✅ GOOD: General document analyzer
class DocumentAnalyzer:
    async def analyze(self, document, context=None, examples=None):
        # General approach works for any domain
        prompt_parts = []

        if context:
            prompt_parts.append(f"Context: {context}")

        if examples:
            prompt_parts.append("Examples:")
            for ex in examples:
                prompt_parts.append(f"{ex}")

        prompt_parts.append(f"Analyze: {document}")

        return await llm.complete("\n\n".join(prompt_parts))
```

### Use RAG Instead of Hardcoding Knowledge

```python
# ❌ BAD: Domain knowledge hardcoded
class LegalDocumentGenerator:
    def __init__(self):
        self.legal_templates = {
            "contract": load_contract_template(),
            "nda": load_nda_template(),
            "terms": load_terms_template()
        }
        self.legal_clauses = load_standard_clauses()
        self.jurisdiction_rules = load_jurisdiction_rules()

    def generate(self, doc_type, params):
        template = self.legal_templates[doc_type]
        # Complex template filling logic...

# ✅ GOOD: Dynamic knowledge through RAG
class DocumentGenerator:
    def __init__(self, vector_store):
        self.vector_store = vector_store  # Contains all document examples

    async def generate(self, description, similar_count=3):
        # Find similar documents dynamically
        similar = await self.vector_store.search(description, k=similar_count)

        prompt = "Based on these examples:\n"
        for doc in similar:
            prompt += f"---\n{doc}\n---\n"
        prompt += f"\nGenerate: {description}"

        return await llm.complete(prompt)
```

## Examples

### Example 1: Customer Support

```python
# ❌ BAD: Domain-specific support rules
def handle_support_query(query):
    # Elaborate rule system
    if "refund" in query.lower():
        if check_refund_eligibility(query):
            return REFUND_TEMPLATE.format(...)
    elif "shipping" in query.lower():
        if international_shipping_check(query):
            return INTL_SHIPPING_TEMPLATE.format(...)
    # Hundreds more rules...

# ✅ GOOD: General approach with examples
async def handle_support_query(query, conversation_history=None):
    # Let the model learn from examples
    similar_queries = await find_similar_resolved_queries(query)

    prompt = "Previous similar support resolutions:\n"
    for q in similar_queries:
        prompt += f"Q: {q['question']}\nA: {q['resolution']}\n\n"
    prompt += f"Current query: {query}"

    return await llm.complete(prompt)
```

### Example 2: Data Transformation

```python
# ❌ BAD: Format-specific transformers
class DataTransformer:
    def __init__(self):
        self.csv_parser = CSVParser()
        self.json_transformer = JSONTransformer()
        self.xml_converter = XMLConverter()
        self.excel_processor = ExcelProcessor()

    def transform(self, data, source_format, target_format):
        # Complex format-specific logic
        if source_format == "csv" and target_format == "json":
            return self.csv_to_json(data)
        # Many more combinations...

# ✅ GOOD: General transformation with examples
async def transform_data(data, target_description, examples=None):
    prompt = f"Transform this data into {target_description}:\n"

    if examples:
        prompt += "Examples:\n"
        for ex in examples:
            prompt += f"Input: {ex['input'][:100]}...\n"
            prompt += f"Output: {ex['output'][:100]}...\n\n"

    prompt += f"Data: {data}"

    return await llm.complete(prompt)
```

## Real-World Impact

Organizations that choose general over specific approaches see:
- **75% faster adaptation** to new domains without code changes
- **90% reduction** in domain-specific code maintenance
- **Better handling** of edge cases through learned patterns
- **Seamless scaling** to new use cases with the same infrastructure

A financial services firm replaced 50,000 lines of trading rules with a general system using RAG. The new system handles novel instruments without updates and achieves better accuracy through learning from examples.

## Key Benefits

- **Domain portability** — Same system works across industries
- **Continuous learning** — Improves with new examples, not new code
- **Reduced complexity** — No domain-specific rule engines
- **Better generalization** — Handles cases you didn't anticipate
- **Lower maintenance** — Examples are easier to update than code

## Warning Signs You're Violating This Binding

- Writing industry-specific prompt templates
- Building parsers for domain-specific formats
- Hardcoding business rules in prompts
- Creating separate systems for each use case
- Encoding domain knowledge in code rather than data
- Training custom models before trying foundation models

## Related Bindings

- [adaptability-and-reversibility](../../../tenets/adaptability-and-reversibility.md) - General systems adapt without rewrites
- [compute-over-complexity](compute-over-complexity.md) - General methods scale with compute
- [trust-language-understanding](trust-language-understanding.md) - Foundation models understand domains without special rules
- [rag-before-finetuning](rag-before-finetuning.md) - Dynamic knowledge injection over static encoding
