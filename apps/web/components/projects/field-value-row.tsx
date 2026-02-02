"use client";

import { useState } from "react";
import { CheckCheck, Copy } from "lucide-react";

interface FieldValueRowProps {
  value: string;
  count?: number;
}

export function FieldValueRow({ value, count }: FieldValueRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy value:", error);
    }
  };

  return (
    <div className="group flex items-center justify-between px-4 py-3 border-b transition-colors hover:bg-muted/50">
      <p className="min-w-0 flex-1 truncate text-sm mr-4" title={value}>
        {value}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {count !== undefined && count > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
        <button
          type="button"
          aria-label="Copy value"
          className="rounded p-1 opacity-100 transition-opacity hover:bg-muted md:opacity-0 md:group-hover:opacity-100"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckCheck className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
