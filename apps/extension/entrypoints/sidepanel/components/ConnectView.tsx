import { ExternalLink } from 'lucide-react';
import { CodeInputForm } from './CodeInputForm';

interface ConnectViewProps {
  onConnected: () => void;
}

/**
 * Disconnected state view with connect flow
 *
 * Shows:
 * 1. Brief instruction text
 * 2. Button to open web app connection page
 * 3. Code input form for manual entry
 */
export function ConnectView({ onConnected }: ConnectViewProps) {
  function handleOpenWebApp() {
    // Open web app connection page in new tab
    // Using localhost for development (matches API_BASE_URL pattern)
    browser.tabs.create({
      url: 'http://localhost:3000/extension/connect',
      active: true,
    });
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-base font-medium text-gray-900 mb-1">
          Connect to Populatte
        </h2>
        <p className="text-sm text-gray-500">
          Link this extension to your account
        </p>
      </div>

      <button
        onClick={handleOpenWebApp}
        className="w-full px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        Open Populatte
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs text-gray-400">then enter code</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      <CodeInputForm onSuccess={onConnected} />
    </div>
  );
}
