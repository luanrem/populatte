/**
 * Mapping Selector Component
 *
 * Shows the active mapping when on a mapped page.
 * - Single mapping: displays name as text
 * - Multiple mappings: shows dropdown for selection
 */

interface MappingSelectorProps {
  mappings: Array<{ id: string; name: string }>;
  selectedId: string | null;
  onSelect: (mappingId: string) => void;
}

export function MappingSelector({ mappings, selectedId, onSelect }: MappingSelectorProps) {
  // If only one mapping, show it as text (no dropdown needed)
  if (mappings.length === 1) {
    const mapping = mappings[0];
    return (
      <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md">
        <span className="text-sm text-green-700">
          Mapping: <strong>{mapping?.name ?? 'Unknown'}</strong>
        </span>
      </div>
    );
  }

  // Multiple mappings: show dropdown
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">Select Mapping</label>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <option value="" disabled>
          Choose mapping...
        </option>
        {mappings.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
