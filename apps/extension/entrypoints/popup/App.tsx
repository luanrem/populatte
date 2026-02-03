import { Coffee } from 'lucide-react';

export default function App() {
  return (
    <div className="w-[350px] h-[500px] bg-white p-4">
      <header className="flex items-center gap-2 mb-4 pb-3 border-b">
        <Coffee className="w-6 h-6 text-amber-700" />
        <h1 className="text-lg font-semibold text-gray-900">Populatte</h1>
      </header>

      <main className="space-y-4">
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800">
            Extension loaded successfully. Ready for auth integration.
          </p>
        </div>

        <div className="text-xs text-gray-500">
          <p>Status: Disconnected</p>
          <p>Version: 0.1.0</p>
        </div>
      </main>
    </div>
  );
}
