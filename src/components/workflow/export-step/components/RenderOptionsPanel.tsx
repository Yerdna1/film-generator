'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Clapperboard,
  Settings,
  Music,
  Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import type { useBackgroundMusic, useVideoComposer } from '../../export/hooks';
import type { ExportHandlers, ProjectStats } from '../../export/types';
import type { Scene, Project } from '@/types/project';
import { BackgroundMusicSection } from './BackgroundMusicSection';
import { VideoCompositionOptions } from './VideoCompositionOptions';
import { CompositionStatus } from './CompositionStatus';
import { DownloadTab } from './DownloadTab';

interface RenderOptionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  isReadOnly: boolean;
  backgroundMusic: ReturnType<typeof useBackgroundMusic>;
  videoComposer: ReturnType<typeof useVideoComposer>;
  stats: {
    totalDuration: number;
  } & ProjectStats;
  project: Project;
  exportHandlers: ExportHandlers;
  downloadingImages?: boolean;
  downloadingVideos?: boolean;
  downloadingAudio?: boolean;
  downloadingMusic?: boolean;
  downloadingAll?: boolean;
  onDownloadImages?: () => Promise<void>;
  onDownloadVideos?: () => Promise<void>;
  onDownloadAudio?: () => Promise<void>;
  onDownloadMusic?: () => Promise<void>;
  onDownloadDialogues?: () => void;
  onDownloadAll?: () => Promise<void>;
}

export function RenderOptionsPanel({
  isOpen,
  onClose,
  scenes,
  isReadOnly,
  backgroundMusic,
  videoComposer,
  stats,
  project,
  exportHandlers,
  downloadingImages,
  downloadingVideos,
  downloadingAudio,
  downloadingMusic,
  downloadingAll,
  onDownloadImages,
  onDownloadVideos,
  onDownloadAudio,
  onDownloadMusic,
  onDownloadDialogues,
  onDownloadAll,
}: RenderOptionsPanelProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'render' | 'music' | 'download'>('music');

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 overflow-hidden w-full lg:w-auto"
        >
          <Card className="glass border-black/10 dark:border-white/10 h-full">
            <CardContent className="p-0">
              {/* Header */}
              <div className="px-3 sm:px-4 py-3 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className="text-sm font-medium truncate">{t('steps.export.renderVideo')}</span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0 hidden sm:inline">
                  {scenes.length} {t('steps.export.scenes').toLowerCase()}
                </span>
                {/* Mobile close button */}
                <button
                  onClick={onClose}
                  className="lg:hidden ml-auto p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[500px] sm:max-h-[650px] overflow-y-auto">
                {/* Composition Status - always show if composing or has result */}
                {(videoComposer.compositionState.isComposing ||
                  videoComposer.compositionState.status === 'error' ||
                  videoComposer.result) && (
                  <div className="p-3 sm:p-4 border-b border-black/5 dark:border-white/5">
                    <CompositionStatus videoComposer={videoComposer} />
                  </div>
                )}

                {/* Tabs */}
                <Tabs
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as 'render' | 'music' | 'download')}
                  className="w-full"
                >
                  {/* Tab List */}
                  <div className="px-3 sm:px-4 pt-3 sm:pt-4">
                    <TabsList className="grid grid-cols-2 w-full h-9 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                      {/* Render tab hidden for now */}
                      {/* <TabsTrigger
                        value="render"
                        className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Render</span>
                      </TabsTrigger> */}
                      <TabsTrigger
                        value="music"
                        className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 text-xs gap-1.5"
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Music</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="download"
                        className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Tab Content */}
                  <div className="p-3 sm:p-4">
                    {/* Render Tab - Hidden for now */}
                    {/* <TabsContent value="render" className="mt-0 space-y-4">
                      {!videoComposer.hasEndpoint ? (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            {t('steps.export.vectcutNotConfigured')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure the Vectcut endpoint to enable video rendering.
                          </p>
                        </div>
                      ) : (
                        <VideoCompositionOptions
                          videoComposer={videoComposer}
                          stats={stats}
                        />
                      )}
                    </TabsContent> */}

                    {/* Music Tab */}
                    <TabsContent value="music" className="mt-0">
                      <BackgroundMusicSection
                        backgroundMusic={backgroundMusic}
                        isReadOnly={isReadOnly}
                        stats={stats}
                      />
                    </TabsContent>

                    {/* Download Tab */}
                    <TabsContent value="download" className="mt-0">
                      <DownloadTab
                        exportHandlers={exportHandlers}
                        stats={stats}
                        downloadingImages={downloadingImages}
                        downloadingVideos={downloadingVideos}
                        downloadingAudio={downloadingAudio}
                        downloadingMusic={downloadingMusic}
                        downloadingAll={downloadingAll}
                        onDownloadImages={onDownloadImages}
                        onDownloadVideos={onDownloadVideos}
                        onDownloadAudio={onDownloadAudio}
                        onDownloadMusic={onDownloadMusic}
                        onDownloadDialogues={onDownloadDialogues}
                        onDownloadAll={onDownloadAll}
                        project={project}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
