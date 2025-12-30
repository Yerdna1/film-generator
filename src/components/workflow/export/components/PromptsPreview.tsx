'use client';

import { useTranslations } from 'next-intl';
import { Sparkles, Users, Film, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CopyButton } from '@/components/shared/CopyButton';
import type { Project } from '@/types/project';

interface PromptsPreviewProps {
  project: Project;
  getFullMarkdown: () => string;
}

export function PromptsPreview({ project, getFullMarkdown }: PromptsPreviewProps) {
  const t = useTranslations();

  return (
    <Card className="glass border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-400" />
            {t('steps.export.promptsPreview')}
          </CardTitle>
          <CopyButton text={getFullMarkdown()} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="characters" className="w-full">
          <TabsList className="glass w-full justify-start mb-4">
            <TabsTrigger value="characters">
              <Users className="w-4 h-4 mr-2" />
              {t('steps.export.characters')}
            </TabsTrigger>
            <TabsTrigger value="scenes">
              <Film className="w-4 h-4 mr-2" />
              {t('steps.export.scenes')}
            </TabsTrigger>
            <TabsTrigger value="full">
              <FileText className="w-4 h-4 mr-2" />
              {t('steps.export.fullDocument')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="characters" className="space-y-4">
            {project.characters.map((character) => (
              <div key={character.id} className="glass rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {character.imageUrl ? (
                      <img
                        src={character.imageUrl}
                        alt={character.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                    )}
                    <h4 className="font-semibold">{character.name}</h4>
                  </div>
                  <CopyButton text={character.masterPrompt} size="icon" className="h-8 w-8" />
                </div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-3 max-h-32 overflow-y-auto">
                  {character.masterPrompt}
                </pre>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="scenes">
            <Accordion type="multiple" className="space-y-2">
              {project.scenes.map((scene, index) => (
                <AccordionItem
                  key={scene.id}
                  value={scene.id}
                  className="glass rounded-lg border-white/5"
                >
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                        {scene.number || index + 1}
                      </Badge>
                      <span>{scene.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-emerald-400">
                          {t('steps.scenes.textToImagePrompt')}
                        </span>
                        <CopyButton text={scene.textToImagePrompt} size="icon" className="h-6 w-6" />
                      </div>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-2">
                        {scene.textToImagePrompt}
                      </pre>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-orange-400">
                          {t('steps.scenes.imageToVideoPrompt')}
                        </span>
                        <CopyButton text={scene.imageToVideoPrompt} size="icon" className="h-6 w-6" />
                      </div>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-2">
                        {scene.imageToVideoPrompt}
                      </pre>
                    </div>
                    {scene.dialogue.length > 0 && (
                      <div>
                        <span className="text-xs text-violet-400">{t('steps.scenes.dialogue')}</span>
                        <div className="bg-black/20 rounded p-2 mt-1">
                          {scene.dialogue.map((line, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              <span className="text-violet-400">{line.characterName}:</span> "{line.text}"
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          <TabsContent value="full">
            <div className="glass rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {getFullMarkdown()}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
