# Code Plan: Lumina Prompt Engine → AI Agents & Tools

**Goal:** Convert the project so the **frontend** deploys on **Vercel** (from Git) and **agents** run on **CrewAI** (AMP). Logic and behaviour must stay the same, especially **MONEYSAVER mode** (only Groq, free) and **token-related behaviour** (efficiency criterion, max_tokens).

---

## 1. Current Behaviour (Preserved)

### 1.1 MONEYSAVER Mode
- **UI:** Checkbox “MONEYSAVER mode (only Groq, free)” in persona form; value sent as `money_saver` in all API calls.
- **Backend:** When `money_saver=True`:
  - All 6 engines use **Groq only** (`groq/llama-3.3-70b-versatile`) via `ENGINES_MONEYSAVER` (same display names; `api_key_env=GROQ_API_KEY`).
  - Judge (evaluator) uses Groq via `USE_GROQ_FOR_JUDGE=1` and `GROQ_API_KEY`.
  - Only `GROQ_API_KEY` is required; no OpenAI/Anthropic/Google/DeepSeek keys needed.
- **Preservation:** Agents/tools on CrewAI must receive `money_saver`, select engine set (real vs moneysaver), and set `USE_GROQ_FOR_JUDGE` when evaluating so judge uses Groq. Same display names and same 6 “cards” in the UI.

### 1.2 Token-Related Behaviour
- **Efficiency criterion:** One of the 5 GEval metrics; “Token efficiency and concision without sacrificing quality.” Scores 0–1 with reasoning. No change.
- **Title suggestion:** Uses `max_tokens=50` and `LUMINA_TITLE_MODEL` (default `groq/llama-3.3-70b-versatile`). In MONEYSAVER, this already uses Groq; preserve behaviour.
- **System prompt:** “Efficiency: Make the prompt concise and token-efficient…” in `SYSTEM_PROMPT`; keep as-is in agent/tool prompts.
- **No API token usage tracking:** The app does not expose token/cost counters; no requirement to add them.

### 1.3 Two-Phase Flow (Frontend)
- **Phase 1:** `POST /generate-optimized-prompts` with `skip_evaluation: true` → returns prompts only (placeholder evaluations).
- **Phase 2:** `POST /evaluate-prompts` with `engine_outputs` + `persona` + `money_saver` → returns real evaluations; frontend merges and shows scores.
- **Preservation:** Either keep this UX by having two CrewAI entry points (generate-only crew, evaluate-only crew), or collapse to one crew that returns the full result and optionally use CrewAI status/streaming to show “prompts first, then scores” if the platform supports it. Plan should allow both options; minimal change is one crew = one full response.

### 1.4 PDF and Excel Export (Preserved)
- **Excel:** Client-side only. `evaluation-matrix.tsx` builds an XLSX from `response.results` (engine name, overall %, 5 scores, full prompt, 5 reasoning strings) using `xlsx` and `XLSX.writeFile`. No backend call.
- **PDF:** Client-side only. `generatePDFReport(response, runName)` in `frontend/lib/pdf-generator.ts` uses `jspdf` to produce a multi-page report (persona, system prompt, champion, metric badges, summary table, charts, detailed results with prompts and reasoning). No backend call.
- **Preservation:** Both exports consume the same `FinalResponse` object the UI already has. Once the frontend receives `FinalResponse` from CrewAI (instead of FastAPI), **Download PDF** and **Download Excel** work unchanged—no code changes to `pdf-generator.ts`, `evaluation-matrix.tsx`, or export buttons.

### 1.5 Data Contracts (Unchanged)
- **Input:** `Persona` = `identity`, `intent`, `output_format`; plus `money_saver`, `skip_evaluation` where applicable.
- **Output:** `FinalResponse` = `persona`, `results` (list of `EvaluatedEngineOutput`: `engine_output` + `evaluation`), `summary`, `system_prompt`, `suggested_title`.
- **Engine output:** `engine_name`, `generated_prompt`, `raw_response`.
- **Evaluation:** 5 metrics (contextual_alignment, instruction_clarity, constraint_adherence, robustness, efficiency) with score 0–1 and reasoning each.

---

## 2. Target Architecture

### 2.1 Frontend (Vercel, from Git)
- **Repo:** Same repo; frontend in `frontend/` (Next.js).
- **Deploy:** Vercel connected to Git; build command and output directory set for `frontend/`.
- **API dependency:** Frontend talks to **CrewAI AMP API** (not FastAPI). No backend running on Vercel.

### 2.2 Agents & Tools (CrewAI)
- **Platform:** CrewAI (AMP). Deploy a Crew (or Flow) that implements the current “generate → evaluate → suggest title” pipeline.
- **API:** CrewAI REST: `POST /kickoff` with inputs, `GET /{kickoff_id}/status` for polling (and result when done).
- **Secrets:** `GROQ_API_KEY` (and optionally other provider keys for non-MONEYSAVER) configured in CrewAI (e.g. env/secrets), not in frontend.

---

## 3. CrewAI Side: Agents and Tools

### 3.1 Option A (Recommended): One Crew, Tools Encapsulate Current Logic
- **Crew:** Single crew with one main “orchestrator” agent that uses tools. No change to evaluation criteria or prompts; tools reuse current Python logic.
- **Inputs (CrewAI kickoff):** `identity`, `intent`, `output_format`, `money_saver` (bool), optional `skip_evaluation` (bool).
- **Output:** Single structured output = JSON matching `FinalResponse` (persona, results, summary, system_prompt, suggested_title).

**Tools (same behaviour as today):**

1. **`generate_prompts`**  
   - Inputs: persona (identity, intent, output_format), `money_saver`.  
   - Behaviour: If `money_saver`, set env so only Groq is used (`OPENAI_API_KEY`/`GOOGLE_API_KEY` from `GROQ_API_KEY`, `USE_GROQ_FOR_JUDGE=1`), use `ENGINES_MONEYSAVER`; else use `ENGINES`. Run `MultiEngineRouter.generate_all(persona)` (parallel over engines).  
   - Output: List of `PromptEngineOutput` (engine_name, generated_prompt, raw_response).  
   - Implementation: Move/import from current `backend.app.engines` (router, providers, base, loader) and `backend.app.models`; keep `engines.xml` (or equivalent config) in the CrewAI project.

2. **`evaluate_prompts`**  
   - Inputs: list of `PromptEngineOutput`, persona, `money_saver`.  
   - Behaviour: If `money_saver`, set `USE_GROQ_FOR_JUDGE=1` and Groq keys as above. For each output, run current `evaluate_prompt(engine_output, persona)` (DeepEval GEval, 5 metrics).  
   - Output: List of `EvaluationMetrics` per prompt; combine into `EvaluatedEngineOutput` list (same order as inputs).  
   - Implementation: Reuse `backend.app.evaluator.judge` and `EvaluationMetrics` / `EvaluatedEngineOutput`.

3. **`suggest_title`**  
   - Inputs: persona, summary (str), top_prompt_text (str).  
   - Behaviour: Same as current `suggest_run_title`: use `LUMINA_TITLE_MODEL`, `max_tokens=50`, same prompt templates.  
   - Output: Short title string or None.  
   - Implementation: Reuse `backend.app.title_suggestion`.

**Orchestrator agent:**
- Role: “Prompt engineering orchestrator”; goal: produce a full `FinalResponse` from a persona and flags.
- Steps (in tool calls):  
  1. Call `generate_prompts(persona, money_saver)` → engine_outputs.  
  2. If not `skip_evaluation`, call `evaluate_prompts(engine_outputs, persona, money_saver)` → results; else use placeholder evaluations.  
  3. Call `suggest_title(persona, summary, top_prompt)` → suggested_title.  
  4. Return JSON = FinalResponse(persona, results, summary, system_prompt, suggested_title).

**MONEYSAVER and tokens:** Handled inside tools via `money_saver` and env; efficiency metric and title `max_tokens` unchanged.

### 3.2 Option B: Two Crews (Preserve Two-Phase UX Exactly)
- **Crew 1 – Generate:** Inputs: persona, `money_saver`. Tool: same `generate_prompts`. Output: list of `PromptEngineOutput` + persona (and optionally placeholder results for UI).
- **Crew 2 – Evaluate:** Inputs: persona, `engine_outputs`, `money_saver`. Tool: same `evaluate_prompts`. Output: list of `EvaluatedEngineOutput`.
- **Title:** Either a third small crew/tool or part of Crew 1 (e.g. suggest_title after generate, with placeholder summary).
- **Frontend:** Phase 1 = kickoff Crew 1, show prompts when done; Phase 2 = kickoff Crew 2 with Crew 1 output, then merge and show scores. Same UX as current two-phase flow.

### 3.3 Config and Environment
- **Engine config:** Keep `engines.xml` (or equivalent) in the CrewAI project; loader reads real vs moneysaver engines. Same display names and model IDs.
- **Env in CrewAI:**  
  - MONEYSAVER: only `GROQ_API_KEY` required.  
  - Non-MONEYSAVER: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, etc., as today.  
- **Judge:** Tools set `USE_GROQ_FOR_JUDGE=1` when `money_saver=True` so judge uses Groq; no change to criteria or scoring.

---

## 4. Frontend Changes (Vercel)

### 4.1 API Client
- **Remove:** Direct calls to `http://localhost:8000` (FastAPI).
- **Add:** CrewAI AMP client:
  - Base URL: from `NEXT_PUBLIC_CREWAI_BASE_URL` (e.g. `https://your-crew-name.crewai.com`).
  - Auth: `NEXT_PUBLIC_CREWAI_BEARER_TOKEN` or server-side env (prefer server-side or Vercel env for token) for `Authorization: Bearer <token>`.
- **Flow:**  
  1. `POST /kickoff` with body `{ identity, intent, output_format, money_saver, skip_evaluation? }`.  
  2. Poll `GET /{kickoff_id}/status` until completed (or failed).  
  3. Parse final output from status response into `FinalResponse` (same TypeScript types as now).
- **Two-phase (if Option B):**  
  - Phase 1: kickoff “generate” crew → get engine_outputs → show prompts.  
  - Phase 2: kickoff “evaluate” crew with engine_outputs + persona + money_saver → get results → merge and show.

### 4.2 UI and Behaviour
- **No change:** Persona form, MONEYSAVER checkbox, evaluation matrix, engine cards, score details, **PDF export**, **Excel export**, progress (can still show a single “loading” for one crew run, or two steps for Option B). PDF and Excel are generated entirely in the browser from `FinalResponse`; no backend involvement.
- **Env:** Document `NEXT_PUBLIC_CREWAI_BASE_URL` and, if used, `NEXT_PUBLIC_CREWAI_BEARER_TOKEN` (or backend proxy for token) in README and Vercel project settings.

### 4.3 Vercel Deployment
- **Build:** `frontend` directory as root or correct `rootDirectory`; build command e.g. `npm run build`, output `out` or `.next` per Next.js config.
- **CORS:** Not needed for same-origin; if CrewAI is called from browser, ensure CrewAI allows origin or use a small serverless proxy that adds the Bearer token.

---

## 5. Implementation Checklist

### 5.1 CrewAI Project (New or in Repo)
- [ ] Create CrewAI project (e.g. `crewai/` or separate repo) with dependency on current logic.
- [ ] Implement tools: `generate_prompts`, `evaluate_prompts`, `suggest_title` (reuse or copy `backend.app` engines, evaluator, title_suggestion, models, config).
- [ ] Keep `engines.xml` and loader; ensure MONEYSAVER uses only Groq and same display names.
- [ ] Implement orchestrator agent and crew (or two crews for Option B) with inputs/outputs matching Persona and FinalResponse.
- [ ] Configure env in AMP: `GROQ_API_KEY` and others as needed.
- [ ] Deploy to CrewAI AMP; note base URL and get Bearer token.

### 5.2 Frontend Repo
- [ ] Add CrewAI client (kickoff + poll status); map response to `FinalResponse`.
- [ ] Replace `api-client.ts` usage with CrewAI client (or keep both behind a single “backend” abstraction).
- [ ] Add env vars for CrewAI URL and, if needed, token (or proxy).
- [ ] Keep persona, MONEYSAVER, and token-related copy/labels unchanged.
- [ ] **Leave PDF and Excel export unchanged:** `pdf-generator.ts`, `evaluation-matrix.tsx` (Download PDF / Download Excel), and `xlsx`/`jspdf` dependencies stay as-is; they only need the same `FinalResponse` shape from CrewAI.
- [ ] Test with MONEYSAVER on (only Groq) and off (if keys available); verify PDF and Excel downloads work after a run.

### 5.3 Vercel
- [ ] Connect Git repo; set root to `frontend` (or repo root with correct build settings).
- [ ] Set `NEXT_PUBLIC_API_URL` to empty or remove; set `NEXT_PUBLIC_CREWAI_BASE_URL` (and token if client-side).
- [ ] Deploy and verify: submit persona with MONEYSAVER on → get 6 Groq-backed results and evaluations.

### 5.4 Documentation
- [ ] README: “Frontend on Vercel, agents on CrewAI”; env for Vercel and CrewAI; MONEYSAVER unchanged (only Groq, free).
- [ ] SETUP.md: Add section for CrewAI deployment and env; keep existing MONEYSAVER and token-efficiency description.

---

## 6. Summary

| Aspect | Preservation |
|--------|--------------|
| MONEYSAVER mode | Same: only Groq for all 6 engines + judge; same display names; only `GROQ_API_KEY` required. |
| Token behaviour | Same: efficiency criterion (0–1 + reasoning), title `max_tokens=50`, system prompt wording. |
| Data contracts | Same: Persona, FinalResponse, EvaluatedEngineOutput, 5 metrics. |
| Frontend UX | Same: persona form, MONEYSAVER checkbox, matrix, **PDF export**, **Excel export**; optional two-phase via two crews. |
| PDF & Excel export | Same: client-side only; same `FinalResponse` → no changes to `pdf-generator.ts` or export buttons; keep `jspdf` and `xlsx`. |
| Deployment | Frontend: Vercel from Git; backend logic: CrewAI agents/tools calling same Python logic. |

This plan keeps all logic and behaviour, especially MONEYSAVER and token-related behaviour, while moving the frontend to Vercel and the backend to CrewAI as agents and tools.
