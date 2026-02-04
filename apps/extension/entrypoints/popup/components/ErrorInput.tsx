/**
 * ErrorInput Component
 *
 * Simple optional text input for error reason when marking a row as error.
 */

interface ErrorInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function ErrorInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  loading,
}: ErrorInputProps) {
  return (
    <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Error reason (optional)"
        disabled={loading}
        className="w-full px-3 py-2 text-sm border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
      />
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-300"
        >
          {loading ? 'Saving...' : 'Confirm Error'}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
