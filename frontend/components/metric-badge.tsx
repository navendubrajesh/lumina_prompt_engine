"use client";

import { useState, useRef, useLayoutEffect } from "react";
import {
  Brain,
  FileText,
  Gauge,
  Shield,
  Zap,
} from "lucide-react";
import type { EvaluationMetrics } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const METRIC_CONFIG = [
  {
    key: "contextual_alignment" as const,
    label: "Context",
    variant: "context" as const,
    Icon: Brain,
  },
  {
    key: "instruction_clarity" as const,
    label: "Clarity",
    variant: "clarity" as const,
    Icon: FileText,
  },
  {
    key: "constraint_adherence" as const,
    label: "Adherence",
    variant: "adherence" as const,
    Icon: Gauge,
  },
  {
    key: "robustness" as const,
    label: "Robustness",
    variant: "robustness" as const,
    Icon: Shield,
  },
  {
    key: "efficiency" as const,
    label: "Efficiency",
    variant: "efficiency" as const,
    Icon: Zap,
  },
] as const;

function getScoreVariant(score: number): string {
  if (score >= 0.8) return "text-emerald-400";
  if (score >= 0.6) return "text-amber-400";
  return "text-zinc-400";
}

interface MetricBadgeProps {
  evaluation: EvaluationMetrics;
  onScoreClick?: (metricKey: keyof EvaluationMetrics, score: number, reasoning: string) => void;
  compact?: boolean;
}

const GAP = 4;
const VIEWPORT_PAD = 8;

export function MetricBadge({ evaluation, onScoreClick, compact = false }: MetricBadgeProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!hoveredKey || !wrapperRef.current || !tooltipRef.current) {
      setTooltipPosition(null);
      return;
    }
    const wr = wrapperRef.current.getBoundingClientRect();
    const tr = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = wr.top - tr.height - GAP;
    if (top < VIEWPORT_PAD) {
      top = wr.bottom + GAP;
    }
    if (top + tr.height > vh - VIEWPORT_PAD) {
      top = vh - tr.height - VIEWPORT_PAD;
    }
    if (top < VIEWPORT_PAD) {
      top = VIEWPORT_PAD;
    }

    let left = wr.left + wr.width / 2 - tr.width / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tr.width - VIEWPORT_PAD));

    setTooltipPosition({ top, left });
  }, [hoveredKey]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {METRIC_CONFIG.map(({ key, label, variant, Icon }) => {
        const score = evaluation[key];
        const reasoningKey = `${key}_reasoning` as keyof EvaluationMetrics;
        const reasoning = String(evaluation[reasoningKey] ?? "");
        const isClickable = Boolean(onScoreClick);
        const isHovered = hoveredKey === key;
        const fullText = reasoning.trim() || `${label} score: ${(score * 100).toFixed(0)}%`;
        const tooltipText = fullText.length > 50 ? `${fullText.slice(0, 50)}...` : fullText;

        return (
          <div
            key={key}
            ref={isHovered ? (el) => { wrapperRef.current = el; } : undefined}
            className="relative inline-flex"
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
          >
            <button
              type="button"
              onClick={() => onScoreClick?.(key, score, reasoning)}
              disabled={!isClickable}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
                isClickable && "cursor-pointer hover:opacity-80",
                variant === "context" && "border-blue-500/30 bg-blue-500/10 text-blue-400",
                variant === "clarity" && "border-violet-500/30 bg-violet-500/10 text-violet-400",
                variant === "adherence" && "border-amber-500/30 bg-amber-500/10 text-amber-400",
                variant === "robustness" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                variant === "efficiency" && "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
              )}
            >
              {!compact && <Icon className="h-3 w-3 shrink-0" />}
              <span>{label}</span>
              <span className={getScoreVariant(score)}>{score.toFixed(2)}</span>
            </button>
            {isHovered && tooltipText && (
              <div
                ref={tooltipRef}
                role="tooltip"
                className="z-50 rounded-t-xl rounded-b-md border border-zinc-600 bg-zinc-800 px-4 pt-4 pb-2 text-[0.525rem] text-zinc-200 shadow-lg whitespace-normal w-80 min-h-[2.75rem]"
                style={
                  tooltipPosition
                    ? { position: "fixed" as const, top: tooltipPosition.top, left: tooltipPosition.left }
                    : { position: "fixed" as const, left: -9999, top: 0 }
                }
              >
                <p className="leading-relaxed">{tooltipText}</p>
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-800" aria-hidden />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
