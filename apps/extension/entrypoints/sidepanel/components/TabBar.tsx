import { useState, useEffect } from 'react';
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
  const [showClickTooltip, setShowClickTooltip] = useState(false);

  // Cleanup tooltip timeout on unmount or when captureActive changes
  useEffect(() => {
    if (captureActive) {
      setShowClickTooltip(false);
    }
  }, [captureActive]);

  const handleTabClick = (tab: 'preencher' | 'captura') => {
    // If clicking Captura tab when it's disabled, show tooltip and do nothing
    if (tab === 'captura' && !captureActive) {
      setShowClickTooltip(true);
      setTimeout(() => setShowClickTooltip(false), 1500);
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
        className={`
          w-1/2 flex items-center justify-center gap-1.5 py-2 text-sm font-medium
          ${!captureActive ? 'relative group' : ''}
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
        {/* Custom tooltip - shown on hover and click when disabled */}
        {!captureActive && (
          <>
            {/* Arrow/caret pointing up */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10" style={{ visibility: showClickTooltip ? 'visible' : undefined, opacity: showClickTooltip ? 1 : undefined }} />
            {/* Tooltip text */}
            <span className={`absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 ${showClickTooltip ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-150`}>
              Inicie a captura primeiro
            </span>
          </>
        )}
      </button>
    </div>
  );
}
