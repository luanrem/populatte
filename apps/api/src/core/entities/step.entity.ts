export enum StepAction {
  Fill = 'fill',
  Click = 'click',
  Wait = 'wait',
}

export enum SelectorType {
  Css = 'css',
  Xpath = 'xpath',
}

export interface SelectorEntry {
  type: SelectorType;
  value: string;
}

export interface Step {
  id: string;
  mappingId: string;
  action: StepAction;
  selector: SelectorEntry;
  selectorFallbacks: SelectorEntry[];
  sourceFieldKey: string | null;
  fixedValue: string | null;
  stepOrder: number;
  optional: boolean;
  clearBefore: boolean;
  pressEnter: boolean;
  waitMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStepData {
  mappingId: string;
  action: StepAction;
  selector: SelectorEntry;
  stepOrder: number;
  selectorFallbacks?: SelectorEntry[];
  sourceFieldKey?: string | null;
  fixedValue?: string | null;
  optional?: boolean;
  clearBefore?: boolean;
  pressEnter?: boolean;
  waitMs?: number | null;
}

export interface UpdateStepData {
  action?: StepAction;
  selector?: SelectorEntry;
  stepOrder?: number;
  selectorFallbacks?: SelectorEntry[];
  sourceFieldKey?: string | null;
  fixedValue?: string | null;
  optional?: boolean;
  clearBefore?: boolean;
  pressEnter?: boolean;
  waitMs?: number | null;
}
