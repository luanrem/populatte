"use client";

import { useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldCard } from "./field-card";
import { useFieldStats } from "@/lib/query/hooks/use-batches";

interface BatchFieldInventoryProps {
  projectId: string;
  batchId: string;
  totalRows: number;
}

export function BatchFieldInventory({
  projectId,
  batchId,
  totalRows,
}: BatchFieldInventoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useFieldStats(projectId, batchId);

  const filteredFields = useMemo(() => {
    if (!data?.fields) {
      return [];
    }

    if (!searchQuery) {
      return data.fields;
    }

    const query = searchQuery.toLowerCase();
    return data.fields.filter((field) =>
      field.fieldName.toLowerCase().includes(query)
    );
  }, [data?.fields, searchQuery]);

  // Empty state - no fields or no rows (no search input needed)
  if (!isLoading && data && (data.fields.length === 0 || totalRows === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6 mb-6">
          <LayoutGrid className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mt-2">
          Nenhum campo encontrado
        </h3>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
          Esta importacao nao possui campos para exibir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filtrar campos..."
        className="max-w-sm"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        disabled={isLoading}
      />

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchQuery && filteredFields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6 mb-6">
            <LayoutGrid className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mt-2">
            Nenhum campo corresponde a busca
          </h3>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
            Tente buscar por outro termo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filteredFields.map((field) => (
            <FieldCard
              key={field.fieldName}
              fieldName={field.fieldName}
              inferredType={field.inferredType}
              presenceCount={field.presenceCount}
              totalRows={totalRows}
              uniqueCount={field.uniqueCount}
              sampleValues={field.sampleValues}
              onClick={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
