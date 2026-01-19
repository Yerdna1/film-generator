/**
 * React hooks to fetch KIE.ai model data from the database
 */

import { useEffect, useState } from 'react';

// Types matching the database schema
export interface VideoModelParameters {
  supportedResolutions?: string[];
  supportedDurations?: string[];
  supportedAspectRatios?: string[];
  defaultResolution?: string;
  defaultDuration?: string;
  defaultAspectRatio?: string;
  pricing?: Record<string, number>;
  resolutionDurationConstraints?: Record<string, string[]>;
}

export interface KieVideoModel {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  description?: string;
  modality?: string[];
  quality?: string;
  length?: string;
  credits: number;
  cost: number;
  supportedResolutions: string[];
  supportedDurations: string[];
  supportedAspectRatios: string[];
  defaultResolution: string;
  defaultDuration: string;
  defaultAspectRatio: string;
  pricing: Record<string, number>;
  resolutionDurationConstraints?: Record<string, string[]>;
  keyFeatures?: string[];
}

export interface KieImageModel {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  description?: string;
  credits: number;
  cost: number;
  modality?: string[];
  qualityOptions?: string[];
  keyFeatures?: string[];
}

export interface KieTtsModel {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  description?: string;
  credits: number;
  cost: number;
  costUnit?: string;
  supportedLanguages?: number;
  voiceOptions?: string[];
  specialFeatures?: string[];
}

export interface KieMusicModel {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  description?: string;
  credits: number;
  cost: number;
  modality?: string[];
}

// Hook to fetch video models
export function useVideoModels() {
  const [models, setModels] = useState<KieVideoModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/kie-models?type=video');
        if (!response.ok) throw new Error('Failed to fetch video models');
        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  return { models, loading, error };
}

// Hook to fetch image models
export function useImageModels() {
  const [models, setModels] = useState<KieImageModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/kie-models?type=image');
        if (!response.ok) throw new Error('Failed to fetch image models');
        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  return { models, loading, error };
}

// Hook to fetch TTS models
export function useTtsModels() {
  const [models, setModels] = useState<KieTtsModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/kie-models?type=tts');
        if (!response.ok) throw new Error('Failed to fetch TTS models');
        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  return { models, loading, error };
}

// Hook to fetch music models
export function useMusicModels() {
  const [models, setModels] = useState<KieMusicModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/kie-models?type=music');
        if (!response.ok) throw new Error('Failed to fetch music models');
        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  return { models, loading, error };
}

export interface KieLlmModel {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  description?: string;
  credits: number;
  cost: number;
  contextWindow?: number;
  maxOutputTokens?: number;
  modality?: string[];
}

// Hook to fetch LLM models
export function useLlmModels() {
  const [models, setModels] = useState<KieLlmModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/kie-models?type=llm');
        if (!response.ok) throw new Error('Failed to fetch LLM models');
        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  return { models, loading, error };
}
