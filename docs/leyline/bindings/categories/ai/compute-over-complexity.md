---
derived_from: simplicity
enforced_by: architecture_review & performance_benchmarks
id: compute-over-complexity
last_modified: '2025-08-27'
version: '0.2.0'
---
# Binding: Leverage Compute Over Complexity

Prefer scalable compute solutions over intricate hand-crafted algorithms. The Bitter Lesson teaches us that general methods leveraging computation consistently outperform clever, domain-specific approaches. Instead of building complex parsing rules or elaborate prompt engineering frameworks, invest in compute and let models scale.

## Rationale

Richard Sutton's Bitter Lesson reveals a pattern repeated throughout AI history: researchers spend years crafting clever domain-specific solutions, only to be surpassed by simple methods that scale with compute. This binding ensures we learn from 70 years of AI research.

Complex hand-crafted solutions create technical debt that grows exponentially. Every regex pattern for parsing LLM output, every hardcoded rule for entity extraction, every elaborate prompt template becomes a maintenance burden that prevents you from benefiting when better models arrive.

## Rule Definition

This binding prohibits building complex workarounds for model limitations that could be solved with more compute or better models:

**Prohibited patterns:**
- Complex regex parsing for LLM outputs
- Elaborate prompt engineering frameworks before proving simple prompts fail
- Hand-crafted entity extraction rules
- Domain-specific parsing logic that models already understand
- Multi-stage pipelines to work around model limitations

**Required approaches:**
- Start with the simplest possible prompts
- Use larger models before building workarounds
- Scale horizontally (more API calls) before adding complexity
- Wait for model improvements rather than building temporary fixes
- Measure scaling characteristics in benchmarks

## Practical Implementation

### Start Simple, Scale with Compute

```python
# ❌ BAD: Complex parsing for model limitations
def extract_data_complex(text):
    # Elaborate regex patterns
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    phone_pattern = r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'

    # Multi-stage parsing pipeline
    normalized = normalize_text(text)
    entities = extract_entities(normalized)
    validated = validate_entities(entities)
    return validated

# ✅ GOOD: Trust model capabilities, scale with compute
async def extract_data_simple(text):
    # Use a capable model with more compute
    response = await llm.complete(
        model="gpt-4",  # Use better model rather than workarounds
        messages=[{
            "role": "user",
            "content": f"Extract contact information from: {text}"
        }]
    )
    return json.loads(response)
```

### Scale Horizontally Before Adding Complexity

```python
# ❌ BAD: Complex single-call optimization
class OptimizedProcessor:
    def __init__(self):
        self.templates = load_optimized_templates()
        self.validators = load_validators()
        self.parsers = load_parsers()

    def process(self, items):
        batched = self.optimize_batching(items)
        prompts = self.build_complex_prompt(batched)
        response = self.call_model_once(prompts)
        return self.parse_complex_response(response)

# ✅ GOOD: Simple parallel processing
async def process_items(items):
    # Parallelize simple operations rather than optimize complex ones
    tasks = [
        llm.complete(f"Process this: {item}")
        for item in items
    ]
    results = await asyncio.gather(*tasks)
    return results
```

### Embrace Model Evolution

```python
# ❌ BAD: Working around current model limitations
class ModelLimitationWorkaround:
    def __init__(self):
        # Complex workaround for GPT-3.5 limitations
        self.chunk_size = 2000  # Model context limit
        self.overlap = 200
        self.aggregation_strategy = "weighted_merge"

    def process_large_doc(self, doc):
        chunks = self.chunk_document(doc)
        results = []
        for chunk in chunks:
            processed = self.process_chunk(chunk)
            results.append(processed)
        return self.merge_results(results)

# ✅ GOOD: Use models that handle your requirements
async def process_document(doc):
    # Use a model with sufficient context
    return await llm.complete(
        model="claude-3-opus",  # 200k context
        messages=[{"role": "user", "content": f"Analyze: {doc}"}]
    )
```

## Examples

### Example 1: Information Extraction

```python
# ❌ BAD: Complex extraction pipeline
def extract_meeting_info(transcript):
    # Elaborate rule-based system
    sentences = nltk.sent_tokenize(transcript)
    datetime_extractor = DateTimeExtractor()
    participant_detector = ParticipantDetector()
    action_classifier = ActionItemClassifier()

    meeting_data = {
        "date": None,
        "participants": [],
        "action_items": []
    }

    for sentence in sentences:
        # Complex rule application...
        pass

    return meeting_data

# ✅ GOOD: Let the model handle language understanding
async def extract_meeting_info(transcript):
    return await llm.complete(
        "Extract meeting date, participants, and action items from this transcript:",
        transcript,
        response_format={"type": "json_object"}
    )
```

### Example 2: Performance Optimization

```python
# ❌ BAD: Premature optimization through complexity
def optimized_classifier(texts):
    # Complex caching and batching logic
    cache = load_cache()
    texts_to_process = []
    cached_results = {}

    for text in texts:
        cache_key = generate_cache_key(text)
        if cache_key in cache:
            cached_results[text] = cache[cache_key]
        else:
            texts_to_process.append(text)

    # Complex batching logic...
    # Template optimization...
    # Response parsing...

# ✅ GOOD: Simple parallelization with more compute
async def classify_texts(texts):
    # Throw compute at the problem
    classifications = await asyncio.gather(*[
        llm.complete(f"Classify: {text}")
        for text in texts
    ])
    return classifications
```

## Real-World Impact

Teams that embrace compute over complexity see:
- **90% less parsing code** to maintain
- **50% faster development** by removing workaround engineering
- **Automatic improvements** when new models are released
- **Better accuracy** from using capable models rather than working around limitations

When GPT-4 was released, teams using simple prompts immediately benefited from improvements, while teams with complex GPT-3.5 workarounds needed weeks to refactor.

## Key Benefits

- **Future-proof** — Automatically benefit from model improvements
- **Maintainable** — Less complex code to debug and update
- **Scalable** — Performance improves with compute investment
- **Reliable** — Fewer edge cases in simple systems
- **Transferable** — Patterns work across different models

## Warning Signs You're Violating This Binding

- Writing regex to parse LLM outputs
- Building complex prompt templates before trying simple ones
- Creating elaborate workarounds for model limitations
- Optimizing prompts for weeks without measuring impact
- Building custom NLP pipelines for tasks LLMs can handle
- Seeing "clever" solutions that are hard to explain

## Related Bindings

- [simplicity](../../../tenets/simplicity.md) - Compute-first approaches are inherently simpler
- [trust-language-understanding](trust-language-understanding.md) - Models understand language without complex parsing
- [semantic-over-syntactic](semantic-over-syntactic.md) - Focus on what models do well
- [no-unnecessary-parsing](no-unnecessary-parsing.md) - Avoid building what models handle natively
