import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { sendToBackground } from '../../../src/messaging';
import type { VoidResponse } from '../../../src/types';

interface CodeInputFormProps {
  onSuccess: () => void;
}

/**
 * Code input form for extension authentication
 *
 * Handles 6-digit code entry with validation and loading state.
 * Sends AUTH_LOGIN message to background on submit.
 */
export function CodeInputForm({ onSuccess }: CodeInputFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      setError('Code must be exactly 6 digits');
      return;
    }

    setLoading(true);

    try {
      const response = await sendToBackground<VoidResponse>({
        type: 'AUTH_LOGIN',
        payload: { code },
      });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || 'Connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="code" className="block text-sm text-gray-600 mb-1">
          Enter connection code:
        </label>
        <input
          id="code"
          type="text"
          maxLength={6}
          placeholder="000000"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:bg-amber-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : (
          'Connect'
        )}
      </button>
    </form>
  );
}
