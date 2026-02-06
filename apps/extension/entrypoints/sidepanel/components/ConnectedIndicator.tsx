import { CheckCircle } from 'lucide-react';

/**
 * Simple connected state indicator
 *
 * Shows green checkmark with "Connected" text when user is authenticated.
 */
export function ConnectedIndicator() {
  return (
    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
      <CheckCircle className="w-4 h-4 text-green-600" />
      <span className="text-sm font-medium text-green-700">Connected</span>
    </div>
  );
}
