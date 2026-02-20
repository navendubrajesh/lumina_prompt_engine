"use client";

import { Sparkles } from "lucide-react";
import type { Persona } from "@/lib/api-client";
import { PersonaForm } from "./persona-form";

interface PersonaStudioProps {
  persona: Persona;
  onPersonaChange: (persona: Persona) => void;
  onGenerate: () => void;
  isLoading?: boolean;
  moneySaver?: boolean;
  onMoneySaverChange?: (checked: boolean) => void;
}

export function PersonaStudio({
  persona,
  onPersonaChange,
  onGenerate,
  isLoading = false,
  moneySaver = false,
  onMoneySaverChange,
}: PersonaStudioProps) {
  return (
    <aside className="w-full shrink-0 border-r border-zinc-800 bg-zinc-900/30 lg:w-80">
      <div className="sticky top-0 space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-500" />
          <h2 className="font-semibold text-zinc-50">Persona Studio</h2>
        </div>
        <PersonaForm
          value={persona}
          onChange={onPersonaChange}
          onSubmit={onGenerate}
          isLoading={isLoading}
          moneySaver={moneySaver}
          onMoneySaverChange={onMoneySaverChange}
        />
      </div>
    </aside>
  );
}
