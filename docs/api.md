# API Reference

FastAPI backend served by `backend/main.py`. Interactive docs at `/docs` when running locally.

## Base URL

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:8000` |
| Production | CrewAI AMP kickoff URL (see [Deployment](deployment.md)) |

## Endpoints

### `GET /health`

Health check for load balancers and local dev.

**Response:**

```json
{"status": "ok"}
```

---

### `POST /generate-optimized-prompts`

Generate prompts from a Persona; optionally skip evaluation.

**Request body:**

```json
{
  "persona": {
    "identity": "Senior data scientist",
    "intent": "Analyze customer feedback",
    "output_format": "JSON with sentiment and themes"
  },
  "money_saver": true,
  "skip_evaluation": false
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `persona` | Persona | required | User context for generation |
| `money_saver` | bool | `false` | Route all engines + judge through Groq |
| `skip_evaluation` | bool | `false` | Return placeholders; use `/evaluate-prompts` next |

**Response:** `FinalResponse`

```json
{
  "results": [
    {
      "engine_output": {
        "engine_id": "openai_gpt4o",
        "display_name": "OpenAI GPT-4o",
        "prompt_text": "..."
      },
      "evaluation": {
        "contextual_alignment": {"score": 0.9, "reasoning": "..."},
        "instruction_clarity": {"score": 0.85, "reasoning": "..."},
        "constraint_adherence": {"score": 0.88, "reasoning": "..."},
        "robustness": {"score": 0.82, "reasoning": "..."},
        "efficiency": {"score": 0.91, "reasoning": "..."},
        "overall_score": 0.872
      }
    }
  ],
  "summary": "Ranked 6 prompts. Top: OpenAI GPT-4o (0.87).",
  "suggested_title": "Customer Feedback Analysis"
}
```

---

### `POST /evaluate-prompts`

Score existing prompts without regenerating.

**Request body:**

```json
{
  "persona": { "identity": "...", "intent": "...", "output_format": "..." },
  "engine_outputs": [
    {
      "engine_id": "openai_gpt4o",
      "display_name": "OpenAI GPT-4o",
      "prompt_text": "..."
    }
  ],
  "money_saver": true
}
```

**Response:** Same `FinalResponse` shape with real evaluation scores.

## Schemas

Defined in `backend/app/models.py`:

| Model | Fields |
|-------|--------|
| `Persona` | `identity`, `intent`, `output_format` (all strings) |
| `PromptEngineOutput` | `engine_id`, `display_name`, `prompt_text` |
| `CriterionScore` | `score`, `reasoning` |
| `EvaluationMetrics` | five criteria + `overall_score` |
| `EvaluatedEngineOutput` | `engine_output`, `evaluation` |
| `FinalResponse` | `results[]`, `summary`, `suggested_title` |

## CORS

FastAPI allows origins from `CORS_ORIGINS` env var (comma-separated). Default includes `http://localhost:3000` for local Next.js.

## Errors

| Status | Cause |
|--------|-------|
| 422 | Invalid request body |
| 500 | No engine outputs (missing keys, all providers failed) |

Check server logs for provider-specific LiteLLM errors.
