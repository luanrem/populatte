"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface FieldCardProps {
  fieldName: string;
  inferredType: string;
  presenceCount: number;
  totalRows: number;
  uniqueCount: number;
  sampleValues: unknown[];
  onClick?: () => void;
}

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

export function FieldCard({
  fieldName,
  inferredType,
  presenceCount,
  totalRows,
  uniqueCount,
  sampleValues,
  onClick,
}: FieldCardProps) {
  const presencePercent =
    totalRows > 0 ? Math.round((presenceCount / totalRows) * 100) : 0;

  const isLikelyId = uniqueCount === totalRows && totalRows > 0;
  const isLowPresence = presencePercent < 50;

  const typeColor = typeColorMap[inferredType] ?? typeColorMap.UNKNOWN;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-sm truncate">{fieldName}</h3>

        <Badge className={typeColor}>{inferredType}</Badge>

        <div className="space-y-1">
          <Progress
            value={presencePercent}
            className={isLowPresence ? "[&>div]:bg-amber-500" : ""}
          />
          <span className="text-xs text-muted-foreground">
            {presenceCount} de {totalRows} registros ({presencePercent}%)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {uniqueCount} valores unicos
          </span>
          {isLikelyId && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              ID
            </Badge>
          )}
        </div>

        {sampleValues.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            {sampleValues.map(String).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
