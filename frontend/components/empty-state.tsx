"use client";

import { Lightbulb, Sparkles } from "lucide-react";

const TIPS = [
  "Be specific about your role and domain (e.g. 'ML engineer at a healthcare startup').",
  "Clearly state the task (e.g. 'Summarize patient notes into structured FHIR-compliant JSON').",
  "Define the exact output format (e.g. 'JSON with keys: diagnosis, medications, follow_up').",
];

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-12 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800">
        <Sparkles className="h-12 w-12 text-zinc-500" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-semibold text-zinc-50">
          Create your persona to get started
        </h3>
        <p className="text-sm text-zinc-400">
          Fill in the Persona Studio on the left, then click Generate & Rank.
          Lumina will optimize prompts across 5 models and rank them for you.
        </p>
      </div>
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left">
        <div className="mb-3 flex items-center gap-2 text-amber-400">
          <Lightbulb className="h-4 w-4" />
          <span className="text-sm font-medium">Tips for a good persona</span>
        </div>
        <ul className="space-y-2 text-sm text-zinc-400">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-zinc-600">{i + 1}.</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
