'use client';

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PromptCard } from './PromptCard';
import type { Scene } from '@/types/project';

interface PromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenes: Scene[];
}

export function PromptsDialog({ open, onOpenChange, scenes }: PromptsDialogProps) {
  const scenesWithImages = scenes.filter(s => s.imageUrl).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-purple-400" />
            Copy Prompts for Gemini Web Interface
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {scenes.map((scene, index) => (
            <PromptCard
              key={scene.id}
              scene={scene}
              index={index}
              hasImage={!!scene.imageUrl}
            />
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <div className="text-sm text-muted-foreground">
            {scenes.length} prompts • {scenesWithImages} already have images
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
