import { useState } from 'react';
import { CheckCircle, XCircle, Circle } from 'lucide-react';
import type { RecentRowEntry } from '../../../../src/storage/types';

interface RecentesListProps {
  /** Recent row entries (most recent first) */
  entries: RecentRowEntry[];
  /** Current active row index (for highlighting) */
  currentRowIndex: number;
  /** Callback when user clicks a recent row to navigate */
  onRowSelect: (rowIndex: number) => void;
}

export function RecentesList({ entries, currentRowIndex, onRowSelect }: RecentesListProps) {
  const [expanded, setExpanded] = useState(false);

  // Don't render if no entries
  if (entries.length === 0) {
    return null;
  }

  // Show first 3 entries in collapsed view, all in expanded view
  const visibleEntries = expanded ? entries : entries.slice(0, 3);
  const additionalEntries = entries.slice(3);

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recentes</span>
        {entries.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            {expanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}
      </div>

      {/* First 3 entries (always visible) */}
      <div className="space-y-1">
        {visibleEntries.slice(0, 3).map((entry) => (
          <RecentRowItem
            key={entry.rowIndex}
            entry={entry}
            isActive={entry.rowIndex === currentRowIndex}
            onClick={() => onRowSelect(entry.rowIndex)}
          />
        ))}
      </div>

      {/* Additional entries 4-10 (expandable with animation) */}
      {additionalEntries.length > 0 && (
        <div
          className={`overflow-hidden transition-all duration-200 ${
            expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-1">
            {additionalEntries.map((entry) => (
              <RecentRowItem
                key={entry.rowIndex}
                entry={entry}
                isActive={entry.rowIndex === currentRowIndex}
                onClick={() => onRowSelect(entry.rowIndex)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface RecentRowItemProps {
  entry: RecentRowEntry;
  isActive: boolean;
  onClick: () => void;
}

function RecentRowItem({ entry, isActive, onClick }: RecentRowItemProps) {
  // Format identifier for display (truncate with ellipsis)
  const displayIdentifier = entry.identifierValue ?? 'Sem identificador';
  const isLongIdentifier = displayIdentifier.length > 20;
  const truncatedIdentifier = isLongIdentifier
    ? `${displayIdentifier.slice(0, 20)}...`
    : displayIdentifier;

  // Tooltip text
  const tooltipText =
    entry.identifierFieldKey && entry.identifierValue
      ? `${entry.identifierFieldKey}: ${entry.identifierValue}`
      : displayIdentifier;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
        isActive
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-gray-50'
      }`}
      title={tooltipText}
    >
      {/* Status icon */}
      {entry.status === 'success' && (
        <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
      )}
      {entry.status === 'failed' && (
        <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
      )}
      {entry.status === 'navigated' && (
        <Circle className="w-3 h-3 text-gray-400 flex-shrink-0" />
      )}

      {/* Row number badge */}
      <span className="text-xs font-bold text-gray-700">#{entry.rowIndex + 1}</span>

      {/* Identifier value */}
      <span
        className={`text-xs text-gray-500 truncate max-w-[160px] ${
          !entry.identifierValue ? 'italic' : ''
        }`}
      >
        {truncatedIdentifier}
      </span>
    </button>
  );
}
