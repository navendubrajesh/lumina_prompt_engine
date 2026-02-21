"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import {
  generateOptimizedPrompts,
  evaluatePrompts,
  type FinalResponse,
  type Persona,
} from "@/lib/api-client";
import { EmptyState } from "@/components/empty-state";
import { EvaluationMatrix } from "@/components/evaluation-matrix";
import { PersonaStudio } from "@/components/persona-studio";

const INITIAL_PERSONA: Persona = {
  identity: "",
  intent: "",
  output_format: "",
};

// Simulated progress: ramp toward 90% over ~45s, then 100% on completion
const PROGRESS_INTERVAL_MS = 200;
const PROGRESS_RAMP_DURATION_MS = 45000;

export default function Home() {
  const [persona, setPersona] = useState<Persona>(INITIAL_PERSONA);
  const [moneySaver, setMoneySaver] = useState(false);
  const [response, setResponse] = useState<FinalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progressStartRef = useRef<number>(0);

  useEffect(() => {
    if (!isLoading) return;
    setProgress(0);
    progressStartRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - progressStartRef.current;
      const p = Math.min(90, (elapsed / PROGRESS_RAMP_DURATION_MS) * 90);
      setProgress(p);
    }, PROGRESS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLoading]);

  useEffect(() => {
    if (progress === 100 && !isLoading) {
      const t = setTimeout(() => setProgress(0), 400);
      return () => clearTimeout(t);
    }
  }, [progress, isLoading]);

  const handleGenerate = useCallback(async () => {
    setResponse(null);
    setError(null);
    setIsLoading(true);
    try {
      // Phase 1: generate prompts only (display first, order = XML)
      const data = await generateOptimizedPrompts({
        persona,
        money_saver: moneySaver,
        skip_evaluation: true,
      });
      setResponse(data);
      setProgress(100);
      setIsLoading(false);

      // Phase 2: evaluate prompts in background, then populate scores (same order as XML)
      const evalResponse = await evaluatePrompts(
        data.results.map((r) => r.engine_output),
        persona,
        moneySaver
      );
      const top = evalResponse.results[0];
      const summary =
        top != null
          ? `Generated ${evalResponse.results.length} model-specific prompts. Top scorer: ${top.engine_output.engine_name} (overall: ${top.overall_score.toFixed(2)}).`
          : data.summary;
      setResponse((prev) =>
        prev
          ? { ...prev, results: evalResponse.results, summary }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  }, [persona, moneySaver]);

  return (
    <div className="flex h-screen flex-col">
      {(isLoading || progress > 0) && (
        <div
          className="fixed left-0 right-0 top-0 z-50 h-1 bg-zinc-800"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-emerald-500 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <header className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-6 py-4">
        <Zap
          className={`h-6 w-6 text-emerald-500 ${isLoading ? "animate-blink" : ""}`}
        />
        <h1 className="text-xl font-semibold text-zinc-50">Lumina Prompt Engine</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <PersonaStudio
          persona={persona}
          onPersonaChange={setPersona}
          onGenerate={handleGenerate}
          isLoading={isLoading}
          moneySaver={moneySaver}
          onMoneySaverChange={setMoneySaver}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {error && (
            <div className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {response ? (
            <EvaluationMatrix response={response} />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
}
