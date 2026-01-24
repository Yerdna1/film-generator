import { Cpu, Mic, ImageIcon, Video, Music, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ProviderSelectionCard } from './ProviderSelectionCard';
import { KieModelSelector, type KieModel } from './KieModelSelector';
import {
  llmProviderOptions,
  openRouterModels,
  DEFAULT_OPENROUTER_MODEL,
  ttsProviderOptions,
  imageProviderOptions,
  videoProviderOptions,
  musicProviderOptions,
} from '../../constants';
import type { LLMProvider, MusicProvider, TTSProvider, ImageProvider, VideoProvider } from '@/types/project';

interface ProviderGridProps {
  llmProvider: LLMProvider;
  openRouterModel: string;
  musicProvider: MusicProvider;
  ttsProvider: TTSProvider;
  imageProvider: ImageProvider;
  videoProvider: VideoProvider;
  kieImageModels: KieModel[];
  kieVideoModels: KieModel[];
  kieTtsModels: KieModel[];
  kieMusicModels: KieModel[];
  kieLlmModels: KieModel[];
  kieImageModel: string;
  kieVideoModel: string;
  kieTtsModel: string;
  kieMusicModel: string;
  kieLlmModel: string;
  loadingKieModels: boolean;
  t: (key: string) => string;
  tPage: (key: string) => string;
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
}

export function ProviderGrid({
  llmProvider,
  openRouterModel,
  musicProvider,
  ttsProvider,
  imageProvider,
  videoProvider,
  kieImageModels,
  kieVideoModels,
  kieTtsModels,
  kieMusicModels,
  kieLlmModels,
  kieImageModel,
  kieVideoModel,
  kieTtsModel,
  kieMusicModel,
  kieLlmModel,
  loadingKieModels,
  t,
  tPage,
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
}: ProviderGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* LLM Provider Selection */}
      <ProviderSelectionCard
        title={tPage('llmProvider') || 'LLM'}
        icon={<Cpu className="w-5 h-5 text-emerald-400" />}
        colorScheme="emerald"
        selectedProvider={llmProvider}
        options={llmProviderOptions}
        onProviderChange={onLLMProviderChange}
      >
        {/* OpenRouter Model Selection */}
        {llmProvider === 'openrouter' && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">{tPage('selectModel') || 'Model'}</span>
            </div>
            <Select value={openRouterModel || DEFAULT_OPENROUTER_MODEL} onValueChange={onOpenRouterModelChange}>
              <SelectTrigger className="w-full bg-muted/50 border-border">
                <SelectValue placeholder={t('selectModel')} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {openRouterModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      {model.recommended && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400">
                          ★
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* KIE LLM Model Selection */}
        {llmProvider === 'kie' && (
          <KieModelSelector
            models={kieLlmModels}
            selectedModel={kieLlmModel}
            onModelChange={onKieLlmModelChange}
            isLoading={loadingKieModels}
            icon={<Cpu className="w-4 h-4 text-orange-400" />}
            label={tPage('selectKieModel') || 'Select KIE Model'}
            placeholder={t('selectLlmModel')}
            showMetadata={false}
          />
        )}
      </ProviderSelectionCard>

      {/* TTS Provider Selection */}
      <ProviderSelectionCard
        title={tPage('ttsProvider') || 'TTS Provider'}
        icon={<Mic className="w-5 h-5 text-violet-400" />}
        colorScheme="violet"
        selectedProvider={ttsProvider}
        options={ttsProviderOptions}
        onProviderChange={onTTSProviderChange}
      >
        {/* KIE TTS Model Selection */}
        {ttsProvider === 'kie' && (
          <KieModelSelector
            models={kieTtsModels}
            selectedModel={kieTtsModel}
            onModelChange={onKieTtsModelChange}
            isLoading={loadingKieModels}
            icon={<Mic className="w-4 h-4 text-violet-400" />}
            label={tPage('selectKieModel') || 'Select KIE Model'}
            placeholder={t('selectTtsModel')}
          />
        )}
      </ProviderSelectionCard>

      {/* Image Provider Selection */}
      <ProviderSelectionCard
        title={tPage('imageProvider') || 'Image Provider'}
        icon={<ImageIcon className="w-5 h-5 text-blue-400" />}
        colorScheme="blue"
        selectedProvider={imageProvider}
        options={imageProviderOptions}
        onProviderChange={onImageProviderChange}
      >
        {/* KIE Image Model Selection */}
        {imageProvider === 'kie' && (
          <KieModelSelector
            models={kieImageModels}
            selectedModel={kieImageModel}
            onModelChange={onKieImageModelChange}
            isLoading={loadingKieModels}
            icon={<ImageIcon className="w-4 h-4 text-blue-400" />}
            label={tPage('selectKieModel') || 'Select KIE Model'}
            placeholder={t('selectImageModel')}
          />
        )}
      </ProviderSelectionCard>

      {/* Video Provider Selection */}
      <ProviderSelectionCard
        title={tPage('videoProvider') || 'Video Provider'}
        icon={<Video className="w-5 h-5 text-orange-400" />}
        colorScheme="orange"
        selectedProvider={videoProvider}
        options={videoProviderOptions}
        onProviderChange={onVideoProviderChange}
      >
        {/* KIE Video Model Selection */}
        {videoProvider === 'kie' && (
          <KieModelSelector
            models={kieVideoModels}
            selectedModel={kieVideoModel}
            onModelChange={onKieVideoModelChange}
            isLoading={loadingKieModels}
            icon={<Video className="w-4 h-4 text-orange-400" />}
            label={tPage('selectKieModel') || 'Select KIE Model'}
            placeholder={t('selectVideoModel')}
          />
        )}
      </ProviderSelectionCard>

      {/* Music Provider Selection */}
      <ProviderSelectionCard
        title={tPage('musicProvider') || 'Music Provider'}
        icon={<Music className="w-5 h-5 text-pink-400" />}
        colorScheme="pink"
        selectedProvider={musicProvider}
        options={musicProviderOptions}
        onProviderChange={onMusicProviderChange}
      >
        {/* KIE Music Model Selection */}
        {musicProvider === 'kie' && (
          <KieModelSelector
            models={kieMusicModels}
            selectedModel={kieMusicModel}
            onModelChange={onKieMusicModelChange}
            isLoading={loadingKieModels}
            icon={<Music className="w-4 h-4 text-pink-400" />}
            label={tPage('selectKieModel') || 'Select KIE Model'}
            placeholder={t('selectMusicModel')}
          />
        )}
      </ProviderSelectionCard>
    </div>
  );
}
