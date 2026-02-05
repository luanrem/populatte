'use client';

import { useEffect } from 'react';

interface UnsavedChangesGuardProps {
  isDirty: boolean;
}

/**
 * UnsavedChangesGuard - Protects against accidental data loss
 *
 * Uses browser's native beforeunload event to warn users when leaving
 * with unsaved changes. This covers:
 * - Page refresh
 * - Browser back/forward navigation
 * - Closing the tab
 * - Navigating to external URLs
 *
 * Note: For internal Next.js SPA navigation (Link components), the guard
 * relies on the Save button's disabled state and visual cues. Modern
 * browsers limit custom messages in beforeunload for security reasons.
 */
export function UnsavedChangesGuard({ isDirty }: UnsavedChangesGuardProps) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        // Standard way to trigger the browser's native confirmation dialog
        event.preventDefault();
        // Chrome requires returnValue to be set (legacy API)
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // This component doesn't render anything - it's a behavior component
  return null;
}
