'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Play,
  Pause,
  RefreshCw,
  Download,
  Volume2,
  VolumeX,
  User,
  Settings,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project, Character, DialogueLine, VoiceProvider } from '@/types/project';
import { ACTION_COSTS, formatCostCompact, calculateVoiceCost } from '@/lib/services/real-costs';
import { ItemGenerationState } from '@/lib/constants/workflow';

interface Step5Props {
  project: Project;
}

type AudioState = Record<string, ItemGenerationState>;

// ElevenLabs voices (English)
const elevenLabsVoices = [
  { id: 'rachel', name: 'Rachel', description: 'Calm, young, American female' },
  { id: 'drew', name: 'Drew', description: 'Well-rounded, American male' },
  { id: 'clyde', name: 'Clyde', description: 'War veteran, American male' },
  { id: 'paul', name: 'Paul', description: 'Ground reporter, American male' },
  { id: 'domi', name: 'Domi', description: 'Strong, young, American female' },
  { id: 'dave', name: 'Dave', description: 'British, conversational male' },
  { id: 'fin', name: 'Fin', description: 'Irish, sailing male' },
  { id: 'sarah', name: 'Sarah', description: 'Soft, young, American female' },
  { id: 'antoni', name: 'Antoni', description: 'Well-rounded, young, American male' },
  { id: 'thomas', name: 'Thomas', description: 'Calm, young, American male' },
  { id: 'charlie', name: 'Charlie', description: 'Casual, Australian male' },
  { id: 'emily', name: 'Emily', description: 'Calm, young, American female' },
];

// Gemini TTS voices (supports Slovak and other languages)
const geminiVoices = [
  { id: 'Aoede', name: 'Aoede', description: 'Natural female voice' },
  { id: 'Charon', name: 'Charon', description: 'Deep male voice' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Young male voice' },
  { id: 'Kore', name: 'Kore', description: 'Soft female voice' },
  { id: 'Puck', name: 'Puck', description: 'Playful voice' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Gentle voice' },
  { id: 'Enceladus', name: 'Enceladus', description: 'Clear male voice' },
  { id: 'Iapetus', name: 'Iapetus', description: 'Warm male voice' },
];

// Helper to migrate old placeholder voice IDs to valid Gemini TTS voices
const getValidGeminiVoice = (voiceId: string | undefined): string => {
  // Check if it's already a valid Gemini voice
  if (voiceId && geminiVoices.some(v => v.id.toLowerCase() === voiceId.toLowerCase())) {
    // Return with proper casing
    const found = geminiVoices.find(v => v.id.toLowerCase() === voiceId.toLowerCase());
    return found?.id || 'Aoede';
  }
  // Map old placeholder IDs to valid voices
  const migrationMap: Record<string, string> = {
    'sk-male-1': 'Charon',
    'sk-male-2': 'Fenrir',
    'sk-male-3': 'Enceladus',
    'sk-male-4': 'Iapetus',
    'sk-female-1': 'Aoede',
    'sk-female-2': 'Kore',
    'sk-female-3': 'Zephyr',
    'sk-child-1': 'Puck',
  };
  return migrationMap[voiceId || ''] || 'Aoede';
};

export function Step5VoiceoverGenerator({ project: initialProject }: Step5Props) {
  const t = useTranslations();
  const { updateVoiceSettings, updateScene, updateCharacter, projects } = useProjectStore();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [volume, setVolume] = useState([75]);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const voices = project.voiceSettings.provider === 'gemini-tts' ? geminiVoices : elevenLabsVoices;

  const allDialogueLines = project.scenes.flatMap((scene) =>
    scene.dialogue.map((line) => ({
      ...line,
      sceneId: scene.id,
      sceneTitle: scene.title,
      sceneNumber: scene.number,
    }))
  );

  const generatedCount = allDialogueLines.filter((line) => line.audioUrl).length;

  const handleVoiceChange = (characterId: string, voiceId: string) => {
    const voice = voices.find((v) => v.id === voiceId);
    if (!voice) return;

    updateVoiceSettings(project.id, {
      characterVoices: {
        ...project.voiceSettings.characterVoices,
        [characterId]: { voiceId, voiceName: voice.name },
      },
    });

    updateCharacter(project.id, characterId, {
      voiceId,
      voiceName: voice.name,
    });
  };

  const generateAudioForLine = async (lineId: string, sceneId: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    const line = scene?.dialogue.find((l) => l.id === lineId);
    if (!line) return;

    const character = project.characters.find((c) => c.id === line.characterId);

    setAudioStates((prev) => ({
      ...prev,
      [lineId]: { status: 'generating', progress: 10 },
    }));

    try {
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: { status: 'generating', progress: 30 },
      }));

      let response;

      if (project.voiceSettings.provider === 'gemini-tts') {
        // Use Gemini TTS
        response = await fetch('/api/gemini/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: line.text,
            voiceName: getValidGeminiVoice(character?.voiceId),
            language: project.voiceSettings.language,
            projectId: project.id,
          }),
        });
      } else {
        // Use ElevenLabs
        response = await fetch('/api/elevenlabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: line.text,
            voiceId: character?.voiceId || 'pNInz6obpgDQGcFmaJgB', // Default to Adam
            projectId: project.id,
          }),
        });
      }

      setAudioStates((prev) => ({
        ...prev,
        [lineId]: { status: 'generating', progress: 70 },
      }));

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl && scene) {
          // Update the scene's dialogue with the audio URL and provider
          const usedProvider = project.voiceSettings.provider;
          const updatedDialogue = scene.dialogue.map((d) =>
            d.id === lineId ? { ...d, audioUrl: data.audioUrl, ttsProvider: usedProvider } : d
          );
          updateScene(project.id, sceneId, { dialogue: updatedDialogue });

          setAudioStates((prev) => ({
            ...prev,
            [lineId]: { status: 'complete', progress: 100 },
          }));
          // Refresh credits display
          window.dispatchEvent(new CustomEvent('credits-updated'));
          return;
        }
      }

      // If API failed, show error
      const errorData = await response.json().catch(() => ({}));
      console.warn('TTS API failed:', errorData);
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: {
          status: 'error',
          progress: 0,
          error: errorData.error || `API not configured - set ${project.voiceSettings.provider === 'gemini-tts' ? 'GEMINI_API_KEY' : 'ELEVENLABS_API_KEY'} in .env.local`
        },
      }));
    } catch (error) {
      console.error('Error generating audio:', error);
      setAudioStates((prev) => ({
        ...prev,
        [lineId]: {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Generation failed'
        },
      }));
    }
  };

  const handleGenerateAudio = async (lineId: string, sceneId: string) => {
    await generateAudioForLine(lineId, sceneId);
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    for (const line of allDialogueLines) {
      if (!line.audioUrl) {
        await generateAudioForLine(line.id, line.sceneId);
      }
    }
    setIsGeneratingAll(false);
  };

  const togglePlay = (lineId: string) => {
    if (playingAudio === lineId) {
      audioRefs.current[lineId]?.pause();
      setPlayingAudio(null);
    } else {
      if (playingAudio) {
        audioRefs.current[playingAudio]?.pause();
      }
      audioRefs.current[lineId]?.play();
      setPlayingAudio(lineId);
    }
  };

  const getStatusColor = (status: AudioStatus) => {
    switch (status) {
      case 'complete':
        return 'text-green-400 border-green-500/30';
      case 'generating':
        return 'text-amber-400 border-amber-500/30';
      case 'error':
        return 'text-red-400 border-red-500/30';
      default:
        return 'text-muted-foreground border-white/10';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 mb-4"
        >
          <Mic className="w-8 h-8 text-violet-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.voiceover.title')}</h2>
        <p className="text-muted-foreground">{t('steps.voiceover.description')}</p>
      </div>

      {/* Provider Selection & Progress Bar */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-violet-400" />
            <span className="text-sm text-muted-foreground mr-2">TTS Provider:</span>
            {/* Direct provider selection buttons */}
            <div className="flex gap-2">
              <Button
                variant={project.voiceSettings.provider === 'elevenlabs' ? 'default' : 'outline'}
                size="sm"
                className={`${
                  project.voiceSettings.provider === 'elevenlabs'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-0'
                    : 'border-white/10 hover:bg-white/5'
                }`}
                onClick={() => {
                  updateVoiceSettings(project.id, { language: 'en', provider: 'elevenlabs' });
                }}
              >
                🇬🇧 ElevenLabs
              </Button>
              <Button
                variant={project.voiceSettings.provider === 'gemini-tts' ? 'default' : 'outline'}
                size="sm"
                className={`${
                  project.voiceSettings.provider === 'gemini-tts'
                    ? 'bg-green-600 hover:bg-green-500 text-white border-0'
                    : 'border-white/10 hover:bg-white/5'
                }`}
                onClick={() => {
                  updateVoiceSettings(project.id, { language: 'sk', provider: 'gemini-tts' });
                }}
              >
                🇸🇰 Gemini TTS
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Dialog open={showVoiceSettings} onOpenChange={setShowVoiceSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-white/10">
                  <Settings className="w-4 h-4 mr-2" />
                  {t('steps.voiceover.voiceSettings')}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-white/10 max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t('steps.voiceover.assignVoices')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {project.characters.map((character) => (
                    <div key={character.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {character.imageUrl ? (
                          <img
                            src={character.imageUrl}
                            alt={character.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-violet-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{character.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {character.voiceName || t('steps.voiceover.noVoice')}
                          </p>
                        </div>
                      </div>
                      <Select
                        value={character.voiceId || ''}
                        onValueChange={(val) => handleVoiceChange(character.id, val)}
                      >
                        <SelectTrigger className="w-36 glass border-white/10">
                          <SelectValue placeholder={t('steps.voiceover.selectVoice')} />
                        </SelectTrigger>
                        <SelectContent className="glass-strong border-white/10">
                          {voices.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                              <div>
                                <p className="font-medium">{voice.name}</p>
                                <p className="text-xs text-muted-foreground">{voice.description}</p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              {volume[0] === 0 ? (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              )}
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="w-24"
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('steps.voiceover.progress')}</span>
            <span className="text-violet-400">
              {generatedCount} / {allDialogueLines.length} {t('steps.voiceover.linesGenerated')}
            </span>
          </div>
          <Progress
            value={(generatedCount / Math.max(allDialogueLines.length, 1)) * 100}
            className="h-2"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
          disabled={allDialogueLines.length === 0 || isGeneratingAll}
          onClick={handleGenerateAll}
        >
          {isGeneratingAll ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
              </motion.div>
              {t('steps.voiceover.generating')}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              {t('steps.voiceover.generateAll')}
              <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                {(() => {
                  const remaining = allDialogueLines.length - generatedCount;
                  const perItemCost = project.voiceSettings.provider === 'gemini-tts'
                    ? ACTION_COSTS.voiceover.geminiTts
                    : ACTION_COSTS.voiceover.elevenlabs;
                  return remaining > 0
                    ? formatCostCompact(perItemCost * remaining)
                    : `${formatCostCompact(perItemCost)}/ea`;
                })()}
              </Badge>
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="border-white/10 hover:bg-white/5"
          disabled={generatedCount === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          {t('steps.voiceover.downloadAll')}
        </Button>
      </div>

      {/* No dialogue warning */}
      {allDialogueLines.length === 0 && (
        <div className="glass rounded-xl p-6 border-l-4 border-amber-500 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">{t('steps.voiceover.noDialogue')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('steps.voiceover.noDialogueDescription')}
          </p>
        </div>
      )}

      {/* Dialogue Lines by Scene */}
      <div className="space-y-6">
        {project.scenes
          .filter((scene) => scene.dialogue.length > 0)
          .map((scene, sceneIndex) => (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sceneIndex * 0.1 }}
            >
              <Card className="glass border-white/10 overflow-hidden">
                <CardHeader className="pb-3 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge className="bg-violet-500/20 text-violet-400 border-0">
                        {t('steps.scenes.sceneLabel')} {scene.number || sceneIndex + 1}
                      </Badge>
                      {scene.title}
                    </CardTitle>
                    <Badge variant="outline" className="border-white/10">
                      {scene.dialogue.length} {t('steps.voiceover.lines')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {scene.dialogue.map((line, lineIndex) => {
                    const character = project.characters.find((c) => c.id === line.characterId);
                    const status = line.audioUrl
                      ? 'complete'
                      : audioStates[line.id]?.status || 'idle';

                    return (
                      <motion.div
                        key={line.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: lineIndex * 0.05 }}
                        className="glass rounded-lg p-3 flex items-start gap-3"
                      >
                        {/* Character Avatar */}
                        <div className="flex-shrink-0">
                          {character?.imageUrl ? (
                            <img
                              src={character.imageUrl}
                              alt={character.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                              <User className="w-5 h-5 text-violet-400" />
                            </div>
                          )}
                        </div>

                        {/* Dialogue Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-violet-400">
                              {character?.name || line.characterName}
                            </span>
                            {character?.voiceName && (
                              <Badge variant="outline" className="text-xs border-white/10">
                                {character.voiceName}
                              </Badge>
                            )}
                            {/* Show TTS provider badge if audio was generated */}
                            {line.audioUrl && line.ttsProvider && (
                              <Badge
                                className={`text-xs border-0 ${
                                  line.ttsProvider === 'elevenlabs'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-green-500/20 text-green-400'
                                }`}
                              >
                                {line.ttsProvider === 'elevenlabs' ? '🇬🇧 ElevenLabs' : '🇸🇰 Gemini TTS'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">"{line.text}"</p>

                          {/* Audio Player (if generated) */}
                          {line.audioUrl && (
                            <audio
                              ref={(el) => {
                                if (el) audioRefs.current[line.id] = el;
                              }}
                              src={line.audioUrl}
                              onEnded={() => setPlayingAudio(null)}
                            />
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {status === 'generating' ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </motion.div>
                              <span className="text-xs">{audioStates[line.id]?.progress}%</span>
                            </div>
                          ) : status === 'complete' || line.audioUrl ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => togglePlay(line.id)}
                              >
                                {playingAudio === line.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4 ml-0.5" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Download className="w-4 h-4" />
                              </Button>
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/10 hover:bg-white/5"
                              onClick={() => handleGenerateAudio(line.id, scene.id)}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              {t('steps.voiceover.generate')}
                              <span className="ml-1 text-[10px] opacity-70">
                                {formatCostCompact(
                                  project.voiceSettings.provider === 'gemini-tts'
                                    ? ACTION_COSTS.voiceover.geminiTts
                                    : ACTION_COSTS.voiceover.elevenlabs
                                )}
                              </span>
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          ))}
      </div>

      {/* Provider Info */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Mic className="w-5 h-5 text-violet-400" />
          {t('steps.voiceover.providerInfo')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`glass rounded-lg p-4 border-2 ${project.voiceSettings.provider === 'elevenlabs' ? 'border-blue-500/30' : 'border-transparent'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">🇬🇧 ElevenLabs</span>
              {project.voiceSettings.provider === 'elevenlabs' && (
                <Badge className="bg-blue-500/20 text-blue-400 border-0">Active</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('steps.voiceover.elevenLabsDescription')}
            </p>
          </div>
          <div className={`glass rounded-lg p-4 border-2 ${project.voiceSettings.provider === 'gemini-tts' ? 'border-green-500/30' : 'border-transparent'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">🇸🇰 Gemini TTS</span>
              {project.voiceSettings.provider === 'gemini-tts' && (
                <Badge className="bg-green-500/20 text-green-400 border-0">Active</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('steps.voiceover.geminiDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="glass rounded-xl p-4 border-l-4 border-violet-500">
        <p className="text-sm text-muted-foreground">
          <strong className="text-violet-400">Tip:</strong> {t('steps.voiceover.tip')}
        </p>
      </div>
    </div>
  );
}
