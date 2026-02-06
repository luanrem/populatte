import { FileText, Target } from 'lucide-react';

interface TabBarProps {
  activeTab: 'preencher' | 'captura';
  onTabChange: (tab: 'preencher' | 'captura') => void;
  captureActive: boolean; // Controls whether Captura tab is enabled + shows pulsing dot
}

/**
 * Tab bar component for Side Panel
 *
 * Two tabs: Preencher (always enabled) and Captura (disabled when not capturing).
 * Shows a blue pulsing dot badge on Captura tab when capture mode is active.
 */
export function TabBar({ activeTab, onTabChange, captureActive }: TabBarProps) {
  const handleTabClick = (tab: 'preencher' | 'captura') => {
    // If clicking Captura tab when it's disabled, do nothing (tooltip will show)
    if (tab === 'captura' && !captureActive) {
      return;
    }
    onTabChange(tab);
  };

  return (
    <div className="w-full flex border-b border-gray-200">
      {/* Preencher Tab - Always enabled */}
      <button
        type="button"
        onClick={() => handleTabClick('preencher')}
        className={`
          w-1/2 flex items-center justify-center gap-1.5 py-2 text-sm font-medium
          ${activeTab === 'preencher'
            ? 'text-gray-900 border-b-2 border-amber-600'
            : 'text-gray-500'
          }
        `}
      >
        <FileText className="w-4 h-4" />
        <span>Preencher</span>
      </button>

      {/* Captura Tab - Disabled when captureActive is false */}
      <button
        type="button"
        onClick={() => handleTabClick('captura')}
        title={!captureActive ? 'Inicie a captura primeiro' : undefined}
        className={`
          w-1/2 flex items-center justify-center gap-1.5 py-2 text-sm font-medium
          ${activeTab === 'captura'
            ? 'text-gray-900 border-b-2 border-amber-600'
            : captureActive
              ? 'text-gray-500'
              : 'text-gray-400 opacity-50'
          }
        `}
      >
        <Target className="w-4 h-4" />
        <span>Captura</span>
        {/* Pulsing dot badge when capture is active */}
        {captureActive && (
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}
      </button>
    </div>
  );
}
