'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Image as ImageIcon,
  Video,
  Loader2,
  RefreshCw,
  Send,
  AlertCircle,
} from 'lucide-react';
import type { RegenerationRequest } from '@/types/collaboration';

interface RegenerationSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RegenerationRequest;
  onRegenerate: () => Promise<void>;
  onSelect: (selectedUrl: string) => Promise<void>;
}

export function RegenerationSelectionModal({
  open,
  onOpenChange,
  request,
  onRegenerate,
  onSelect,
}: RegenerationSelectionModalProps) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generatedUrls = (request.generatedUrls || []) as string[];
  const attemptsRemaining = request.maxAttempts - request.attemptsUsed;
  const canRegenerate = attemptsRemaining > 0 && ['approved', 'generating'].includes(request.status);
  const canSelect = generatedUrls.length > 0 && ['approved', 'selecting', 'generating'].includes(request.status);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSubmitSelection = async () => {
    if (!selectedUrl) return;
    setIsSubmitting(true);
    try {
      await onSelect(selectedUrl);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl glass-strong border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {request.targetType === 'image' ? (
              <ImageIcon className="w-5 h-5 text-purple-400" />
            ) : (
              <Video className="w-5 h-5 text-cyan-400" />
            )}
            Regeneration Options - {request.targetName || 'Scene'}
          </DialogTitle>
          <DialogDescription>
            {request.status === 'selecting' ? (
              'All attempts have been used. Please select the best option to submit for final approval.'
            ) : (
              `Generate up to ${request.maxAttempts} options and then select the best one. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Status badges */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              {request.attemptsUsed}/{request.maxAttempts} Generated
            </Badge>
            <Badge
              variant="outline"
              className={
                request.status === 'selecting'
                  ? 'border-amber-500/30 text-amber-400'
                  : request.status === 'approved'
                  ? 'border-green-500/30 text-green-400'
                  : 'border-blue-500/30 text-blue-400'
              }
            >
              {request.status === 'selecting'
                ? 'Select Best Option'
                : request.status === 'approved'
                ? 'Ready to Generate'
                : request.status}
            </Badge>
          </div>

          {/* Generated images grid */}
          {generatedUrls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {generatedUrls.map((url, index) => (
                <motion.div
                  key={url}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedUrl(url)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    selectedUrl === url
                      ? 'border-green-500 ring-2 ring-green-500/30 scale-[1.02]'
                      : 'border-white/10 hover:border-purple-500/50'
                  }`}
                >
                  {request.targetType === 'image' ? (
                    <img
                      src={url}
                      alt={`Option ${index + 1}`}
                      className="w-full aspect-video object-cover"
                    />
                  ) : (
                    <video
                      src={url}
                      className="w-full aspect-video object-cover"
                      controls={false}
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  )}

                  {/* Option number badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-black/70 text-white border-0">
                      Option {index + 1}
                    </Badge>
                  </div>

                  {/* Selected checkmark */}
                  <AnimatePresence>
                    {selectedUrl === url && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-green-500/20"
                      >
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

              {/* Placeholder for remaining attempts */}
              {Array.from({ length: attemptsRemaining }).map((_, index) => (
                <div
                  key={`placeholder-${index}`}
                  className="aspect-video rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center bg-black/20"
                >
                  <div className="text-center text-muted-foreground">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      Slot {generatedUrls.length + index + 1}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-black/20 rounded-lg border border-white/10">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No images generated yet</p>
              <p className="text-sm text-muted-foreground">
                Click &quot;Regenerate&quot; to generate your first option
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {/* Regenerate button */}
          {canRegenerate && (
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate ({attemptsRemaining} left)
                </>
              )}
            </Button>
          )}

          {/* Submit selection button */}
          <Button
            onClick={handleSubmitSelection}
            disabled={!selectedUrl || isSubmitting || !canSelect}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Selection for Approval
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
