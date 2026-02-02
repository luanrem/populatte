"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { FileQuestion } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useFieldValuesInfinite } from "@/lib/query/hooks/use-batches";

import { FieldValueRow } from "./field-value-row";

const typeColorMap: Record<string, string> = {
  STRING:
    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  NUMBER:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DATE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  BOOLEAN:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  UNKNOWN:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

interface FieldValuesSideSheetProps {
  projectId: string;
  batchId: string;
  fieldName: string;
  inferredType: string;
  presenceCount: number;
  uniqueCount: number;
}

export function FieldValuesSideSheet({
  projectId,
  batchId,
  fieldName,
  inferredType,
  presenceCount,
  uniqueCount,
}: FieldValuesSideSheetProps) {
  const [searchInput, setSearchInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchInput, 300);

  const { ref: loadMoreRef, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useFieldValuesInfinite(
    projectId,
    batchId,
    fieldName,
    debouncedSearch || undefined,
  );

  // Auto-fetch next page when sentinel is in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const matchingCount = data?.pages[0]?.matchingCount ?? 0;
  const totalCount = data?.pages[0]?.totalDistinctCount ?? 0;
  const allValues = data?.pages.flatMap((page) => page.values) ?? [];

  const typeColor = typeColorMap[inferredType] ?? typeColorMap.UNKNOWN;
  const isInitialLoading = isFetching && !data;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <SheetHeader className="border-b">
        <div className="flex items-center gap-2">
          <SheetTitle className="truncate">{fieldName}</SheetTitle>
          <Badge className={typeColor}>{inferredType}</Badge>
        </div>
        <SheetDescription>
          {presenceCount} registros &middot; {uniqueCount} valores unicos
        </SheetDescription>
      </SheetHeader>

      {/* Search area */}
      <div className="border-b px-4 pb-3 pt-3">
        <Input
          placeholder="Buscar valores..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {data && (
          <p className="mt-2 text-xs text-muted-foreground">
            {debouncedSearch
              ? `Mostrando ${matchingCount} de ${totalCount} valores`
              : `${totalCount} valores unicos`}
          </p>
        )}
      </div>

      {/* Value list */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        {isInitialLoading ? (
          <div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="border-b px-4 py-3">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : data && matchingCount === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16">
            <div className="mb-4 rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6">
              <FileQuestion className="h-10 w-10 text-muted-foreground/50" />
            </div>
            {debouncedSearch ? (
              <>
                <h3 className="text-base font-semibold text-foreground">
                  Nenhum valor corresponde a busca
                </h3>
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => setSearchInput("")}
                >
                  Limpar busca
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-foreground">
                  Nenhum valor encontrado
                </h3>
                <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                  Todos os registros tem valores vazios para este campo.
                </p>
              </>
            )}
          </div>
        ) : (
          <div>
            {allValues.map((value, index) => (
              <FieldValueRow key={`${value}-${index}`} value={value} />
            ))}
            <div ref={loadMoreRef} className="py-4 text-center">
              {isFetchingNextPage ? (
                <span className="text-xs text-muted-foreground">
                  Carregando mais...
                </span>
              ) : !hasNextPage && allValues.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  Fim da lista
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
