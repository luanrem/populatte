import Image from "next/image";

import { cn } from "@/lib/utils";

interface LogoProps {
  /** Side length of the tinted mark square, in px. The design uses 28/30/36. */
  size?: number;
  /** Render the "Populatte" wordmark next to the mark. */
  showWordmark?: boolean;
  /** Wordmark weight — 800 (nav/footer) or 700 (hero-mock header). */
  wordmarkWeight?: 700 | 800;
  /** Wordmark font-size in px. Defaults to a size-proportional value. */
  wordmarkSize?: number;
  /** Extra classes for the outer container. */
  className?: string;
}

/** Intrinsic pixel size of public/brand/logo-mark.png (prevents CLS). */
const MARK_INTRINSIC = { width: 217, height: 256 } as const;

/**
 * Brand lockup: the Populatte cup mark inside a tinted cream square, with the
 * optional "Populatte" wordmark in Hanken Grotesk. Presentational only.
 *
 * Sizes are driven by the `size` prop (the cream square side), mirroring the
 * design's three lockups (nav 36 · footer 30 · hero-mock 28). The cream
 * (`--latte-100`) and wordmark (`--latte-50`) tokens land globally with the
 * `tokens` sub-issue (POP-38); until then the `var(token, hex)` fallbacks —
 * which mirror the token values exactly — keep the lockup faithful.
 */
export function Logo({
  size = 36,
  showWordmark = true,
  wordmarkWeight = 800,
  wordmarkSize,
  className,
}: LogoProps) {
  const markHeight = Math.round(size * 0.7);
  const fontSize = wordmarkSize ?? Math.round(size * 0.53);

  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ gap: Math.round(size * 0.28) }}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center",
          size >= 32 ? "rounded-md" : "rounded-sm",
        )}
        style={{
          width: size,
          height: size,
          background: "var(--latte-100, #fbf3e4)",
        }}
      >
        <Image
          src="/brand/logo-mark.png"
          alt={showWordmark ? "" : "Populatte"}
          width={MARK_INTRINSIC.width}
          height={MARK_INTRINSIC.height}
          style={{ height: markHeight, width: "auto", display: "block" }}
        />
      </span>

      {showWordmark && (
        <span
          className="font-sans"
          style={{
            fontWeight: wordmarkWeight,
            fontSize,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: "var(--latte-50, #fcf9f4)",
          }}
        >
          Populatte
        </span>
      )}
    </span>
  );
}
