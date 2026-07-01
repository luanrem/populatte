"use client";

import { Check, ChevronRight, Info } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Step definition (static copy — PT‑BR)                              */
/* ------------------------------------------------------------------ */

interface StepDef {
  number: number;
  title: string;
  pendingSub: string;
  doneSub: string;
}

const STEPS: StepDef[] = [
  {
    number: 1,
    title: "Importar",
    pendingSub: "Envie a primeira planilha",
    doneSub: "Planilha enviada",
  },
  {
    number: 2,
    title: "Significado dos dados",
    pendingSub: "Rotule as colunas",
    doneSub: "Rotule as colunas",
  },
  {
    number: 3,
    title: "Mapear",
    pendingSub: "na extensão · ✓ ao salvar",
    doneSub: "na extensão · ✓ ao salvar",
  },
  {
    number: 4,
    title: "Preencher",
    pendingSub: "abre a extensão",
    doneSub: "abre a extensão",
  },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectConfigBandProps {
  /** 1‑based index of the step marked as "Agora" (current). */
  currentStep: number;
  /** Whether the band is rendered at all. */
  visible: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProjectConfigBand({
  currentStep,
  visible,
}: ProjectConfigBandProps) {
  if (!visible) return null;

  return (
    <div className="rounded-lg border border-latte-300 bg-latte-50 p-[18px_20px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <span className="font-bold text-[15px] leading-none text-espresso-800">
          Configuração do projeto
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Info className="size-3.5" />
          Ensina e some quando os 4 passos terminarem
        </span>
      </div>

      {/* Steps row */}
      <div className="mt-[15px] flex items-stretch gap-2 flex-wrap">
        {STEPS.map((step, i) => (
          <div key={step.number} className="flex items-stretch gap-2">
            <StepCard
              step={step}
              state={stepState(step.number, currentStep)}
            />
            {i < STEPS.length - 1 && (
              <div className="grid place-items-center">
                <ChevronRight className="size-[18px] text-mocha-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step state derivation                                              */
/* ------------------------------------------------------------------ */

type StepState = "done" | "current" | "pending";

function stepState(stepNumber: number, currentStep: number): StepState {
  if (stepNumber < currentStep) return "done";
  if (stepNumber === currentStep) return "current";
  return "pending";
}

/* ------------------------------------------------------------------ */
/*  StepCard sub‑component                                             */
/* ------------------------------------------------------------------ */

interface StepCardProps {
  step: StepDef;
  state: StepState;
}

function StepCard({ step, state }: StepCardProps) {
  const isDone = state === "done";
  const isCurrent = state === "current";

  return (
    <div
      aria-current={isCurrent ? "step" : undefined}
      className={[
        "flex-1 min-w-[170px] rounded-[12px] px-[14px] py-[13px] transition-colors",
        isDone &&
          "border border-success/40 bg-success-soft",
        isCurrent &&
          "border-[1.5px] border-gold bg-card shadow-xs",
        !isDone && !isCurrent &&
          "border border-border bg-card",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Circle + badge row */}
      <div className="mb-[9px] flex items-center gap-2">
        {isDone ? (
          <>
            <span className="inline-grid size-6 place-items-center rounded-full bg-success text-white">
              <Check className="size-3.5" />
            </span>
            <span className="font-bold font-mono text-[10px] text-success-text">
              {String(step.number).padStart(2, "0")}
            </span>
          </>
        ) : (
          <>
            <span
              className={[
                "inline-grid size-6 place-items-center rounded-full text-xs font-bold",
                isCurrent
                  ? "bg-gold text-espresso-950"
                  : "bg-mocha-100 text-mocha-500",
              ].join(" ")}
            >
              {step.number}
            </span>
            {isCurrent && (
              <span className="font-bold text-[9px] uppercase tracking-[0.05em] text-gold-700">
                Agora
              </span>
            )}
          </>
        )}
      </div>

      {/* Title */}
      <div
        className={[
          "font-bold text-sm leading-[1.15]",
          isDone ? "text-success-text" : "text-foreground",
        ].join(" ")}
      >
        {step.title}
      </div>

      {/* Subtitle */}
      <div
        className={[
          "mt-[3px] text-[11px] leading-[1.35]",
          isDone
            ? "text-success-text"
            : isCurrent
              ? "text-muted-foreground"
              : "text-mocha-400",
        ].join(" ")}
      >
        {isDone ? step.doneSub : step.pendingSub}
      </div>
    </div>
  );
}