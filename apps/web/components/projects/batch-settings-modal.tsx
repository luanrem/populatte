"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import type { BatchResponse } from "@/lib/api/schemas/batch.schema";
import { useBatchRows, useUpdateBatch } from "@/lib/query/hooks/use-batches";

interface BatchSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: BatchResponse | null;
  projectId: string;
  onSave: () => void;
}

const NONE_VALUE = "__none__";

export function BatchSettingsModal({
  open,
  onOpenChange,
  batch,
  projectId,
  onSave,
}: BatchSettingsModalProps) {
  const [primaryKey, setPrimaryKey] = useState<string>(NONE_VALUE);
  const [secondaryKey, setSecondaryKey] = useState<string>(NONE_VALUE);

  const updateBatch = useUpdateBatch(projectId);
  const { data: rowsData, isLoading: rowsLoading } = useBatchRows(
    projectId,
    batch?.id ?? "",
    1,
    0
  );

  // Sync state when batch changes
  useEffect(() => {
    if (batch) {
      setPrimaryKey(batch.identifierFieldKey ?? NONE_VALUE);
      setSecondaryKey(batch.secondaryFieldKey ?? NONE_VALUE);
    }
  }, [batch]);

  if (!batch) {
    return null;
  }

  const firstRow = rowsData?.items[0];
  const columns = batch.columnMetadata;

  const getPreviewValue = (key: string): string => {
    if (key === NONE_VALUE || !firstRow) return "";
    const value = firstRow.data[key];
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const primaryValue = getPreviewValue(primaryKey);
  const secondaryValue = getPreviewValue(secondaryKey);

  const previewText =
    primaryValue && secondaryValue
      ? `Ex: ${primaryValue} - ${secondaryValue}`
      : primaryValue
        ? `Ex: ${primaryValue}`
        : "Selecione um identificador";

  const handleSave = async () => {
    await updateBatch.mutateAsync({
      batchId: batch.id,
      data: {
        identifierFieldKey: primaryKey === NONE_VALUE ? null : primaryKey,
        secondaryFieldKey: secondaryKey === NONE_VALUE ? null : secondaryKey,
      },
    });
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuracoes da Importacao</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary-identifier">Identificador primario</Label>
            <Select value={primaryKey} onValueChange={setPrimaryKey}>
              <SelectTrigger id="primary-identifier">
                <SelectValue placeholder="Selecione uma coluna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Nenhum</SelectItem>
                {columns.map((col) => (
                  <SelectItem key={col.normalizedKey} value={col.normalizedKey}>
                    {col.originalHeader}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary-identifier">
              Identificador secundario
            </Label>
            <Select value={secondaryKey} onValueChange={setSecondaryKey}>
              <SelectTrigger id="secondary-identifier">
                <SelectValue placeholder="Selecione uma coluna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Nenhum</SelectItem>
                {columns.map((col) => (
                  <SelectItem key={col.normalizedKey} value={col.normalizedKey}>
                    {col.originalHeader}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Visualizacao:</span>{" "}
              {rowsLoading ? (
                <Skeleton className="ml-2 inline-block h-4 w-32" />
              ) : (
                previewText
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateBatch.isPending}>
            {updateBatch.isPending && <Loader2 className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
