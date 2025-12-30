export interface ActionCostItem {
  provider: string;
  cost: number;
  description: string | null;
}

export interface ActionCosts {
  image: ActionCostItem[];
  video: ActionCostItem[];
  voiceover: ActionCostItem[];
  scene: ActionCostItem[];
  character: ActionCostItem[];
  prompt: ActionCostItem[];
}

export interface SettingsState {
  showKeys: Record<string, boolean>;
  savedKeys: Record<string, boolean>;
  localConfig: Record<string, string>;
  language: string;
  darkMode: boolean;
  reducedMotion: boolean;
  notifyOnComplete: boolean;
  autoSave: boolean;
  isExporting: boolean;
  actionCosts: ActionCosts | null;
  costsLoading: boolean;
}
