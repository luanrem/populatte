"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InlineEditNameProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export function InlineEditName({
  value,
  onSave,
  placeholder = "Enter name",
  className,
  isLoading: externalLoading = false,
}: InlineEditNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = externalLoading || isSaving;

  // Sync editValue when value prop changes (and not in edit mode)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Auto-select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(async () => {
    // Don't save if value unchanged
    if (editValue === value) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save changes";
      setError(message);
      // Stay in edit mode on error
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const enterEditMode = useCallback(() => {
    if (!isLoading) {
      setIsEditing(true);
    }
  }, [isLoading]);

  if (isEditing) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => void handleSave()}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="h-8"
            aria-invalid={error ? true : undefined}
          />
          {isLoading && (
            <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
          )}
        </div>
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-2",
        className
      )}
      onClick={enterEditMode}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          enterEditMode();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <span className={cn(!value && "text-muted-foreground")}>
        {value || placeholder}
      </span>
      <Pencil className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
