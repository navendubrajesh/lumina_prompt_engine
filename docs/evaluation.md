# Evaluation

Lumina scores each generated prompt with a **Judge-LLM** using [DeepEval](https://github.com/confident-ai/deepeval) **GEval** metrics.

## Five criteria

| Criterion | What it measures |
|-----------|------------------|
| **Contextual alignment** | Does the prompt reflect the Persona's identity, intent, and output format? |
| **Instruction clarity** | Are instructions unambiguous and actionable? |
| **Constraint adherence** | Does the prompt enforce stated format and boundaries? |
| **Robustness** | Would the prompt handle edge cases and ambiguous inputs? |
| **Efficiency** | Is the prompt concise without sacrificing necessary detail? |

Each criterion returns:

- `score` — float from 0.0 to 1.0
- `reasoning` — short explanation from the judge

## Overall score

```text
overall_score = mean(contextual_alignment, instruction_clarity,
                     constraint_adherence, robustness, efficiency)
```

Results sort by `overall_score` descending in the API response and dashboard.

## Judge implementation

Location: `backend/app/evaluator/judge.py`

- Uses `GEval` with `LLMTestCase` built from Persona JSON + generated prompt
- Runs **five metrics in parallel** via `ThreadPoolExecutor` (max 5 workers)
- Default judge model: OpenAI (via DeepEval defaults)

### MONEYSAVER judge

When `USE_GROQ_FOR_JUDGE=1`:

```python
LiteLLMModel(model="groq/llama-3.3-70b-versatile", api_key=GROQ_API_KEY)
```

Set automatically by `_money_saver_env()` in the pipeline.

## Placeholder evaluation

During Phase 1 (`skip_evaluation=True`), the API returns **placeholder scores** (zeros + "Evaluating…" reasoning) so the UI can render prompts immediately. Phase 2 replaces them with real GEval results.

## Evaluation-only endpoint

`POST /evaluate-prompts` accepts a Persona plus existing `PromptEngineOutput` list — useful when the frontend already has prompts and only needs scoring.

## Tuning

GEval criteria strings live in `judge.py`. Adjust rubric text there to change judge behaviour. For production, consider:

- Fixed judge model for reproducibility
- Caching scores by prompt hash
- Human-in-the-loop review for high-stakes use cases

See [Evaluation criteria details](https://github.com/navendubrajesh/lumina_prompt_engine/blob/main/CODE_PLAN_AGENTS_AND_TOOLS.md) in the code plan for original metric definitions.
