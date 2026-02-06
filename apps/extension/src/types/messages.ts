/**
 * Extension Message Types
 *
 * All messages use discriminated unions with explicit `type` field.
 * Per CONTEXT.md: Strict discriminated unions: `{ type: 'FILL', payload: FillPayload }`
 *
 * Message naming convention:
 * - Commands (popup -> background): ACTION_VERB (e.g., AUTH_LOGIN, PROJECT_SELECT)
 * - Queries (popup -> background): GET_NOUN (e.g., GET_AUTH, GET_PROJECTS)
 * - Events (background -> popup/content): NOUN_EVENT (e.g., STATE_UPDATED, FILL_PROGRESS)
 */

// ============================================================================
// Auth Messages
// ============================================================================

export interface AuthLoginMessage {
  type: 'AUTH_LOGIN';
  payload: {
    code: string; // Connection code from web app
  };
}

export interface AuthLogoutMessage {
  type: 'AUTH_LOGOUT';
}

export interface GetAuthMessage {
  type: 'GET_AUTH';
}

// ============================================================================
// Project Messages
// ============================================================================

export interface GetProjectsMessage {
  type: 'GET_PROJECTS';
}

export interface ProjectSelectMessage {
  type: 'PROJECT_SELECT';
  payload: {
    projectId: string;
  };
}

// ============================================================================
// Batch Messages
// ============================================================================

export interface GetBatchesMessage {
  type: 'GET_BATCHES';
  payload: {
    projectId: string;
  };
}

export interface BatchSelectMessage {
  type: 'BATCH_SELECT';
  payload: {
    batchId: string;
    rowTotal: number;
  };
}

// ============================================================================
// Row Messages
// ============================================================================

export interface GetRowsMessage {
  type: 'GET_ROWS';
  payload: {
    batchId: string;
    page: number;
    limit: number;
  };
}

export interface RowSelectMessage {
  type: 'ROW_SELECT';
  payload: {
    rowIndex: number;
  };
}

export interface RowNextMessage {
  type: 'ROW_NEXT';
}

export interface RowPrevMessage {
  type: 'ROW_PREV';
}

export interface MarkErrorMessage {
  type: 'MARK_ERROR';
  payload: {
    reason?: string;
  };
}

// ============================================================================
// Mapping Messages
// ============================================================================

export interface GetMappingsMessage {
  type: 'GET_MAPPINGS';
}

export interface MappingSelectMessage {
  type: 'MAPPING_SELECT';
  payload: {
    mappingId: string;
  };
}

// ============================================================================
// Fill Messages (Background <-> Content Script)
// ============================================================================

export interface FillStartMessage {
  type: 'FILL_START';
}

export interface FillExecuteMessage {
  type: 'FILL_EXECUTE';
  payload: {
    steps: FillStep[];
    rowData: Record<string, unknown>;
  };
}

export interface FillStep {
  id: string;
  stepOrder: number;
  action: 'fill' | 'click' | 'wait';
  selector: {
    type: 'css' | 'xpath';
    value: string;
  };
  selectorFallbacks?: Array<{
    type: 'css' | 'xpath';
    value: string;
  }>;
  sourceFieldKey?: string;
  fixedValue?: string;
  clearBefore?: boolean;
  pressEnter?: boolean;
  waitMs?: number;
  optional?: boolean;
}

export interface FillResultMessage {
  type: 'FILL_RESULT';
  payload: {
    success: boolean;
    stepResults: StepResult[];
    error?: string;
  };
}

export interface StepResult {
  stepId: string;
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  duration?: number;
}

// ============================================================================
// State Messages (Background -> Popup)
// ============================================================================

export interface StateUpdatedMessage {
  type: 'STATE_UPDATED';
  payload: ExtensionState;
}

export interface ExtensionState {
  isAuthenticated: boolean;
  userEmail: string | null;
  projectId: string | null;
  batchId: string | null;
  rowIndex: number;
  rowTotal: number;
  fillStatus: FillStatus;
  /** Current active mapping ID */
  mappingId: string | null;
  /** Name of current active mapping for display */
  mappingName: string | null;
  /** Whether current URL has available mapping */
  hasMapping: boolean;
  /** Available mappings for selection when multiple match */
  availableMappings: Array<{ id: string; name: string }>;
  /** Primary identifier field key configured for batch */
  identifierFieldKey: string | null;
  /** Secondary identifier field key configured for batch */
  secondaryFieldKey: string | null;
  /** Primary identifier value for current row */
  identifierPrimary: string | null;
  /** Secondary identifier value for current row */
  identifierSecondary: string | null;
}

export type FillStatus = 'idle' | 'pending' | 'filling' | 'success' | 'partial' | 'failed';

// ============================================================================
// Progress Messages (Background -> Popup)
// ============================================================================

export interface FillProgressMessage {
  type: 'FILL_PROGRESS';
  payload: {
    currentStep: number;
    totalSteps: number;
    status: string;
  };
}

// ============================================================================
// Success Monitoring Messages
// ============================================================================

export interface MonitorSuccessMessage {
  type: 'MONITOR_SUCCESS';
  payload: {
    trigger: 'url_change' | 'text_appears' | 'element_disappears';
    config: {
      selector?: string;
      pattern?: string;
    };
    timeoutMs?: number;
  };
}

export interface StopMonitorMessage {
  type: 'STOP_MONITOR';
}

export interface SuccessDetectedMessage {
  type: 'SUCCESS_DETECTED';
  payload: {
    success: boolean;
    reason: string;
  };
}

// ============================================================================
// Capture Mode Messages (Popup <-> Content Script)
// ============================================================================

export interface CaptureStartMessage {
  type: 'CAPTURE_START';
  payload: {
    batchColumns: string[]; // Available columns from selected batch
  };
}

export interface CaptureStopMessage {
  type: 'CAPTURE_STOP';
}

export interface CaptureHighlightMessage {
  type: 'CAPTURE_HIGHLIGHT';
  payload: {
    stepNumber: number; // Step to highlight on page
  };
}

export interface CaptureRemoveStepMessage {
  type: 'CAPTURE_REMOVE_STEP';
  payload: {
    stepNumber: number;
  };
}

// ============================================================================
// Preencher: Highlight & Validation Messages
// ============================================================================

export interface HighlightStepMessage {
  type: 'HIGHLIGHT_STEP';
  payload: {
    selector: { type: 'css' | 'xpath'; value: string };
    selectorFallbacks?: Array<{ type: 'css' | 'xpath'; value: string }>;
  };
}

export interface ValidateSelectorsMessage {
  type: 'VALIDATE_SELECTORS';
  payload: {
    selectors: Array<{
      stepId: string;
      selector: { type: 'css' | 'xpath'; value: string };
      selectorFallbacks?: Array<{ type: 'css' | 'xpath'; value: string }>;
    }>;
  };
}

export interface ElementCapturedMessage {
  type: 'ELEMENT_CAPTURED';
  payload: CapturedElementPayload;
}

export interface CapturedElementPayload {
  stepNumber: number;
  selector: {
    primary: {
      type: 'css';
      value: string;
    };
    fallbacks?: Array<{
      type: 'css';
      value: string;
    }>;
  };
  action: 'fill' | 'click';
  elementType: string;
  elementName: string;
}

export interface ElementAlreadyCapturedMessage {
  type: 'ELEMENT_ALREADY_CAPTURED';
  payload: {
    stepNumber: number;
    elementType: string;
    elementName: string;
  };
}

// ============================================================================
// Utility Messages
// ============================================================================

export interface PingMessage {
  type: 'PING';
}

export interface GetStateMessage {
  type: 'GET_STATE';
}

export interface PortResponseMessage {
  type: 'RESPONSE';
  requestType: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Messages sent from Popup to Background
 */
export type PopupToBackgroundMessage =
  | AuthLoginMessage
  | AuthLogoutMessage
  | GetAuthMessage
  | GetProjectsMessage
  | ProjectSelectMessage
  | GetBatchesMessage
  | BatchSelectMessage
  | GetRowsMessage
  | RowSelectMessage
  | RowNextMessage
  | RowPrevMessage
  | MarkErrorMessage
  | FillStartMessage
  | GetMappingsMessage
  | MappingSelectMessage
  | CaptureStartMessage
  | CaptureStopMessage
  | CaptureHighlightMessage
  | CaptureRemoveStepMessage
  | HighlightStepMessage
  | ValidateSelectorsMessage
  | GetStateMessage
  | PingMessage;

/**
 * Messages sent from Background to Content Script
 */
export type BackgroundToContentMessage =
  | FillExecuteMessage
  | MonitorSuccessMessage
  | StopMonitorMessage
  | CaptureStartMessage
  | CaptureStopMessage
  | CaptureHighlightMessage
  | CaptureRemoveStepMessage
  | HighlightStepMessage
  | ValidateSelectorsMessage
  | PingMessage;

/**
 * Messages sent from Content Script to Background
 */
export type ContentToBackgroundMessage =
  | FillResultMessage
  | SuccessDetectedMessage
  | ElementCapturedMessage
  | ElementAlreadyCapturedMessage
  | PingMessage;

/**
 * Messages broadcast from Background to Popup/Sidepanel
 */
export type BackgroundToPopupMessage =
  | StateUpdatedMessage
  | FillProgressMessage
  | ElementCapturedMessage
  | ElementAlreadyCapturedMessage
  | PortResponseMessage;

/**
 * All extension messages (for handler type)
 */
export type ExtensionMessage =
  | PopupToBackgroundMessage
  | BackgroundToContentMessage
  | ContentToBackgroundMessage
  | BackgroundToPopupMessage;
