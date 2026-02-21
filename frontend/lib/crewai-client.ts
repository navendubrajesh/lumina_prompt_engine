/**
 * CrewAI AMP API client for Lumina Prompt Engine.
 * POST /kickoff → poll GET /{kickoff_id}/status until completed → parse FinalResponse.
 */

import type { FinalResponse, Persona } from "./api-client";

const CREWAI_BASE = process.env.NEXT_PUBLIC_CREWAI_BASE_URL ?? "";
const CREWAI_TOKEN = process.env.NEXT_PUBLIC_CREWAI_BEARER_TOKEN ?? "";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 600000; // 10 min

export function isCrewAIEnabled(): boolean {
  return Boolean(CREWAI_BASE?.trim());
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (CREWAI_TOKEN) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${CREWAI_TOKEN}`;
  }
  return headers;
}

/** Kickoff request body: identity, intent, output_format, money_saver, skip_evaluation */
export interface CrewAIKickoffInputs {
  identity: string;
  intent: string;
  output_format: string;
  money_saver: boolean;
  skip_evaluation?: boolean;
}

/** Status response from GET /{kickoff_id}/status */
interface CrewAIStatusResponse {
  status?: string;
  result?: unknown;
  output?: unknown;
  [key: string]: unknown;
}

function extractFinalResponse(data: CrewAIStatusResponse): FinalResponse | null {
  const raw = data.result ?? data.output ?? data;
  if (!raw) return null;
  if (typeof raw === "object" && "persona" in raw && "results" in raw) {
    return raw as FinalResponse;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as FinalResponse;
      if (parsed.persona && Array.isArray(parsed.results)) return parsed;
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Start a crew run and poll until completed; returns FinalResponse or throws.
 */
export async function crewaiKickoff(
  inputs: CrewAIKickoffInputs
): Promise<FinalResponse> {
  if (!CREWAI_BASE?.trim()) {
    throw new Error(
      "NEXT_PUBLIC_CREWAI_BASE_URL is not set. Configure CrewAI AMP base URL or use the FastAPI backend."
    );
  }

  const kickoffRes = await fetch(`${CREWAI_BASE.replace(/\/$/, "")}/kickoff`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(inputs),
  });

  if (!kickoffRes.ok) {
    const errBody = await kickoffRes.json().catch(() => ({}));
    const message =
      (errBody as { detail?: string })?.detail ??
      (errBody as { message?: string })?.message ??
      `CrewAI kickoff failed: ${kickoffRes.status}`;
    throw new Error(message);
  }

  const kickoffData = (await kickoffRes.json()) as { kickoff_id?: string; id?: string };
  const kickoffId =
    kickoffData.kickoff_id ?? kickoffData.id ?? (kickoffData as Record<string, string>)["kickoff_id"];
  if (!kickoffId) {
    throw new Error("CrewAI did not return a kickoff_id");
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const statusRes = await fetch(
      `${CREWAI_BASE.replace(/\/$/, "")}/${kickoffId}/status`,
      { method: "GET", headers: getHeaders() }
    );
    if (!statusRes.ok) {
      throw new Error(`CrewAI status failed: ${statusRes.status}`);
    }
    const statusData = (await statusRes.json()) as CrewAIStatusResponse;
    const status = String(statusData.status ?? "").toLowerCase();

    if (status === "completed" || status === "done") {
      const final = extractFinalResponse(statusData);
      if (final) return final;
      // Result might be nested (e.g. result.outputs or result.raw_output)
      const nested = (statusData as { result?: { output?: unknown; raw_output?: unknown } }).result;
      if (nested && typeof nested === "object") {
        const fromOutput = extractFinalResponse({
          result: (nested as { output?: unknown }).output ?? (nested as { raw_output?: unknown }).raw_output,
        });
        if (fromOutput) return fromOutput;
      }
      throw new Error("CrewAI completed but result could not be parsed as FinalResponse");
    }
    if (status === "failed" || status === "error") {
      const errMsg =
        (statusData as { error?: string }).error ??
        (statusData as { message?: string }).message ??
        "Crew run failed";
      throw new Error(String(errMsg));
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("CrewAI run timed out");
}

/**
 * Run Lumina via CrewAI: one kickoff with full pipeline, returns FinalResponse.
 */
export async function runLuminaViaCrewAI(
  persona: Persona,
  moneySaver: boolean,
  skipEvaluation: boolean = false
): Promise<FinalResponse> {
  return crewaiKickoff({
    identity: persona.identity,
    intent: persona.intent,
    output_format: persona.output_format,
    money_saver: moneySaver,
    skip_evaluation: skipEvaluation,
  });
}
