import { useState, useEffect } from 'react';
import type { KieModel } from './KieModelSelector';

interface UseKieModelsResult {
  kieImageModels: KieModel[];
  kieVideoModels: KieModel[];
  kieTtsModels: KieModel[];
  kieMusicModels: KieModel[];
  kieLlmModels: KieModel[];
  loadingKieModels: boolean;
}

export function useKieModels(): UseKieModelsResult {
  const [kieImageModels, setKieImageModels] = useState<KieModel[]>([]);
  const [kieVideoModels, setKieVideoModels] = useState<KieModel[]>([]);
  const [kieTtsModels, setKieTtsModels] = useState<KieModel[]>([]);
  const [kieMusicModels, setKieMusicModels] = useState<KieModel[]>([]);
  const [kieLlmModels, setKieLlmModels] = useState<KieModel[]>([]);
  const [loadingKieModels, setLoadingKieModels] = useState(true);

  useEffect(() => {
    async function fetchKieModels() {
      try {
        const [imageRes, videoRes, ttsRes, musicRes, llmRes] = await Promise.all([
          fetch('/api/kie-models?type=image'),
          fetch('/api/kie-models?type=video'),
          fetch('/api/kie-models?type=tts'),
          fetch('/api/kie-models?type=music'),
          fetch('/api/kie-models?type=llm'),
        ]);

        const [imageData, videoData, ttsData, musicData, llmData] = await Promise.all([
          imageRes.json(),
          videoRes.json(),
          ttsRes.json(),
          musicRes.json(),
          llmRes.json(),
        ]);

        setKieImageModels(imageData.models || []);
        setKieVideoModels(videoData.models || []);
        setKieTtsModels(ttsData.models || []);
        setKieMusicModels(musicData.models || []);
        setKieLlmModels(llmData.models || []);
      } catch (error) {
        console.error('Failed to fetch KIE models:', error);
      } finally {
        setLoadingKieModels(false);
      }
    }

    fetchKieModels();
  }, []);

  return {
    kieImageModels,
    kieVideoModels,
    kieTtsModels,
    kieMusicModels,
    kieLlmModels,
    loadingKieModels,
  };
}
