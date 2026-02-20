"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain,
  FileText,
  Gauge,
  Shield,
  Zap,
} from "lucide-react";

const METRIC_LABELS: Record<string, { label: string; Icon: typeof Brain }> = {
  contextual_alignment: { label: "Contextual Alignment", Icon: Brain },
  instruction_clarity: { label: "Instruction Clarity", Icon: FileText },
  constraint_adherence: { label: "Constraint Adherence", Icon: Gauge },
  robustness: { label: "Robustness", Icon: Shield },
  efficiency: { label: "Efficiency", Icon: Zap },
};

interface ScoreDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engineName: string;
  metricKey: string;
  score: number;
  reasoning: string;
}

export function ScoreDetails({
  open,
  onOpenChange,
  engineName,
  metricKey,
  score,
  reasoning,
}: ScoreDetailsProps) {
  const config = METRIC_LABELS[metricKey] ?? {
    label: metricKey.replace(/_/g, " "),
    Icon: FileText,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <config.Icon className="h-5 w-5" />
            {config.label}
          </DialogTitle>
          <DialogDescription>
            Score: <span className="font-semibold text-zinc-50">{(score * 100).toFixed(0)}%</span> — {engineName}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <p className="text-sm leading-relaxed text-zinc-300">{reasoning}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
