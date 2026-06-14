# Engines

Lumina routes prompt generation through six LLM backends defined in `backend/app/config/engines.xml`.

## Engine matrix

| Display name | Provider | Normal model | MONEYSAVER model |
|--------------|----------|--------------|------------------|
| OpenAI GPT-4o | OpenAI | `gpt-4o` | `groq/llama-3.3-70b-versatile` |
| Claude 3.5 Sonnet | Anthropic | `claude-3-5-sonnet-20241022` | Groq Llama 3.3 70B |
| Gemini 1.5 Pro | Google | `gemini-1.5-pro` | Groq Llama 3.3 70B |
| Mistral Large | Mistral | `mistral-large-latest` | Groq Llama 3.3 70B |
| Llama 3.1 70B | Together | `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` | Groq Llama 3.3 70B |
| Groq Llama 3.3 70B | Groq | `groq/llama-3.3-70b-versatile` | (unchanged) |

MONEYSAVER keeps **display names** identical so the dashboard matrix looks the same while only `GROQ_API_KEY` is billed.

## Configuration file

`backend/app/config/engines.xml` defines each engine:

- `id` — internal key (e.g. `openai_gpt4o`)
- `display_name` — shown in UI and exports
- `provider` — LiteLLM provider string
- `model` — model ID for normal mode
- `money_saver_model` — optional override when MONEYSAVER is on

## Generation stack

Each engine call uses:

- **Instructor** — structured output into `PromptEngineOutput`
- **LiteLLM** — unified provider interface
- **Shared system prompt** — `SYSTEM_PROMPT` in `engines/base.py` (clarity, constraints, efficiency)

## API keys by provider

| Provider | Environment variable |
|----------|---------------------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GOOGLE_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Together (Llama) | `TOGETHER_API_KEY` |
| Groq | `GROQ_API_KEY` |

In MONEYSAVER mode, `pipeline._money_saver_env` copies `GROQ_API_KEY` into OpenAI/Google slots and sets `USE_GROQ_FOR_JUDGE=1`.

## Parallel execution

`MultiEngineRouter.generate_all()` runs all configured engines concurrently with `asyncio.gather`. Failed engines log warnings; if **zero** engines succeed, the pipeline raises `RuntimeError`.

## Extending engines

1. Add an `<engine>` block to `engines.xml`
2. Ensure the provider is supported by LiteLLM
3. Add the corresponding API key to `.env` and `backend/.env.example`
4. Update frontend types if display metadata changes

See also [CODE_PLAN_AGENTS_AND_TOOLS.md](https://github.com/navendubrajesh/lumina_prompt_engine/blob/main/CODE_PLAN_AGENTS_AND_TOOLS.md) for the original design rationale.
