"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { usePageHeaderSearchControl } from "@/components/layout/page-header-context";

const DEBOUNCE_MS = 200;

interface HeaderSearchProps {
  placeholder?: string;
}

/**
 * Active search input for the global header, rendered only while a page has
 * activated header search (see `usePageHeader({ search })`). Mirrors the design
 * spec (38×268, café tokens), debounces the typed value into the shared
 * page-header state, and wires the `/` (focus) and `Esc` (clear/blur) shortcuts.
 */
export function HeaderSearch({
  placeholder = "Buscar projetos…",
}: HeaderSearchProps) {
  const { setSearchQuery } = usePageHeaderSearchControl();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Push the typed value to the shared state on a debounce so the consuming
  // page filters off a settled query rather than every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(value), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [value, setSearchQuery]);

  // Global "/" focuses the input — but never while the user is already typing
  // in a field (input/textarea/contenteditable), so "/" stays literal there.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/") return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="hidden h-[38px] w-[268px] items-center gap-2 rounded-[10px] border border-input bg-card px-3 lg:flex">
      <Search className="size-4 text-mocha-400" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setValue("");
            event.currentTarget.blur();
          }
        }}
        aria-label="Buscar projetos"
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-mocha-400 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <kbd className="rounded-[5px] border border-border bg-mocha-50 px-1.5 py-px font-mono text-[11px] font-semibold text-mocha-400">
        /
      </kbd>
    </div>
  );
}
