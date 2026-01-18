import type {
  UnifiedModelConfig
} from '@/types/project';

export interface TabProps {
  config: UnifiedModelConfig;
  apiKeysData: any;
  disabled?: boolean;
  onUpdateConfig: (updates: Partial<UnifiedModelConfig>) => void;
  onSaveApiKey: (keyName: string, value: string) => Promise<void>;
}

export interface ModelConfigurationPanelProps {
  modelConfig?: UnifiedModelConfig;
  onConfigChange: (config: UnifiedModelConfig) => void;
  disabled?: boolean;
  isFreeUser?: boolean;
}

export type UpdateFunction<T> = (updates: Partial<T>) => void;