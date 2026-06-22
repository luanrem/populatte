import { Building2, Check, CheckCheck, Hash, Loader, type LucideIcon, Mail, MapPin } from "lucide-react";

import { Logo } from "@/components/marketing/logo";

import styles from "./hero-mock.module.css";

interface MockFieldProps {
  /** Lucide icon shown inside the tinted chip. */
  icon: LucideIcon;
  /** Chip background — a Populatte color token, e.g. "var(--success-soft)". */
  chipColor: string;
  /** Icon color — a Populatte color token, e.g. "var(--green-600)". */
  iconColor: string;
  /** Field label (Hanken Grotesk). */
  label: string;
  /** Field value, rendered in JetBrains Mono. */
  value: string;
  /** Staggered animation delay shared by the row, its value and its check. */
  delay: string;
}

/** The four rows the mock fills, in order, with their staggered delays. */
const FIELDS: readonly MockFieldProps[] = [
  {
    icon: Building2,
    chipColor: "var(--success-soft)",
    iconColor: "var(--green-600)",
    label: "Razão Social",
    value: "Padaria Pão Quente LTDA",
    delay: "0s",
  },
  {
    icon: Hash,
    chipColor: "var(--success-soft)",
    iconColor: "var(--green-600)",
    label: "CNPJ",
    value: "12.345.678/0001-90",
    delay: "0.9s",
  },
  {
    icon: Mail,
    chipColor: "var(--gold-200)",
    iconColor: "var(--espresso-700)",
    label: "E-mail",
    value: "contato@paoquente.com",
    delay: "1.8s",
  },
  {
    icon: MapPin,
    chipColor: "var(--latte-200)",
    iconColor: "var(--espresso-600)",
    label: "Município",
    value: "Belo Horizonte / MG",
    delay: "2.7s",
  },
];

/**
 * One animated form row: tinted icon chip · label + mono value · trailing check.
 * popwash (row), popfill (value) and popchk (check) run on the shared `delay`.
 */
function MockField({ icon: Icon, chipColor, iconColor, label, value, delay }: MockFieldProps) {
  return (
    <div
      className={`${styles.fieldRow} flex items-center gap-[11px] rounded-md px-[13px] py-[11px]`}
      style={{ animationDelay: delay }}
    >
      <span
        className="grid size-7 shrink-0 place-items-center rounded-sm"
        style={{ background: chipColor }}
      >
        <Icon className="size-4" style={{ color: iconColor }} />
      </span>

      <div className="min-w-0">
        <div className="text-[13px] font-semibold" style={{ color: "var(--text-strong)" }}>
          {label}
        </div>
        <div
          className={`${styles.fieldValue} font-mono text-[12px] font-medium`}
          style={{ color: "var(--mocha-600)", animationDelay: delay }}
        >
          {value}
        </div>
      </div>

      <Check
        className={`${styles.fieldCheck} ml-auto size-[17px] shrink-0`}
        style={{ color: "var(--green-600)", animationDelay: delay }}
      />
    </div>
  );
}

/**
 * HeroMock — the right-column illustration of the public Home hero.
 *
 * A bright card on the Espresso Dark background showing the Populatte extension
 * filling a form field by field, with a floating "hours saved" badge. Purely
 * decorative, so the whole subtree is `aria-hidden` and exposes no focusable
 * targets; the CSS-only animations freeze into their final filled state under
 * `prefers-reduced-motion` (see hero-mock.module.css).
 *
 * Server Component; inherits the locked Espresso Dark from the shell — the card
 * is intentionally light (`--surface-card`), not a theme mode. Colors/radii come
 * from Populatte tokens; the only raw literals are the three present in the
 * design (the green fill wash, the header hairline and the card shadow).
 */
export function HeroMock() {
  return (
    <div className="relative" aria-hidden="true">
      <div
        className="overflow-hidden rounded-xl"
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 30px 70px rgba(0, 0, 0, 0.45)",
        }}
      >
        <header
          className="flex items-center gap-[10px] px-4 py-[13px]"
          style={{
            background: "var(--espresso-800)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Logo size={28} wordmarkWeight={700} wordmarkSize={14} />
          <span
            className="ml-auto inline-flex items-center gap-[6px] text-[11px] font-medium"
            style={{ color: "var(--latte-300)" }}
          >
            <Loader className={`${styles.spinner} size-[13px]`} style={{ color: "var(--gold-400)" }} />
            Preenchendo 1 de 6
          </span>
        </header>

        <div className="flex flex-col gap-[10px] p-[15px]">
          {FIELDS.map((field) => (
            <MockField key={field.label} {...field} />
          ))}
        </div>
      </div>

      <div
        className={`${styles.badge} absolute flex items-center gap-3 rounded-lg`}
        style={{
          right: -16,
          bottom: 26,
          padding: "12px 15px",
          background: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <span
          className="grid size-[38px] shrink-0 place-items-center rounded-md"
          style={{ background: "var(--success-soft)" }}
        >
          <CheckCheck className="size-5" style={{ color: "var(--green-600)" }} />
        </span>
        <div>
          <div
            className="font-mono text-[22px] font-extrabold leading-none tracking-[-0.02em]"
            style={{ color: "var(--espresso-900)" }}
          >
            142h
          </div>
          <div className="text-[11px] font-medium" style={{ color: "var(--mocha-600)" }}>
            economizadas este mês
          </div>
        </div>
      </div>
    </div>
  );
}
