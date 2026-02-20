import jsPDF from "jspdf";
import type { FinalResponse, EvaluatedEngineOutput } from "@/lib/api-client";

const PAGE_HEIGHT_MM = 297;
const PAGE_WIDTH_MM = 210;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH_MM - MARGIN * 2;
const LINE_HEIGHT = 5;
const SMALL_LINE = 4;

function ensureSpace(pdf: jsPDF, yPos: number, needed: number): number {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (yPos + needed > pageHeight - MARGIN) {
    pdf.addPage();
    pdf.setFillColor(18, 18, 20);
    pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, "F");
    return MARGIN;
  }
  return yPos;
}

function drawWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number
): number {
  if (!text || !text.trim()) {
    pdf.setFontSize(fontSize);
    pdf.text("(No description)", x, y);
    return y + lineHeight;
  }
  pdf.setFontSize(fontSize);
  const lines = pdf.splitTextToSize(text.trim(), maxWidth);
  lines.forEach((line: string) => {
    pdf.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

const METRIC_COLORS = {
  context: { bg: [20, 30, 50], border: [59, 130, 246], text: [96, 165, 250] },
  clarity: { bg: [30, 25, 45], border: [139, 92, 246], text: [167, 139, 250] },
  adherence: { bg: [50, 40, 20], border: [245, 158, 11], text: [251, 191, 36] },
  robustness: { bg: [20, 40, 30], border: [16, 185, 129], text: [52, 211, 153] },
  efficiency: { bg: [20, 40, 45], border: [6, 182, 212], text: [103, 232, 249] },
};

function getScoreColor(score: number): string {
  if (score >= 0.8) return "rgb(52, 211, 153)";
  if (score >= 0.6) return "rgb(251, 191, 36)";
  return "rgb(161, 161, 170)";
}

function drawBadge(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  score: number,
  variant: keyof typeof METRIC_COLORS
): number {
  const colors = METRIC_COLORS[variant];
  const scoreText = score.toFixed(2);
  const scoreColor = getScoreColor(score);
  const scoreRgb = scoreColor.match(/\d+/g);
  
  pdf.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
  pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
  pdf.setLineWidth(0.5);
  
  const padding = 2;
  const textHeight = 4;
  const badgeHeight = textHeight + padding * 2;
  pdf.setFontSize(8);
  const labelWidth = pdf.getTextWidth(label);
  const scoreWidth = pdf.getTextWidth(scoreText);
  const badgeWidth = labelWidth + scoreWidth + 8;
  
  try {
    (pdf as any).roundedRect(x, y, badgeWidth, badgeHeight, 1, 1, "FD");
  } catch {
    pdf.rect(x, y, badgeWidth, badgeHeight, "FD");
  }
  
  pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  pdf.setFontSize(8);
  pdf.text(label, x + padding, y + textHeight + padding);
  
  if (scoreRgb && scoreRgb.length >= 3) {
    pdf.setTextColor(parseInt(scoreRgb[0]), parseInt(scoreRgb[1]), parseInt(scoreRgb[2]));
  }
  pdf.text(scoreText, x + badgeWidth - scoreWidth - padding, y + textHeight + padding);
  
  return badgeWidth + 2;
}

export async function generatePDFReport(response: FinalResponse): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPos = MARGIN;

  pdf.setFillColor(18, 18, 20);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Lumina Prompt Engine - Evaluation Report", MARGIN, yPos);
  yPos += 10;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Generated on: ${dateStr}`, MARGIN, yPos);
  yPos += 14;

  // ---------- Who am I? / What I want to do / Constraints (persona) ----------
  const persona = response.persona;
  const identity = persona?.identity?.trim() ?? "";
  const intent = persona?.intent?.trim() ?? "";
  const outputFormat = persona?.output_format?.trim() ?? "";

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(200, 200, 200);
  pdf.text("Who am I?", MARGIN, yPos);
  yPos += 6;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(212, 212, 216);
  yPos = drawWrappedText(pdf, identity || "(Not specified)", MARGIN, yPos, CONTENT_WIDTH, 10, LINE_HEIGHT);
  yPos += 6;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(200, 200, 200);
  pdf.text("What I want to do.", MARGIN, yPos);
  yPos += 6;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(212, 212, 216);
  yPos = drawWrappedText(pdf, intent || "(Not specified)", MARGIN, yPos, CONTENT_WIDTH, 10, LINE_HEIGHT);
  yPos += 6;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(200, 200, 200);
  pdf.text("Constraints / Output format.", MARGIN, yPos);
  yPos += 6;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(212, 212, 216);
  yPos = drawWrappedText(pdf, outputFormat || "(Not specified)", MARGIN, yPos, CONTENT_WIDTH, 10, LINE_HEIGHT);
  yPos += 10;

  // ---------- System prompt in grey box (label + text, italics), then Champion ----------
  const systemPromptText =
    response.system_prompt?.trim() ||
    `You are an Expert Prompt Engineer. Your objective is to synthesize a user's raw inputs (Identity, Intent, and Output Format) into a single, highly optimized prompt designed to run on any major LLM.

You must engineer the final prompt by strictly applying the following five principles:

1. Context: Firmly establish the persona, domain expertise, and perspective based on the 'Identity'. Provide exact framing so the target LLM assumes the correct role immediately.
2. Clarity: Translate the 'Intent' into precise, unambiguous, and direct action verbs. The core task must be instantly comprehensible, leaving no room for misinterpretation.
3. Adherence: Treat the 'Output Format' as strict boundaries. Explicitly state all structural rules, formatting requirements, and length limits as non-negotiable constraints.
4. Efficiency: Make the prompt concise and token-efficient. Strip away conversational filler, redundant instructions, and user fluff. Every word must serve a functional purpose.
5. Robustness: Structure the prompt to yield consistent, predictable results across different LLM architectures. Use clear section headers (e.g., Context, Task, Constraints) and bullet points to prevent hallucinations and edge-case failures.

Zero Preamble: Output ONLY the exact text of the engineered prompt. Do not include introductory text, conversational filler, or meta-commentary.`;

  pdf.setFontSize(9);
  const sysPromptLines = pdf.splitTextToSize(systemPromptText.trim(), CONTENT_WIDTH - 12);
  const boxPadding = 6;
  const labelHeight = 6;
  const gapAfterLabel = 4;
  const systemPromptBoxHeight =
    boxPadding + labelHeight + gapAfterLabel + sysPromptLines.length * SMALL_LINE + boxPadding;

  yPos = ensureSpace(pdf, yPos, systemPromptBoxHeight + 10);

  pdf.setFillColor(58, 58, 62);
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.3);
  try {
    (pdf as any).roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, systemPromptBoxHeight, 2, 2, "FD");
  } catch {
    pdf.rect(MARGIN, yPos, pageWidth - MARGIN * 2, systemPromptBoxHeight, "FD");
  }
  const innerX = MARGIN + boxPadding;
  pdf.setFontSize(11);
  pdf.setFont("times", "italic");
  pdf.setTextColor(212, 212, 216);
  pdf.text("System prompt", innerX, yPos + boxPadding + 4);
  let innerY = yPos + boxPadding + labelHeight + gapAfterLabel + SMALL_LINE;
  pdf.setFontSize(9);
  sysPromptLines.forEach((line: string) => {
    pdf.text(line, innerX, innerY);
    innerY += SMALL_LINE;
  });
  yPos = yPos + systemPromptBoxHeight + 8;

  pdf.setFont("helvetica", "normal");

  // ---------- Champion / Summary (before individual details) ----------
  const champion = response.results[0];
  const numPrompts = response.results.length;
  const championName = champion?.engine_output.engine_name ?? "—";
  const championScore = champion ? (champion.overall_score * 100).toFixed(0) : "—";
  const championScoreDecimal = champion ? champion.overall_score.toFixed(2) : "—";

  pdf.addPage();
  pdf.setFillColor(18, 18, 20);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  yPos = MARGIN;

  pdf.setFillColor(45, 40, 30);
  pdf.setDrawColor(120, 100, 60);
  pdf.setLineWidth(0.3);
  try {
    (pdf as any).roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, 28, 2, 2, "FD");
  } catch {
    pdf.rect(MARGIN, yPos, pageWidth - MARGIN * 2, 28, "FD");
  }

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(251, 191, 36);
  pdf.text(`Champion: ${championName}`, MARGIN + 6, yPos + 8);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(212, 212, 216);
  pdf.text(`Overall score: ${championScore}%`, MARGIN + 6, yPos + 14);
  pdf.text(`— Generated ${numPrompts} model-specific prompts.`, MARGIN + 6, yPos + 20);
  pdf.text(`Top scorer: ${championName} (overall: ${championScoreDecimal}).`, MARGIN + 6, yPos + 26);

  yPos += 34;

  // ---------- SUMMARY: Metric Badges (as in previous version) ----------
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("Metric Badges", MARGIN, yPos);
  yPos += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  response.results.forEach((result, index) => {
    yPos = ensureSpace(pdf, yPos, 40);
    if (yPos === MARGIN && index > 0) yPos += 5;

    const engineName =
      result.engine_output.engine_name.length > 40
        ? result.engine_output.engine_name.substring(0, 37) + "..."
        : result.engine_output.engine_name;
    const scorePct = (result.overall_score * 100).toFixed(0);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${index + 1}. ${engineName} (${scorePct}%)`, MARGIN, yPos);
    yPos += 6;

    let xPos = MARGIN;
    const badges = [
      { label: "Context", score: result.evaluation.contextual_alignment, variant: "context" as const },
      { label: "Clarity", score: result.evaluation.instruction_clarity, variant: "clarity" as const },
      { label: "Adherence", score: result.evaluation.constraint_adherence, variant: "adherence" as const },
      { label: "Robustness", score: result.evaluation.robustness, variant: "robustness" as const },
      { label: "Efficiency", score: result.evaluation.efficiency, variant: "efficiency" as const },
    ];

    badges.forEach((badge) => {
      const badgeWidth = drawBadge(pdf, xPos, yPos, badge.label, badge.score, badge.variant);
      xPos += badgeWidth;
      if (xPos > pageWidth - MARGIN - 30) {
        xPos = MARGIN;
        yPos += 10;
      }
    });
    yPos += 10;

    if (index < response.results.length - 1) {
      pdf.setDrawColor(50, 50, 50);
      pdf.setLineWidth(0.2);
      pdf.line(MARGIN, yPos, pageWidth - MARGIN, yPos);
      yPos += 5;
    }
  });

  yPos += 10;
  yPos = ensureSpace(pdf, yPos, 80);

  // ---------- SUMMARY: Summary Table ----------
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("Summary Table", MARGIN, yPos);
  yPos += 8;

  const colWidths = [35, 25, 20, 20, 20, 20, 20];
  const headers = ["Engine", "Overall %", "Context", "Clarity", "Adherence", "Robustness", "Efficiency"];

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(200, 200, 200);

  let x = MARGIN;
  headers.forEach((header, i) => {
    pdf.setFillColor(30, 30, 30);
    pdf.rect(x, yPos, colWidths[i], 8, "F");
    pdf.setTextColor(200, 200, 200);
    pdf.text(header, x + 2, yPos + 5);
    x += colWidths[i];
  });

  yPos += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  response.results.forEach((result) => {
    if (yPos > pageHeight - 20) {
      pdf.addPage();
      pdf.setFillColor(18, 18, 20);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      yPos = MARGIN;
      x = MARGIN;
      headers.forEach((header, i) => {
        pdf.setFillColor(30, 30, 30);
        pdf.rect(x, yPos, colWidths[i], 8, "F");
        pdf.setTextColor(200, 200, 200);
        pdf.setFont("helvetica", "bold");
        pdf.text(header, x + 2, yPos + 5);
        x += colWidths[i];
      });
      yPos += 8;
      pdf.setFont("helvetica", "normal");
    }

    pdf.setFillColor(24, 24, 27);
    pdf.rect(MARGIN, yPos, pageWidth - MARGIN * 2, 7, "F");

    x = MARGIN;
    const rowData = [
      result.engine_output.engine_name,
      `${(result.overall_score * 100).toFixed(0)}%`,
      result.evaluation.contextual_alignment.toFixed(2),
      result.evaluation.instruction_clarity.toFixed(2),
      result.evaluation.constraint_adherence.toFixed(2),
      result.evaluation.robustness.toFixed(2),
      result.evaluation.efficiency.toFixed(2),
    ];

    rowData.forEach((cell, i) => {
      pdf.setTextColor(255, 255, 255);
      if (i === 1) pdf.setTextColor(52, 211, 153);
      const cellText = i === 0 && cell.length > 20 ? cell.substring(0, 17) + "..." : cell;
      pdf.text(cellText, x + 2, yPos + 5);
      x += colWidths[i];
    });

    yPos += 7;
  });

  yPos += 12;
  yPos = ensureSpace(pdf, yPos, 80);

  // ---------- DETAILED RESULTS: Full details per LLM ----------
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("Detailed Results", MARGIN, yPos);
  yPos += 10;

  response.results.forEach((result, index) => {
    yPos = ensureSpace(pdf, yPos, 45);
    if (yPos === MARGIN && index > 0) yPos += 5;

    const engineName =
      result.engine_output.engine_name.length > 45
        ? result.engine_output.engine_name.substring(0, 42) + "..."
        : result.engine_output.engine_name;
    const scorePct = (result.overall_score * 100).toFixed(0);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${index + 1}. ${engineName} (${scorePct}%)`, MARGIN, yPos);
    yPos += 7;

    let xPos = MARGIN;
    const badges = [
      { label: "Context", score: result.evaluation.contextual_alignment, variant: "context" as const },
      { label: "Clarity", score: result.evaluation.instruction_clarity, variant: "clarity" as const },
      { label: "Adherence", score: result.evaluation.constraint_adherence, variant: "adherence" as const },
      { label: "Robustness", score: result.evaluation.robustness, variant: "robustness" as const },
      { label: "Efficiency", score: result.evaluation.efficiency, variant: "efficiency" as const },
    ];

    badges.forEach((badge) => {
      const badgeWidth = drawBadge(pdf, xPos, yPos, badge.label, badge.score, badge.variant);
      xPos += badgeWidth;
      if (xPos > pageWidth - MARGIN - 30) {
        xPos = MARGIN;
        yPos += 10;
      }
    });
    yPos += 14;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(200, 200, 200);
    pdf.text("Prompt", MARGIN, yPos);
    yPos += 6;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(241, 184, 2);
    const promptText = result.engine_output.generated_prompt ?? "(No prompt generated)";
    yPos = drawWrappedText(pdf, promptText, MARGIN, yPos, CONTENT_WIDTH, 9, LINE_HEIGHT);
    yPos += 8;

    const metricSections: Array<{
      title: string;
      value: number;
      description: string;
      color: [number, number, number];
    }> = [
      {
        title: "Context",
        value: result.evaluation.contextual_alignment,
        description: result.evaluation.contextual_alignment_reasoning ?? "",
        color: [96, 165, 250],
      },
      {
        title: "Clarity",
        value: result.evaluation.instruction_clarity,
        description: result.evaluation.instruction_clarity_reasoning ?? "",
        color: [167, 139, 250],
      },
      {
        title: "Adherence",
        value: result.evaluation.constraint_adherence,
        description: result.evaluation.constraint_adherence_reasoning ?? "",
        color: [251, 191, 36],
      },
      {
        title: "Robustness",
        value: result.evaluation.robustness,
        description: result.evaluation.robustness_reasoning ?? "",
        color: [52, 211, 153],
      },
      {
        title: "Efficiency",
        value: result.evaluation.efficiency,
        description: result.evaluation.efficiency_reasoning ?? "",
        color: [103, 232, 249],
      },
    ];

    metricSections.forEach((section) => {
      yPos = ensureSpace(pdf, yPos, 25);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(section.color[0], section.color[1], section.color[2]);
      pdf.text(`${section.title}: ${section.value.toFixed(2)}`, MARGIN, yPos);
      yPos += 5;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(212, 212, 216);
      yPos = drawWrappedText(pdf, section.description, MARGIN, yPos, CONTENT_WIDTH, 9, SMALL_LINE);
      yPos += 6;
    });

    yPos += 5;
    if (index < response.results.length - 1) {
      pdf.setDrawColor(50, 50, 50);
      pdf.setLineWidth(0.2);
      pdf.line(MARGIN, yPos, pageWidth - MARGIN, yPos);
      yPos += 6;
    }
  });

  yPos += 24;
  yPos = ensureSpace(pdf, yPos, 50);
  const endY = yPos + 20;
  pdf.setDrawColor(100, 90, 130);
  pdf.setLineWidth(0.4);
  pdf.line(MARGIN * 2, endY - 2, pageWidth - MARGIN * 2, endY - 2);
  pdf.setFont("times", "italic");
  pdf.setTextColor(88, 80, 120);
  pdf.setFontSize(14);
  const endOfStr = "End of";
  const reportsStr = "Reports";
  const w1 = pdf.getTextWidth(endOfStr);
  const w2 = pdf.getTextWidth(reportsStr);
  pdf.text(endOfStr, (pageWidth - w1) / 2, endY + 8);
  pdf.setFontSize(22);
  const w2Actual = pdf.getTextWidth(reportsStr);
  pdf.text(reportsStr, (pageWidth - w2Actual) / 2, endY + 22);
  pdf.setDrawColor(100, 90, 130);
  pdf.line(MARGIN * 2, endY + 30, pageWidth - MARGIN * 2, endY + 30);

  const totalPages = pdf.getNumberOfPages();
  const footerY = pageHeight - MARGIN;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(180, 180, 180);
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerText = `Page ${i} of ${totalPages}`;
    const footerW = pdf.getTextWidth(footerText);
    pdf.text(footerText, (pageWidth - footerW) / 2, footerY);
  }

  const filename = `lumina-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(filename);
}
