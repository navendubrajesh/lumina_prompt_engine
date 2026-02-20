"use client";

import { useRef, useCallback, useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, ChevronUp, ChevronDown, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import type { FinalResponse, EvaluatedEngineOutput } from "@/lib/api-client";
import { generatePDFReport } from "@/lib/pdf-generator";
import { EngineCard } from "./engine-card";
import { ResultSummary } from "./result-summary";

type SortKey = "engine" | "overall" | "context" | "clarity" | "adherence" | "robustness" | "efficiency";
type SortDir = "asc" | "desc";

interface EvaluationMatrixProps {
  response: FinalResponse;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

const SUMMARY_TABLE_ID = "summary-table";

function getSortValue(result: EvaluatedEngineOutput, key: SortKey): string | number {
  switch (key) {
    case "engine":
      return result.engine_output.engine_name;
    case "overall":
      return result.overall_score;
    case "context":
      return result.evaluation.contextual_alignment;
    case "clarity":
      return result.evaluation.instruction_clarity;
    case "adherence":
      return result.evaluation.constraint_adherence;
    case "robustness":
      return result.evaluation.robustness;
    case "efficiency":
      return result.evaluation.efficiency;
    default:
      return 0;
  }
}

export function EvaluationMatrix({ response }: EvaluationMatrixProps) {
  const tableRef = useRef<HTMLElement>(null);
  const [sortColumn, setSortColumn] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [runName, setRunName] = useState<string>(() => response.suggested_title?.trim() ?? "");

  useEffect(() => {
    const suggested = response.suggested_title?.trim() ?? "";
    setRunName(suggested);
  }, [response.suggested_title]);

  const sortedResults = useMemo(() => {
    if (!sortColumn) return response.results;
    const list = [...response.results];
    list.sort((a, b) => {
      const va = getSortValue(a, sortColumn);
      const vb = getSortValue(b, sortColumn);
      const cmp = typeof va === "string" && typeof vb === "string"
        ? va.localeCompare(vb)
        : (va as number) - (vb as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [response.results, sortColumn, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortColumn === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDir("asc");
    }
  };

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const downloadExcel = useCallback(() => {
    const headers = [
      "Engine",
      "Overall %",
      "Context",
      "Clarity",
      "Adherence",
      "Robustness",
      "Efficiency",
      "Prompt",
      "Context (reasoning)",
      "Clarity (reasoning)",
      "Adherence (reasoning)",
      "Robustness (reasoning)",
      "Efficiency (reasoning)",
    ];
    const rows = response.results.map((result) => [
      result.engine_output.engine_name,
      (result.overall_score * 100).toFixed(0) + "%",
      result.evaluation.contextual_alignment.toFixed(2),
      result.evaluation.instruction_clarity.toFixed(2),
      result.evaluation.constraint_adherence.toFixed(2),
      result.evaluation.robustness.toFixed(2),
      result.evaluation.efficiency.toFixed(2),
      result.engine_output.generated_prompt ?? "",
      result.evaluation.contextual_alignment_reasoning ?? "",
      result.evaluation.instruction_clarity_reasoning ?? "",
      result.evaluation.constraint_adherence_reasoning ?? "",
      result.evaluation.robustness_reasoning ?? "",
      result.evaluation.efficiency_reasoning ?? "",
    ]);
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    const filename = `lumina-summary-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  }, [response.results]);

  const downloadPDF = useCallback(async () => {
    try {
      await generatePDFReport(response, runName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF report. Please try again.");
    }
  }, [response, runName]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden p-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="run-name" className="text-sm font-medium text-zinc-300">
          Run name <span className="text-zinc-500">(pre-filled with suggested name; edit as needed)</span>
        </label>
        <input
          id="run-name"
          type="text"
          value={runName}
          onChange={(e) => setRunName(e.target.value)}
          placeholder="Run name (e.g. User Story prompt)"
          className="w-full max-w-md rounded-md border border-zinc-600 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
      </div>
      <ResultSummary response={response} />
      <button
        type="button"
        onClick={scrollToTable}
        className="self-start rounded-md border border-zinc-600 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-700/80 hover:text-zinc-200"
      >
        ↓ Jump to summary table
      </button>
      <motion.div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {response.results.map((result, index) => (
          <motion.div key={result.engine_output.engine_name} variants={itemVariants}>
            <EngineCard
              result={result}
              isChampion={index === 0}
              index={index}
            />
          </motion.div>
        ))}
      </motion.div>

      <section
        ref={tableRef}
        id={SUMMARY_TABLE_ID}
        className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-800/50 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-200">Summary table</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadPDF}
              className="flex items-center gap-2 rounded-md border border-zinc-600 bg-zinc-700/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/50 hover:bg-zinc-600/80 hover:text-emerald-400"
            >
              <FileText className="h-4 w-4" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={downloadExcel}
              className="flex items-center gap-2 rounded-md border border-zinc-600 bg-zinc-700/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/50 hover:bg-zinc-600/80 hover:text-emerald-400"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("engine")}
                    className="flex items-center gap-1 hover:text-zinc-200"
                  >
                    Engine
                    {sortColumn === "engine" && (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("overall")}
                    className="ml-auto flex items-center justify-end gap-1 hover:text-zinc-200"
                  >
                    Overall %
                    {sortColumn === "overall" && (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("context")}
                    className="ml-auto flex items-center justify-end gap-1 hover:text-zinc-200"
                  >
                    Context
                    {sortColumn === "context" && (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("clarity")}
                    className="ml-auto flex items-center justify-end gap-1 hover:text-zinc-200"
                  >
                    Clarity
                    {sortColumn === "clarity" && (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("adherence")}
                    className="ml-auto flex items-center justify-end gap-1 hover:text-zinc-200"
                  >
                    Adherence
                    {sortColumn === "adherence" && (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("robustness")}
                    className="ml-auto flex items-center justify-end gap-1 hover:text-zinc-200"
                  >
                    Robustness
                    {sortColumn === "robustness" && (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("efficiency")}
                    className="ml-auto flex items-center justify-end gap-1 hover:text-zinc-200"
                  >
                    Efficiency
                    {sortColumn === "efficiency" && (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result, index) => (
                <tr
                  key={result.engine_output.engine_name}
                  className={`border-b border-zinc-800 ${index === 0 ? "bg-emerald-500/5" : ""}`}
                >
                  <td className="max-w-[200px] break-words px-4 py-3 font-medium text-zinc-100">
                    {result.engine_output.engine_name}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400">
                    {(result.overall_score * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {result.evaluation.contextual_alignment.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {result.evaluation.instruction_clarity.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {result.evaluation.constraint_adherence.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {result.evaluation.robustness.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {result.evaluation.efficiency.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
