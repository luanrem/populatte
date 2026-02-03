export enum SuccessTrigger {
  UrlChange = 'url_change',
  TextAppears = 'text_appears',
  ElementDisappears = 'element_disappears',
}

export interface SuccessConfig {
  selector?: string;
}

export interface Mapping {
  id: string;
  projectId: string;
  name: string;
  targetUrl: string;
  isActive: boolean;
  successTrigger: SuccessTrigger | null;
  successConfig: SuccessConfig | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateMappingData {
  projectId: string;
  name: string;
  targetUrl: string;
  successTrigger?: SuccessTrigger | null;
  successConfig?: SuccessConfig | null;
}

export interface UpdateMappingData {
  name?: string;
  targetUrl?: string;
  isActive?: boolean;
  successTrigger?: SuccessTrigger | null;
  successConfig?: SuccessConfig | null;
}
