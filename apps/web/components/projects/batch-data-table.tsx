"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  BatchResponse,
  RowResponse,
} from "@/lib/api/schemas/batch.schema";

interface BatchDataTableProps {
  batch: BatchResponse;
  rows: RowResponse[];
  isLoading: boolean;
  isPlaceholderData: boolean;
  offset: number;
}

export function BatchDataTable({
  batch,
  rows,
  isLoading,
  isPlaceholderData,
  offset,
}: BatchDataTableProps) {
  const sortedColumns = [...batch.columnMetadata].sort(
    (a, b) => a.position - b.position
  );

  // Loading state with no data yet
  if (isLoading && rows.length === 0) {
    return (
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-background w-16">
                #
              </TableHead>
              {sortedColumns.length > 0
                ? sortedColumns.map((col) => (
                    <TableHead key={col.normalizedKey} className="min-w-[150px]">
                      {col.originalHeader}
                    </TableHead>
                  ))
                : Array.from({ length: 6 }).map((_, i) => (
                    <TableHead key={i} className="min-w-[150px]">
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                  ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="sticky left-0 z-10 bg-background">
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                {(sortedColumns.length > 0 ? sortedColumns : Array.from({ length: 6 })).map(
                  (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  )
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background w-16">
              #
            </TableHead>
            {sortedColumns.map((col) => (
              <TableHead key={col.normalizedKey} className="min-w-[150px]">
                {col.originalHeader}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className={isPlaceholderData ? "opacity-60" : ""}>
          {rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="sticky left-0 z-10 bg-background font-medium text-muted-foreground">
                {offset + index + 1}
              </TableCell>
              {sortedColumns.map((col) => {
                const value = row.data[col.normalizedKey];
                const displayValue =
                  value !== null && value !== undefined
                    ? String(value)
                    : "";

                return (
                  <TableCell key={col.normalizedKey} className="max-w-[200px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate block">
                          {displayValue}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs break-words">{displayValue}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
