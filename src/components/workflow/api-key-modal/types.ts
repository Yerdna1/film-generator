export type OperationType = 'llm' | 'image' | 'video' | 'tts' | 'music';

export interface ApiKeyField {
  key: string;
  label: string;
  placeholder: string;
  helpText: string;
  helpLink?: string;
  validate?: (value: string) => { valid: boolean; error?: string };
  type?: 'text' | 'select';
  options?: { value: string; label: string; provider?: string }[];
}

export interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  apiKeyField?: string;
  modelField?: string;
  modelOptions?: { value: string; label: string }[];
  defaultModel?: string;  // Predefined default model for this provider
  isDefault?: boolean;    // Whether this is the default provider for the operation type
  description?: string;
}

export interface ApiKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation?: OperationType;
  missingKeys?: string[];
  onSuccess?: () => void;
}
