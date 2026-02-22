"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Info, Trophy } from "lucide-react";
import { useState, useRef, useLayoutEffect } from "react";
import type { EvaluatedEngineOutput } from "@/lib/api-client";
import { MetricBadge } from "./metric-badge";
import { ScoreDetails } from "./score-details";

interface EngineCardProps {
  result: EvaluatedEngineOutput;
  isChampion?: boolean;
  index?: number;
}

const TOOLTIP_GAP = 6;
const VIEWPORT_PAD = 8;

export function EngineCard({ result, isChampion = false, index = 0 }: EngineCardProps) {
  const [copied, setCopied] = useState(false);
  const [popupCopied, setPopupCopied] = useState(false);
  const [promptPopupOpen, setPromptPopupOpen] = useState(false);
  const [promptHover, setPromptHover] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    score: number;
    reasoning: string;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const infoBtnRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const { engine_output, evaluation, overall_score } = result;
  const promptText = engine_output.generated_prompt ?? "";

  useLayoutEffect(() => {
    if (!promptHover || !infoBtnRef.current || !tooltipRef.current) {
      setTooltipPos(null);
      return;
    }
    const br = infoBtnRef.current.getBoundingClientRect();
    const tr = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = br.top - tr.height - TOOLTIP_GAP;
    if (top < VIEWPORT_PAD) top = br.bottom + TOOLTIP_GAP;
    if (top + tr.height > vh - VIEWPORT_PAD) top = vh - tr.height - VIEWPORT_PAD;
    if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;
    let left = br.left + br.width / 2 - tr.width / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tr.width - VIEWPORT_PAD));
    setTooltipPos({ top, left });
  }, [promptHover]);

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
    if (name.includes("Mistral")) return "⛵";
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
          <div
            className="relative inline-flex"
            onMouseEnter={() => setPromptHover(true)}
            onMouseLeave={() => setPromptHover(false)}
          >
            <button
              ref={infoBtnRef}
              type="button"
              onClick={() => setPromptPopupOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
              title="View prompt"
            >
              <Info className="h-5 w-5" />
            </button>
            {promptHover && (
              <div
                ref={tooltipRef}
                role="tooltip"
                className="z-50 max-h-[min(16rem,50vh)] w-80 overflow-hidden rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-xs leading-relaxed text-zinc-200 shadow-lg"
                style={
                  tooltipPos
                    ? { position: "fixed" as const, top: tooltipPos.top, left: tooltipPos.left }
                    : { position: "fixed" as const, left: -9999, top: 0 }
                }
              >
                <div className="max-h-[14rem] overflow-y-auto whitespace-pre-wrap break-words">
                  {promptText || "No prompt generated"}
                </div>
                <p className="mt-1.5 text-[0.65rem] text-zinc-500">Click icon for full view</p>
              </div>
            )}
          </div>
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
