"use client";

import { useState } from "react";
import { useDropzone, type DropzoneOptions, type FileRejection } from "react-dropzone";
import {
  ArrowRight,
  CheckCheck,
  File as FileIcon,
  FileSpreadsheet,
  FileUp,
  Info,
  Loader2,
  Plus,
  Rows3,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUploadBatch } from "@/lib/query/hooks/use-batches";

type ImportMode = "LIST_MODE" | "PROFILE_MODE";

interface UploadBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface ImportModeOption {
  value: ImportMode;
  title: string;
  description: string;
  icon: typeof Rows3;
  iconTileClassName: string;
  iconClassName: string;
}

const MODE_OPTIONS: ImportModeOption[] = [
  {
    value: "LIST_MODE",
    title: "Uma linha por registro",
    description: "Vários registros numa planilha — cada linha é um.",
    icon: Rows3,
    iconTileClassName: "bg-mocha-100",
    iconClassName: "text-mocha-500",
  },
  {
    value: "PROFILE_MODE",
    title: "Um arquivo por registro",
    description: "Os campos estão em células (A1, B2…) — a planilha é um registro só.",
    icon: FileIcon,
    iconTileClassName: "bg-latte-100",
    iconClassName: "text-espresso-700",
  },
];

function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.max(1, Math.round(kb))} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function UploadBatchModal({
  open,
  onOpenChange,
  projectId,
}: UploadBatchModalProps) {
  // Manual mode selection with a sensible default (no auto-detection).
  const [selectedMode, setSelectedMode] = useState<ImportMode>("LIST_MODE");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { mutate, isPending } = useUploadBatch(projectId);

  const isListMode = selectedMode === "LIST_MODE";

  // Custom onOpenChange handler that blocks closing during upload.
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isPending) {
      return;
    }

    // Reset state when closing.
    if (!newOpen) {
      setSelectedMode("LIST_MODE");
      setSelectedFiles([]);
    }

    onOpenChange(newOpen);
  };

  // Handle mode selection change.
  const handleModeChange = (mode: ImportMode) => {
    // Clearing files when the mode changes keeps the file count valid
    // (list accepts a single file; profile accepts many).
    if (selectedMode !== mode) {
      setSelectedFiles([]);
    }
    setSelectedMode(mode);
  };

  // Configure dropzone.
  // Type assertion needed due to react-dropzone v14 type incompatibility with strict TypeScript.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: isListMode ? 1 : undefined,
    multiple: !isListMode,
    onDrop: (acceptedFiles: File[]) => {
      if (isListMode) {
        // Replace the previous file in list mode.
        setSelectedFiles(acceptedFiles.slice(0, 1));
      } else {
        // Append files in profile mode (one file per record).
        setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
      }
    },
    onDropRejected: (fileRejections: FileRejection[]) => {
      fileRejections.forEach((rejection: FileRejection) => {
        const error = rejection.errors[0];
        if (!error) {
          return;
        }

        switch (error.code) {
          case "file-invalid-type":
            toast.error("Formato invalido. Use arquivos .xlsx ou .xls");
            break;
          case "file-too-large":
            toast.error("Arquivo muito grande. Tamanho maximo: 5MB");
            break;
          case "too-many-files":
            toast.error("Uma linha por registro aceita apenas 1 arquivo");
            break;
          default:
            toast.error(error.message);
        }
      });
    },
    noClick: false,
    noKeyboard: false,
  } as unknown as DropzoneOptions);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.append("mode", selectedMode);

    if (isListMode) {
      formData.append("documents", selectedFiles[0]!);
    } else {
      selectedFiles.forEach((file) => {
        formData.append("documents", file);
      });
    }

    mutate(formData, {
      onSuccess: () => {
        handleOpenChange(false);
        toast.success("Importacao realizada com sucesso");
      },
      onError: () => {
        toast.error("Erro ao importar. Tente novamente.");
      },
    });
  };

  const hasFiles = selectedFiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[560px]" showCloseButton={!isPending}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-1">
          <span className="grid size-[42px] shrink-0 place-items-center rounded-[11px] border border-latte-300 bg-latte-100">
            <FileUp className="size-[21px] text-espresso-700" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-[19px] font-bold tracking-[-0.01em] text-foreground">
              Nova importação
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">
              Envie uma planilha. Em seguida você dá nome às colunas.
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 pt-4 pb-2">
          {/* File zone */}
          <div className="flex flex-col gap-3">
            {!hasFiles && (
              <div
                {...(getRootProps() as React.HTMLAttributes<HTMLDivElement>)}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-[14px] border-[1.5px] border-dashed p-8 text-center transition-colors",
                  isDragActive
                    ? "border-gold-500 bg-latte-100"
                    : "border-mocha-300 bg-latte-50 hover:border-gold-500 hover:bg-latte-100"
                )}
              >
                <input {...(getInputProps() as unknown as React.InputHTMLAttributes<HTMLInputElement>)} />
                <Upload
                  className={cn(
                    "mb-3 size-8",
                    isDragActive ? "text-gold-600" : "text-mocha-400"
                  )}
                />
                <p className="text-sm font-semibold text-foreground">
                  {isDragActive
                    ? "Solte a planilha aqui"
                    : "Arraste a planilha ou clique para selecionar"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  .xlsx e .xls · até 5 MB
                  {isListMode ? " · 1 arquivo" : " · um arquivo por registro"}
                </p>
              </div>
            )}

            {hasFiles && (
              <div className="flex flex-col gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 rounded-[13px] border border-green-300 bg-green-100 px-4 py-3.5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-green-300 bg-card">
                      <FileSpreadsheet className="size-5 text-green-700" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {file.name}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-green-700">
                        <CheckCheck className="size-3" />
                        carregado · {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={isPending}
                      aria-label={`Remover ${file.name}`}
                      className="grid size-[34px] shrink-0 place-items-center rounded-[9px] border border-green-300 bg-card text-mocha-500 transition-colors hover:bg-latte-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400 disabled:opacity-50"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}

                {/* Profile mode allows appending more files (one per record). */}
                {!isListMode && (
                  <div
                    {...(getRootProps() as React.HTMLAttributes<HTMLDivElement>)}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed px-3 py-2.5 text-[13px] font-semibold transition-colors",
                      isDragActive
                        ? "border-gold-500 bg-latte-100 text-espresso-700"
                        : "border-mocha-300 text-espresso-700 hover:border-gold-500 hover:bg-latte-50"
                    )}
                  >
                    <input {...(getInputProps() as unknown as React.InputHTMLAttributes<HTMLInputElement>)} />
                    <Plus className="size-4" />
                    Adicionar mais arquivos ({selectedFiles.length})
                  </div>
                )}
              </div>
            )}

            <p className="-mt-1 flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <Info className="size-[13px] shrink-0" />
              Aceita .xlsx e .xls · até 5 MB. Para trocar, remova e selecione outro
              arquivo.
            </p>
          </div>

          {/* Mode selection */}
          <div>
            <p className="mb-3 text-sm font-bold text-foreground">
              Como seus dados estão organizados?
            </p>
            <div
              role="radiogroup"
              aria-label="Como seus dados estão organizados?"
              className="flex flex-col gap-2.5"
            >
              {MODE_OPTIONS.map((option) => {
                const checked = selectedMode === option.value;
                const OptionIcon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => handleModeChange(option.value)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-[13px] rounded-[13px] bg-card px-3.5 py-3.5 text-left transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400",
                      checked
                        ? "border-[1.5px] border-gold-500 ring-[3px] ring-gold-200"
                        : "border border-mocha-300 hover:border-mocha-400"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] bg-card",
                        checked ? "border-gold-500" : "border-mocha-300"
                      )}
                    >
                      {checked && <span className="size-2.5 rounded-full bg-gold-500" />}
                    </span>
                    <span
                      className={cn(
                        "grid size-[34px] shrink-0 place-items-center rounded-[9px]",
                        option.iconTileClassName
                      )}
                    >
                      <OptionIcon className={cn("size-[17px]", option.iconClassName)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">
                        {option.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2.5 px-6 pt-2 pb-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!hasFiles || isPending}
            className="bg-gold font-bold text-gold-foreground hover:bg-gold-600"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Continuar
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
