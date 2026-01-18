'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  Video,
  FolderOpen,
  Check,
  AlertCircle,
  Loader2,
  Users,
  FileJson,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  autoDetected: boolean;
}

export function ImportProjectDialog({ open, onOpenChange }: ImportProjectDialogProps) {
  const t = useTranslations('import');
  const tProject = useTranslations('project');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { loadProjectsFromDB } = useProjectStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedProject, setParsedProject] = useState<ParsedProject | null>(null);

  const parseFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    // Parse files first to detect structure
    const characterImages = new Map<string, File>();
    const sceneImages = new Map<number, File>();
    const sceneVideos = new Map<number, File>();
    const otherImages: File[] = [];

    for (const file of fileArray) {
      const name = file.name.toLowerCase();
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || '';

      // Skip metadata.json, hidden files, and files in hidden directories
      if (name === 'metadata.json' || name.startsWith('.')) continue;
      if (relativePath.split('/').some(part => part.startsWith('.'))) continue;

      // Scene images: scene1.jpg, scene2.jpg, etc.
      const sceneImageMatch = name.match(/^scene(\d+)\.(jpg|jpeg|png)$/);
      if (sceneImageMatch) {
        sceneImages.set(parseInt(sceneImageMatch[1]), file);
        continue;
      }

      // Scene videos: video1.mp4, video2.mp4, etc.
      const sceneVideoMatch = name.match(/^video(\d+)\.(mp4|webm|mov)$/);
      if (sceneVideoMatch) {
        sceneVideos.set(parseInt(sceneVideoMatch[1]), file);
        continue;
      }

      // Other images are potential character images
      if (/\.(jpg|jpeg|png)$/.test(name)) {
        otherImages.push(file);
      }
    }

    // Find metadata.json (optional now)
    const metadataFile = fileArray.find(
      (f) => f.name === 'metadata.json' || f.name.endsWith('/metadata.json')
    );

    let metadata: ParsedProject['metadata'];
    let autoDetected = false;

    if (metadataFile) {
      // Use provided metadata
      try {
        const metadataText = await metadataFile.text();
        metadata = JSON.parse(metadataText);

        // Match character images from metadata
        if (metadata.characters) {
          for (const char of metadata.characters) {
            const charName = char.name.toLowerCase().replace(/\s+/g, '_');
            const matchingFile = otherImages.find(f => {
              const fname = f.name.toLowerCase().replace(/\.(jpg|jpeg|png)$/, '');
              return fname === charName || fname === `character_${charName}`;
            });
            if (matchingFile) {
              characterImages.set(char.name.toLowerCase(), matchingFile);
            }
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : t('invalidJson');
        setError(t('parseError') + errorMessage);
        return;
      }
    } else {
      // Auto-detect from files
      autoDetected = true;

      // Get folder name from first file path or use default
      let folderName = t('defaultProjectName');
      if (fileArray.length > 0 && fileArray[0].webkitRelativePath) {
        const pathParts = fileArray[0].webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          folderName = pathParts[0];
        }
      }

      // Detect characters from non-scene images
      const characters: Array<{ name: string; description: string; visualDescription: string }> = [];
      for (const file of otherImages) {
        const name = file.name.replace(/\.(jpg|jpeg|png)$/i, '').replace(/[_-]/g, ' ');
        // Capitalize first letter of each word
        const displayName = name.replace(/\b\w/g, c => c.toUpperCase());
        characters.push({
          name: displayName,
          description: t('characterPrefix') + displayName,
          visualDescription: displayName + t('characterSuffix'),
        });
        characterImages.set(displayName.toLowerCase(), file);
      }

      // Create scenes from detected images/videos
      const sceneCount = Math.max(sceneImages.size, sceneVideos.size);
      const scenes: Array<{ number: number; title: string; description: string; dialogue: Array<{ character: string; text: string }> }> = [];

      for (let i = 1; i <= sceneCount; i++) {
        scenes.push({
          number: i,
          title: t('scenePrefix') + i,
          description: '',
          dialogue: [],
        });
      }

      metadata = {
        name: folderName,
        style: 'custom',
        story: '',
        characters,
        scenes,
      };
    }

    if (!metadata.name) {
      metadata.name = t('defaultProjectName');
    }

    // Check if we have anything to import
    if (sceneImages.size === 0 && sceneVideos.size === 0 && characterImages.size === 0) {
      setError(t('noValidFiles'));
      return;
    }

    setParsedProject({
      metadata,
      files: { characterImages, sceneImages, sceneVideos },
      autoDetected,
    });
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
        throw new Error(result.error || t('failed'));
      }

      // Refresh projects and navigate
      await loadProjectsFromDB();
      onOpenChange(false);
      router.push(`/project/${result.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('failed'));
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
            {tProject('importProject')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {tProject('importDescription')}
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
              <p className="text-lg font-medium mb-2">{tProject('dropFolderHere')}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {tProject('orSelectFiles')}
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
                  <span>{tProject('selectFolder')}</span>
                </Button>
              </label>
            </div>

            {/* Expected Format */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <p className="text-sm font-medium mb-3">{tProject('expectedFormat')}</p>
              <div className="space-y-2 text-sm text-muted-foreground font-mono">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-yellow-400" />
                  <span>{t('metadataFile')}</span>
                  <span className="text-xs text-muted-foreground/60">(optional)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span>{t('characterFile')}</span>
                  <span className="text-xs text-muted-foreground/60">(auto-detected as characters)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span>{t('sceneFiles')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-orange-400" />
                  <span>{t('videoFiles')}</span>
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
            {/* Auto-detected notice */}
            {parsedProject.autoDetected && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2 text-blue-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{tProject('autoDetectedNotice')}</p>
              </div>
            )}

            {/* Preview */}
            <div className="p-4 bg-white/5 rounded-lg space-y-4">
              {/* Editable project name */}
              <div className="space-y-2">
                <Label htmlFor="projectName" className="text-sm text-muted-foreground">
                  {tProject('projectName')}
                </Label>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <Input
                    id="projectName"
                    value={parsedProject.metadata.name}
                    onChange={(e) => {
                      setParsedProject({
                        ...parsedProject,
                        metadata: {
                          ...parsedProject.metadata,
                          name: e.target.value,
                        },
                      });
                    }}
                    className="bg-white/5 border-white/10"
                    placeholder={tProject('enterProjectName')}
                  />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-muted-foreground">{tProject('characters')}</p>
                    <p className="font-medium">
                      {parsedProject.metadata.characters?.length || 0}
                      <span className="text-muted-foreground text-xs ml-1">
                        ({t('characterImages', { count: parsedProject.files.characterImages.size })})
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-muted-foreground">{tProject('scenes')}</p>
                    <p className="font-medium">
                      {parsedProject.metadata.scenes?.length || 0}
                      <span className="text-muted-foreground text-xs ml-1">
                        ({t('sceneImages', { count: parsedProject.files.sceneImages.size })})
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="text-muted-foreground">{tProject('videos')}</p>
                    <p className="font-medium">{parsedProject.files.sceneVideos.size}</p>
                  </div>
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
                {tCommon('back')}
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 min-w-[140px]"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {tProject('importing')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {tProject('import')}
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
