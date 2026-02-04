interface RowIndicatorProps {
  rowIndex: number;
  rowTotal: number;
}

/**
 * Row position indicator
 *
 * Displays current row position in format "Row X of Y".
 */
export function RowIndicator({ rowIndex, rowTotal }: RowIndicatorProps) {
  if (rowTotal === 0) {
    return (
      <div className="text-center text-sm text-gray-400">
        No rows
      </div>
    );
  }

  return (
    <div className="text-center text-sm text-gray-600">
      Row {rowIndex + 1} of {rowTotal}
    </div>
  );
}
