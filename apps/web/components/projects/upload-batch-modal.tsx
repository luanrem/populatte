"use client";

import { useState } from "react";
import { useDropzone, type DropzoneOptions, type FileRejection } from "react-dropzone";
import { FileSpreadsheet, List, Loader2, Upload, Users, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUploadBatch } from "@/lib/query/hooks/use-batches";

interface UploadBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function UploadBatchModal({
  open,
  onOpenChange,
  projectId,
}: UploadBatchModalProps) {
  const [selectedMode, setSelectedMode] = useState<'LIST_MODE' | 'PROFILE_MODE' | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { mutate, isPending } = useUploadBatch(projectId);

  // Custom onOpenChange handler that blocks closing during upload
  const handleOpenChange = (newOpen: boolean) => {
    // Block closing if upload is in progress
    if (!newOpen && isPending) {
      return;
    }

    // Reset state when closing
    if (!newOpen) {
      setSelectedMode(null);
      setSelectedFiles([]);
    }

    onOpenChange(newOpen);
  };

  // Handle mode selection change
  const handleModeChange = (mode: 'LIST_MODE' | 'PROFILE_MODE') => {
    // If mode changes, clear selected files to prevent invalid file counts
    if (selectedMode !== mode) {
      setSelectedFiles([]);
    }
    setSelectedMode(mode);
  };

  // Configure dropzone
  // Type assertion needed due to react-dropzone v14 type incompatibility with strict TypeScript
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: selectedMode === 'LIST_MODE' ? 1 : undefined,
    multiple: selectedMode !== 'LIST_MODE',
    onDrop: (acceptedFiles: File[]) => {
      if (selectedMode === 'LIST_MODE') {
        // Replace previous file for List Mode
        setSelectedFiles(acceptedFiles.slice(0, 1));
      } else {
        // Append files for Profile Mode
        setSelectedFiles(prev => [...prev, ...acceptedFiles]);
      }
    },
    onDropRejected: (fileRejections: FileRejection[]) => {
      fileRejections.forEach((rejection: FileRejection) => {
        const error = rejection.errors[0];
        if (!error) {
          return;
        }

        switch (error.code) {
          case 'file-invalid-type':
            toast.error('Formato invalido. Use arquivos .xlsx');
            break;
          case 'file-too-large':
            toast.error('Arquivo muito grande. Tamanho maximo: 5MB');
            break;
          case 'too-many-files':
            toast.error('Modo Lista aceita apenas 1 arquivo');
            break;
          default:
            toast.error(error.message);
        }
      });
    },
    noClick: false,
    noKeyboard: false,
  } as unknown as DropzoneOptions);

  // Remove file by index
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!selectedMode || selectedFiles.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.append('mode', selectedMode);

    if (selectedMode === 'LIST_MODE') {
      formData.append('documents', selectedFiles[0]!);
    } else {
      selectedFiles.forEach(file => {
        formData.append('documents', file);
      });
    }

    mutate(formData, {
      onSuccess: () => {
        handleOpenChange(false);
        toast.success('Importacao realizada com sucesso');
      },
      onError: () => {
        toast.error('Erro ao importar. Tente novamente.');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Nova Importacao</DialogTitle>
          <DialogDescription>
            Selecione o modo de importacao e adicione seus arquivos .xlsx
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                selectedMode === 'LIST_MODE' && "border-primary ring-2 ring-primary"
              )}
              onClick={() => handleModeChange('LIST_MODE')}
            >
              <CardHeader className="space-y-1 p-4">
                <div className="flex items-center gap-2">
                  <List className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Modo Lista</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Importe uma planilha com varios registros
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                selectedMode === 'PROFILE_MODE' && "border-primary ring-2 ring-primary"
              )}
              onClick={() => handleModeChange('PROFILE_MODE')}
            >
              <CardHeader className="space-y-1 p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Modo Perfil</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Importe arquivos individuais por entidade
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Dropzone section (shown when mode is selected) */}
          {selectedMode && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg p-8 text-center transition-colors cursor-pointer",
                  isDragActive
                    ? "bg-primary/10 border-2 border-primary border-dashed"
                    : "bg-muted/50 border-2 border-dashed border-muted-foreground/25"
                )}
              >
                <input {...(getInputProps() as unknown as React.InputHTMLAttributes<HTMLInputElement>)} />
                {isDragActive ? (
                  <>
                    <Upload className="mb-4 h-10 w-10 text-primary" />
                    <p className="text-sm font-medium text-primary">
                      Solte os arquivos aqui
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
                    <p className="mb-2 text-sm font-medium">
                      Arraste arquivos .xlsx ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tamanho maximo: 5MB
                      {selectedMode === 'LIST_MODE' && ' • Apenas 1 arquivo'}
                    </p>
                  </>
                )}
              </div>

              {/* Selected files list */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Arquivos selecionados ({selectedFiles.length})
                  </p>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border bg-card p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={isPending}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (shown when mode is selected) */}
        {selectedMode && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={selectedFiles.length === 0 || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
