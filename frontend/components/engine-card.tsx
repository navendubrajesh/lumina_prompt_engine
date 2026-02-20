"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Info, Trophy } from "lucide-react";
import { useState } from "react";
import type { EvaluatedEngineOutput } from "@/lib/api-client";
import { MetricBadge } from "./metric-badge";
import { ScoreDetails } from "./score-details";

interface EngineCardProps {
  result: EvaluatedEngineOutput;
  isChampion?: boolean;
  index?: number;
}

export function EngineCard({ result, isChampion = false, index = 0 }: EngineCardProps) {
  const [copied, setCopied] = useState(false);
  const [popupCopied, setPopupCopied] = useState(false);
  const [promptPopupOpen, setPromptPopupOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    score: number;
    reasoning: string;
  } | null>(null);

  const { engine_output, evaluation, overall_score } = result;
  const promptText = engine_output.generated_prompt;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePopupCopy = async () => {
    await navigator.clipboard.writeText(promptText);
    setPopupCopied(true);
    setTimeout(() => setPopupCopied(false), 2000);
  };

  const handleScoreClick = (
    metricKey: keyof typeof evaluation,
    score: number,
    reasoning: string
  ) => {
    setSelectedMetric({ key: metricKey, score, reasoning });
    setDetailsOpen(true);
  };

  const getEngineIcon = (name: string) => {
    if (name.includes("GPT") || name.includes("OpenAI")) return "🤖";
    if (name.includes("Claude")) return "🌙";
    if (name.includes("Gemini")) return "⚡";
    if (name.includes("DeepSeek")) return "🔮";
    if (name.includes("Groq")) return "🚀";
    if (name.includes("Llama")) return "🦙";
    return "🤖";
  };

  return (
    <>
      <Card className="relative overflow-hidden">
        {isChampion && (
          <div className="absolute right-2 top-2 flex items-center justify-center rounded-full bg-amber-500/20 p-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <span>{getEngineIcon(engine_output.engine_name)}</span>
              {engine_output.engine_name}
            </span>
            <span className="text-xl font-bold text-emerald-400">
              {(overall_score * 100).toFixed(0)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 py-1 pt-0 pb-2">
          <button
            type="button"
            onClick={() => setPromptPopupOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
            title="View prompt"
          >
            <Info className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
            title="Copy to clipboard"
          >
            {copied ? (
              <span className="text-sm text-emerald-400">✓</span>
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-1.5 border-t border-zinc-800 pt-2">
          <MetricBadge evaluation={evaluation} onScoreClick={handleScoreClick} />
        </CardFooter>
      </Card>

      {selectedMetric && (
        <ScoreDetails
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          engineName={engine_output.engine_name}
          metricKey={selectedMetric.key}
          score={selectedMetric.score}
          reasoning={selectedMetric.reasoning}
        />
      )}

      <Dialog open={promptPopupOpen} onOpenChange={setPromptPopupOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle>Prompt — {engine_output.engine_name}</DialogTitle>
          </DialogHeader>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="overflow-y-auto rounded-r-lg border border-zinc-700 border-l-4 border-l-zinc-500 bg-zinc-950 py-3 pl-4 pr-12 min-h-[12rem] max-h-[50vh]">
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
                {promptText ? (
                  promptText
                ) : (
                  <span className="text-zinc-500">(No prompt generated)</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handlePopupCopy}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
              title="Copy to clipboard"
            >
              {popupCopied ? (
                <span className="text-sm text-emerald-400">✓</span>
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
