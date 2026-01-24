'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import {
  apiProviders,
  modalEndpoints as modalEndpointConfigs,
} from '../constants';
import type {
  LLMProvider,
  MusicProvider,
  TTSProvider,
  ImageProvider,
  VideoProvider,
  ModalEndpoints,
  ApiConfig,
} from '@/types/project';
import {
  useKieModels,
  ProviderGrid,
  ModalEndpointsSection,
  ApiKeysSection,
} from './api-keys';

interface ApiKeysTabProps {
  showKeys: Record<string, boolean>;
  savedKeys: Record<string, boolean>;
  localConfig: Record<string, string | undefined>;
  apiConfig: ApiConfig;
  llmProvider: LLMProvider;
  openRouterModel: string;
  musicProvider: MusicProvider;
  ttsProvider: TTSProvider;
  imageProvider: ImageProvider;
  videoProvider: VideoProvider;
  modalEndpoints: ModalEndpoints;
  kieImageModel: string;
  kieVideoModel: string;
  kieTtsModel: string;
  kieMusicModel: string;
  kieLlmModel: string;
  onToggleVisibility: (key: string) => void;
  onSaveKey: (key: string) => void;
  onUpdateConfig: (key: string, value: string) => void;
  onLLMProviderChange: (provider: LLMProvider) => void;
  onOpenRouterModelChange: (model: string) => void;
  onMusicProviderChange: (provider: MusicProvider) => void;
  onTTSProviderChange: (provider: TTSProvider) => void;
  onImageProviderChange: (provider: ImageProvider) => void;
  onVideoProviderChange: (provider: VideoProvider) => void;
  onKieImageModelChange: (model: string) => void;
  onKieVideoModelChange: (model: string) => void;
  onKieTtsModelChange: (model: string) => void;
  onKieMusicModelChange: (model: string) => void;
  onKieLlmModelChange: (model: string) => void;
  onModalEndpointChange: (key: keyof ModalEndpoints, value: string) => void;
  onSaveModalEndpoints: () => void;
}

export function ApiKeysTab({
  showKeys,
  savedKeys,
  localConfig,
  apiConfig,
  llmProvider,
  openRouterModel,
  musicProvider,
  ttsProvider,
  imageProvider,
  videoProvider,
  modalEndpoints,
  kieImageModel,
  kieVideoModel,
  kieTtsModel,
  kieMusicModel,
  kieLlmModel,
  onToggleVisibility,
  onSaveKey,
  onUpdateConfig,
  onLLMProviderChange,
  onOpenRouterModelChange,
  onMusicProviderChange,
  onTTSProviderChange,
  onImageProviderChange,
  onVideoProviderChange,
  onKieImageModelChange,
  onKieVideoModelChange,
  onKieTtsModelChange,
  onKieMusicModelChange,
  onKieLlmModelChange,
  onModalEndpointChange,
  onSaveModalEndpoints,
}: ApiKeysTabProps) {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');

  const {
    kieImageModels,
    kieVideoModels,
    kieTtsModels,
    kieMusicModels,
    kieLlmModels,
    loadingKieModels,
  } = useKieModels();

  // Check if any Modal provider is selected OR VectCut endpoint is needed
  // VectCut is always available for video composition in Step 6
  const isModalUsed =
    llmProvider === 'modal' ||
    ttsProvider === 'modal' ||
    imageProvider === 'modal' ||
    videoProvider === 'modal' ||
    musicProvider === 'modal';
  const showModalEndpoints = isModalUsed || true; // Always show for VectCut video composition

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Provider Selection Grid */}
      <ProviderGrid
        llmProvider={llmProvider}
        openRouterModel={openRouterModel}
        musicProvider={musicProvider}
        ttsProvider={ttsProvider}
        imageProvider={imageProvider}
        videoProvider={videoProvider}
        kieImageModels={kieImageModels}
        kieVideoModels={kieVideoModels}
        kieTtsModels={kieTtsModels}
        kieMusicModels={kieMusicModels}
        kieLlmModels={kieLlmModels}
        kieImageModel={kieImageModel}
        kieVideoModel={kieVideoModel}
        kieTtsModel={kieTtsModel}
        kieMusicModel={kieMusicModel}
        kieLlmModel={kieLlmModel}
        loadingKieModels={loadingKieModels}
        t={t}
        tPage={tPage}
        onLLMProviderChange={onLLMProviderChange}
        onOpenRouterModelChange={onOpenRouterModelChange}
        onMusicProviderChange={onMusicProviderChange}
        onTTSProviderChange={onTTSProviderChange}
        onImageProviderChange={onImageProviderChange}
        onVideoProviderChange={onVideoProviderChange}
        onKieImageModelChange={onKieImageModelChange}
        onKieVideoModelChange={onKieVideoModelChange}
        onKieTtsModelChange={onKieTtsModelChange}
        onKieMusicModelChange={onKieMusicModelChange}
        onKieLlmModelChange={onKieLlmModelChange}
      />

      {/* Modal.com Endpoints */}
      {showModalEndpoints && (
        <ModalEndpointsSection
          modalEndpoints={modalEndpoints}
          endpointConfigs={modalEndpointConfigs}
          onEndpointChange={onModalEndpointChange}
          onSave={onSaveModalEndpoints}
        />
      )}

      {/* API Keys */}
      <ApiKeysSection
        showKeys={showKeys}
        savedKeys={savedKeys}
        localConfig={localConfig}
        apiConfig={apiConfig}
        apiProviders={apiProviders}
        llmProvider={llmProvider}
        onToggleVisibility={onToggleVisibility}
        onSaveKey={onSaveKey}
        onUpdateConfig={onUpdateConfig}
        description={tPage('apiKeysDescription')}
      />

      {/* Info Card */}
      <Card className="glass border-border border-l-4 border-l-cyan-500">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{tPage('apiKeysNote')}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
