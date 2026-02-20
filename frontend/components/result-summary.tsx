"use client";

import { Trophy } from "lucide-react";
import type { FinalResponse } from "@/lib/api-client";

interface ResultSummaryProps {
  response: FinalResponse;
}

export function ResultSummary({ response }: ResultSummaryProps) {
  const champion = response.results[0];
  if (!champion) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <Trophy className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <p className="font-semibold text-amber-400">
            Champion: {champion.engine_output.engine_name}
          </p>
          <p className="text-sm text-zinc-400">
            Overall score: {(champion.overall_score * 100).toFixed(0)}% —{" "}
            {response.summary ?? "Top-ranked prompt for your persona."}
          </p>
        </div>
      </div>
    </div>
  );
}
