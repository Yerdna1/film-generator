'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Upload,
  FileJson,
  Image as ImageIcon,
  Video,
  FolderOpen,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProjectStore } from '@/lib/stores/project-store';

interface ImportProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedProject {
  metadata: {
    name: string;
    style?: string;
    story?: string;
    masterPrompt?: string;
    characters?: Array<{
      name: string;
      description?: string;
      visualDescription?: string;
    }>;
    scenes?: Array<{
      number: number;
      title: string;
      description?: string;
      textToImagePrompt?: string;
      imageToVideoPrompt?: string;
      dialogue?: Array<{ character: string; text: string }>;
    }>;
  };
  files: {
    characterImages: Map<string, File>;
    sceneImages: Map<number, File>;
    sceneVideos: Map<number, File>;
  };
}

export function ImportProjectDialog({ open, onOpenChange }: ImportProjectDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const { loadProjectsFromDB } = useProjectStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedProject, setParsedProject] = useState<ParsedProject | null>(null);

  const parseFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    // Find metadata.json
    const metadataFile = fileArray.find(
      (f) => f.name === 'metadata.json' || f.name.endsWith('/metadata.json')
    );

    if (!metadataFile) {
      setError('Missing metadata.json file. Please include a metadata.json with project info.');
      return;
    }

    try {
      const metadataText = await metadataFile.text();
      const metadata = JSON.parse(metadataText);

      if (!metadata.name) {
        setError('metadata.json must include a "name" field');
        return;
      }

      // Parse files
      const characterImages = new Map<string, File>();
      const sceneImages = new Map<number, File>();
      const sceneVideos = new Map<number, File>();

      for (const file of fileArray) {
        const name = file.name.toLowerCase();

        // Character images: character_name.jpg or name.jpg matching character names
        if (metadata.characters) {
          for (const char of metadata.characters) {
            const charName = char.name.toLowerCase().replace(/\s+/g, '_');
            if (
              name === `${charName}.jpg` ||
              name === `${charName}.jpeg` ||
              name === `${charName}.png` ||
              name === `character_${charName}.jpg` ||
              name === `character_${charName}.jpeg` ||
              name === `character_${charName}.png`
            ) {
              characterImages.set(char.name.toLowerCase(), file);
            }
          }
        }

        // Scene images: scene1.jpg, scene2.jpg, etc.
        const sceneImageMatch = name.match(/^scene(\d+)\.(jpg|jpeg|png)$/);
        if (sceneImageMatch) {
          sceneImages.set(parseInt(sceneImageMatch[1]), file);
        }

        // Scene videos: video1.mp4, video2.mp4, etc.
        const sceneVideoMatch = name.match(/^video(\d+)\.(mp4|webm|mov)$/);
        if (sceneVideoMatch) {
          sceneVideos.set(parseInt(sceneVideoMatch[1]), file);
        }
      }

      setParsedProject({
        metadata,
        files: { characterImages, sceneImages, sceneVideos },
      });
    } catch (e) {
      setError('Failed to parse metadata.json: ' + (e instanceof Error ? e.message : 'Invalid JSON'));
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const items = e.dataTransfer.items;
      const files: File[] = [];

      // Handle folder drop
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry?.();
        if (item) {
          await traverseFileTree(item, files);
        }
      }

      if (files.length > 0) {
        await parseFiles(files);
      }
    },
    [parseFiles]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        await parseFiles(e.target.files);
      }
    },
    [parseFiles]
  );

  const handleImport = async () => {
    if (!parsedProject) return;

    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();

      // Add metadata
      formData.append(
        'metadata',
        new Blob([JSON.stringify(parsedProject.metadata)], { type: 'application/json' }),
        'metadata.json'
      );

      // Add character images
      for (const [name, file] of parsedProject.files.characterImages) {
        formData.append(`character_${name}`, file);
      }

      // Add scene images and videos
      for (const [num, file] of parsedProject.files.sceneImages) {
        formData.append(`scene_${num}_image`, file);
      }
      for (const [num, file] of parsedProject.files.sceneVideos) {
        formData.append(`scene_${num}_video`, file);
      }

      const response = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      // Refresh projects and navigate
      await loadProjectsFromDB();
      onOpenChange(false);
      router.push(`/project/${result.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setParsedProject(null);
      setError(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-strong border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Upload className="w-6 h-6" />
            {t('project.importProject')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('project.importDescription')}
          </DialogDescription>
        </DialogHeader>

        {!parsedProject ? (
          <div className="py-6">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">{t('project.dropFolderHere')}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t('project.orSelectFiles')}
              </p>
              <label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  // @ts-expect-error - webkitdirectory is not in the types
                  webkitdirectory=""
                  directory=""
                />
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>{t('project.selectFolder')}</span>
                </Button>
              </label>
            </div>

            {/* Expected Format */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <p className="text-sm font-medium mb-3">{t('project.expectedFormat')}</p>
              <div className="space-y-2 text-sm text-muted-foreground font-mono">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-yellow-400" />
                  <span>metadata.json</span>
                  <span className="text-xs text-muted-foreground/60">(required)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span>character_name.jpeg</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span>scene1.jpeg, scene2.jpeg, ...</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-orange-400" />
                  <span>video1.mp4, video2.mp4, ...</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 space-y-4">
            {/* Preview */}
            <div className="p-4 bg-white/5 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span className="font-medium">{parsedProject.metadata.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('project.characters')}</p>
                  <p className="font-medium">
                    {parsedProject.metadata.characters?.length || 0}
                    <span className="text-muted-foreground text-xs ml-1">
                      ({parsedProject.files.characterImages.size} images)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('project.scenes')}</p>
                  <p className="font-medium">
                    {parsedProject.metadata.scenes?.length || 0}
                    <span className="text-muted-foreground text-xs ml-1">
                      ({parsedProject.files.sceneImages.size} images)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('project.videos')}</p>
                  <p className="font-medium">{parsedProject.files.sceneVideos.size}</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setParsedProject(null)}>
                {t('common.back')}
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 min-w-[140px]"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('project.importing')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t('project.import')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper to traverse file tree for folder drops
async function traverseFileTree(item: FileSystemEntry, files: File[]): Promise<void> {
  if (item.isFile) {
    const fileEntry = item as FileSystemFileEntry;
    const file = await new Promise<File>((resolve) => fileEntry.file(resolve));
    files.push(file);
  } else if (item.isDirectory) {
    const dirEntry = item as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve) =>
      reader.readEntries(resolve)
    );
    for (const entry of entries) {
      await traverseFileTree(entry, files);
    }
  }
}
