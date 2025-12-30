'use client';

import { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Scene } from '@/types/project';

interface PromptCardProps {
  scene: Scene;
  index: number;
  hasImage: boolean;
}

export function PromptCard({ scene, index, hasImage }: PromptCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(scene.textToImagePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`glass rounded-lg p-4 ${hasImage ? 'border-l-4 border-green-500/50' : 'border-l-4 border-orange-500/50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-emerald-400">Scene {scene.number || index + 1}</span>
            <span className="text-sm text-muted-foreground">• {scene.title}</span>
            {hasImage && (
              <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Has Image
              </Badge>
            )}
          </div>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-2 max-h-24 overflow-y-auto">
            {scene.textToImagePrompt}
          </pre>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={copied ? 'border-green-500/50 text-green-400' : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'}
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
