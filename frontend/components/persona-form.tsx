"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Persona } from "@/lib/api-client";

interface PersonaFormProps {
  value: Persona;
  onChange: (persona: Persona) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  moneySaver?: boolean;
  onMoneySaverChange?: (checked: boolean) => void;
}

export function PersonaForm({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  moneySaver = false,
  onMoneySaverChange,
}: PersonaFormProps) {
  const handleChange = (field: keyof Persona) => (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    onChange({ ...value, [field]: e.target.value });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="money_saver"
          checked={moneySaver}
          onChange={(e) => onMoneySaverChange?.(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
        />
        <Label htmlFor="money_saver" className="cursor-pointer text-sm font-normal text-zinc-400">
          MONEYSAVER mode (only Groq, free)
        </Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="identity">Who am I?</Label>
        <Textarea
          id="identity"
          placeholder="e.g. Senior data scientist at a fintech startup"
          value={value.identity}
          onChange={handleChange("identity")}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="intent">What I want to do.</Label>
        <Textarea
          id="intent"
          placeholder="e.g. Extract structured insights from customer feedback"
          value={value.intent}
          onChange={handleChange("intent")}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="output_format">Constraints / Output format</Label>
        <Textarea
          id="output_format"
          placeholder="e.g. JSON with keys: sentiment, themes, action_items"
          value={value.output_format}
          onChange={handleChange("output_format")}
          rows={2}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isLoading || !value.identity.trim()}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Scanning models...
          </span>
        ) : (
          "Generate & Rank"
        )}
      </Button>
    </form>
  );
}
