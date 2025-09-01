---
derived_from: testability
enforced_by: ci_pipeline & evaluation_metrics
id: evaluation-driven-development
last_modified: '2025-08-27'
version: '0.2.0'
---
# Binding: Evaluation-Driven Development for AI Systems

Build comprehensive evaluation suites before optimizing prompts or models. Just as Test-Driven Development transformed software quality, Evaluation-Driven Development (EDD) ensures AI systems improve measurably rather than subjectively. Never optimize what you can't measure.

## Rationale

Without rigorous evaluation, AI development becomes guesswork. Teams waste weeks tweaking prompts based on hunches, only to discover they've made things worse. Every prompt change, model update, or configuration adjustment can have unexpected effects across your system.

Evaluation-Driven Development brings engineering discipline to AI. By defining success metrics and test cases upfront, you can iterate confidently, catch regressions immediately, and prove improvements quantitatively. This approach transforms AI development from art to engineering.

## Rule Definition

This binding requires evaluation infrastructure before optimization:

**Required practices:**
- Create eval datasets before writing prompts
- Define success metrics before choosing models
- Build regression tests before deploying changes
- Measure semantic correctness, not format compliance
- Track metrics over time, not just point measurements
- Test edge cases and failure modes explicitly

**Prohibited practices:**
- Optimizing prompts without evaluation data
- Deploying model changes without regression testing
- Relying on subjective "feels better" assessments
- Testing only happy paths
- Ignoring metric degradation if most cases improve

## Practical Implementation

### Build Evals First

```python
# ✅ GOOD: Evaluation infrastructure before implementation
class CustomerSupportEvals:
    def __init__(self):
        # Define test cases upfront
        self.test_cases = [
            {
                "input": "I want to return my order",
                "expected_intent": "return_request",
                "expected_tone": "helpful",
                "must_mention": ["return policy", "timeframe"]
            },
            {
                "input": "This product broke after one day!!!",
                "expected_intent": "complaint",
                "expected_tone": "empathetic",
                "must_mention": ["apology", "replacement or refund"]
            },
            # ... comprehensive test suite
        ]

    async def evaluate(self, llm_function):
        results = []
        for case in self.test_cases:
            response = await llm_function(case["input"])
            score = self.score_response(response, case)
            results.append(score)

        return {
            "accuracy": np.mean([r["correct_intent"] for r in results]),
            "tone_match": np.mean([r["tone_appropriate"] for r in results]),
            "completeness": np.mean([r["mentions_required"] for r in results]),
            "overall": np.mean([r["overall"] for r in results])
        }

    def score_response(self, response, expected):
        # Semantic scoring, not string matching
        return {
            "correct_intent": self.check_intent(response, expected),
            "tone_appropriate": self.check_tone(response, expected),
            "mentions_required": self.check_mentions(response, expected),
            "overall": self.calculate_overall(response, expected)
        }

# Now implement with confidence
async def handle_support_query_v1(query):
    # Simple implementation
    return await llm.complete(f"Handle this support query: {query}")

async def handle_support_query_v2(query):
    # Improved implementation
    return await llm.complete(
        f"Handle this support query professionally and empathetically: {query}"
    )

# Measure improvement
evals = CustomerSupportEvals()
v1_scores = await evals.evaluate(handle_support_query_v1)
v2_scores = await evals.evaluate(handle_support_query_v2)

if v2_scores["overall"] > v1_scores["overall"]:
    print("v2 is better, deploy it")
else:
    print("v2 is worse, keep iterating")
```

### Continuous Evaluation in CI/CD

```python
# ✅ GOOD: Automated evaluation pipeline
class LLMRegressionTests:
    def __init__(self):
        self.baseline_metrics = self.load_baseline()
        self.test_suites = {
            "accuracy": AccuracyTests(),
            "latency": LatencyTests(),
            "cost": CostTests(),
            "safety": SafetyTests()
        }

    async def run_regression_suite(self, new_implementation):
        results = {}
        regressions = []

        for suite_name, suite in self.test_suites.items():
            metrics = await suite.evaluate(new_implementation)
            results[suite_name] = metrics

            # Check for regressions
            baseline = self.baseline_metrics.get(suite_name, {})
            for metric, value in metrics.items():
                baseline_value = baseline.get(metric, 0)
                if value < baseline_value * 0.95:  # 5% regression threshold
                    regressions.append(f"{suite_name}.{metric}: {value} < {baseline_value}")

        if regressions:
            raise RegressionError(f"Performance regressions detected:\n" + "\n".join(regressions))

        return results

# In CI pipeline
async def test_prompt_changes():
    tests = LLMRegressionTests()
    await tests.run_regression_suite(new_prompt_implementation)
```

### Semantic Evaluation Over Format Checking

```python
# ❌ BAD: Format-focused evaluation
def evaluate_output(output, expected_format):
    # Checking structure, not meaning
    if not output.startswith("Dear"):
        return 0
    if not output.endswith("Sincerely,"):
        return 0
    if len(output.split("\n")) != expected_format["lines"]:
        return 0
    return 1

# ✅ GOOD: Semantic evaluation
async def evaluate_output(output, expected_criteria):
    # Use LLM as judge for semantic correctness
    eval_prompt = f"""
    Evaluate this output against criteria:

    Output: {output}

    Criteria:
    - {expected_criteria['intent']}: Did it achieve the intended goal?
    - {expected_criteria['tone']}: Is the tone appropriate?
    - {expected_criteria['completeness']}: Are all key points addressed?

    Score each criterion 0-10 and explain.
    Return as JSON: {{intent: score, tone: score, completeness: score, explanation: text}}
    """

    evaluation = await llm.complete(eval_prompt)
    return json.loads(evaluation)
```

## Examples

### Example 1: Prompt Optimization with Metrics

```python
# ✅ GOOD: Data-driven prompt iteration
class PromptOptimizer:
    def __init__(self, eval_dataset):
        self.eval_dataset = eval_dataset
        self.results_history = []

    async def test_prompt(self, prompt_template, name="unnamed"):
        results = []

        for case in self.eval_dataset:
            output = await llm.complete(
                prompt_template.format(**case["inputs"])
            )
            score = await self.evaluate(output, case["expected"])
            results.append(score)

        metrics = {
            "name": name,
            "accuracy": np.mean([r["accuracy"] for r in results]),
            "completeness": np.mean([r["completeness"] for r in results]),
            "latency_ms": np.mean([r["latency"] for r in results]),
            "cost_per_1k": self.calculate_cost(results)
        }

        self.results_history.append(metrics)
        return metrics

    def compare_prompts(self):
        # Data-driven decision making
        return pd.DataFrame(self.results_history).sort_values("accuracy", ascending=False)

# Test multiple approaches
optimizer = PromptOptimizer(load_eval_dataset())

await optimizer.test_prompt(
    "Summarize: {text}",
    name="baseline"
)

await optimizer.test_prompt(
    "Summarize in 3 key points: {text}",
    name="structured"
)

await optimizer.test_prompt(
    "Extract the most important information: {text}",
    name="extraction"
)

# Choose based on data
best_prompt = optimizer.compare_prompts().iloc[0]
print(f"Best prompt: {best_prompt['name']} with {best_prompt['accuracy']:.2%} accuracy")
```

### Example 2: Model Selection with Evaluation

```python
# ✅ GOOD: Model selection based on comprehensive evaluation
class ModelEvaluator:
    def __init__(self):
        self.test_suites = {
            "reasoning": ReasoningTests(),
            "creativity": CreativityTests(),
            "factuality": FactualityTests(),
            "instruction_following": InstructionTests(),
            "safety": SafetyTests()
        }

    async def evaluate_model(self, model_name):
        results = {}

        for suite_name, suite in self.test_suites.items():
            print(f"Running {suite_name} tests on {model_name}...")
            scores = await suite.run(model_name)
            results[suite_name] = scores

        return {
            "model": model_name,
            "overall_score": np.mean(list(results.values())),
            "detailed_scores": results,
            "recommendation": self.make_recommendation(results)
        }

    def make_recommendation(self, scores):
        if scores["safety"] < 0.95:
            return "REJECT: Safety score too low"
        if scores["factuality"] < 0.8:
            return "REJECT: Factuality below threshold"
        if np.mean(list(scores.values())) > 0.85:
            return "APPROVE: Meets all criteria"
        return "REVIEW: Marginal performance"

# Evaluate models before deployment
evaluator = ModelEvaluator()
gpt4_results = await evaluator.evaluate_model("gpt-4")
claude_results = await evaluator.evaluate_model("claude-3")
llama_results = await evaluator.evaluate_model("llama-3")

# Make data-driven decision
best_model = max([gpt4_results, claude_results, llama_results],
                 key=lambda x: x["overall_score"])
print(f"Recommended model: {best_model['model']}")
```

## Real-World Impact

Teams using Evaluation-Driven Development report:
- **75% fewer production issues** from prompt changes
- **90% faster iteration** with confidence in improvements
- **Quantifiable ROI** from AI investments
- **Automatic detection** of model degradation
- **Clear rollback criteria** when issues occur

A fintech company reduced failed AI transactions by 60% after implementing EDD, catching issues in evaluation that would have cost millions in production.

## Key Benefits

- **Confidence in changes** — Know if changes improve or regress
- **Faster iteration** — No guesswork, just data
- **Catch issues early** — Before they hit production
- **Quantify improvements** — Prove ROI with metrics
- **Enable experimentation** — Safe to try new approaches

## Warning Signs You're Violating This Binding

- Tweaking prompts based on single examples
- No regression tests for prompt changes
- "It seems better" as deployment criteria
- No metrics dashboard for AI performance
- Testing only successful cases
- Format checking instead of semantic evaluation

## Related Bindings

- [testability](../../../tenets/testability.md) - Foundation for all testing practices
- [semantic-over-syntactic](semantic-over-syntactic.md) - Evaluate meaning, not format
- [observability](../../../tenets/observability.md) - Monitor evaluation metrics in production
- [compute-over-complexity](compute-over-complexity.md) - Use evaluation to prove simple approaches work
