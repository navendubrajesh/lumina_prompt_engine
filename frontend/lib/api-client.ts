/**
 * API client for Lumina Prompt Engine backend.
 * Connects to FastAPI at http://localhost:8000
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// TypeScript interfaces (match backend Pydantic models)
// ---------------------------------------------------------------------------

export interface Persona {
  identity: string;
  intent: string;
  output_format: string;
}

export interface PromptEngineOutput {
  engine_name: string;
  generated_prompt: string;
  raw_response: string | null;
}

export interface EvaluationMetrics {
  contextual_alignment: number;
  contextual_alignment_reasoning: string;
  instruction_clarity: number;
  instruction_clarity_reasoning: string;
  constraint_adherence: number;
  constraint_adherence_reasoning: string;
  robustness: number;
  robustness_reasoning: string;
  efficiency: number;
  efficiency_reasoning: string;
}

export interface EvaluatedEngineOutput {
  engine_output: PromptEngineOutput;
  evaluation: EvaluationMetrics;
  overall_score: number;
}

export interface FinalResponse {
  persona: Persona;
  results: EvaluatedEngineOutput[];
  summary: string | null;
  system_prompt?: string | null;
  suggested_title?: string | null;
}

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------

export interface ApiError {
  detail: string;
}

export interface GenerateOptimizedPromptsOptions {
  persona: Persona;
  money_saver?: boolean;
  skip_evaluation?: boolean;
}

export interface EvaluatePromptsResponse {
  results: EvaluatedEngineOutput[];
}

export async function generateOptimizedPrompts(
  options: GenerateOptimizedPromptsOptions | Persona
): Promise<FinalResponse> {
  const body =
    "persona" in options && options.persona
      ? {
          ...options.persona,
          money_saver: (options as GenerateOptimizedPromptsOptions).money_saver ?? false,
          skip_evaluation: (options as GenerateOptimizedPromptsOptions).skip_evaluation ?? false,
        }
      : { ...(options as Persona), money_saver: false, skip_evaluation: false };

  try {
    const response = await fetch(`${API_BASE}/generate-optimized-prompts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody: ApiError | string = await response.json().catch(() => "Unknown error");
      const message = typeof errorBody === "object" ? errorBody.detail : String(errorBody);
      throw new Error(message || `HTTP ${response.status}`);
    }

    return response.json() as Promise<FinalResponse>;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error(
        `Failed to connect to backend at ${API_BASE}. ` +
        `Make sure the backend is running: uvicorn backend.main:app --reload --port 8000`
      );
    }
    throw err;
  }
}

export async function evaluatePrompts(
  engine_outputs: PromptEngineOutput[],
  persona: Persona,
  money_saver: boolean
): Promise<EvaluatePromptsResponse> {
  const response = await fetch(`${API_BASE}/evaluate-prompts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ persona, engine_outputs, money_saver }),
  });

  if (!response.ok) {
    const errorBody: ApiError | string = await response.json().catch(() => "Unknown error");
    const message = typeof errorBody === "object" ? errorBody.detail : String(errorBody);
    throw new Error(message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<EvaluatePromptsResponse>;
}
