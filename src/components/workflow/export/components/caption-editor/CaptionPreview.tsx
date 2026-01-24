import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { captionFontSizes } from '@/lib/constants/video-editor';
import type { Caption } from '@/types/project';

interface CaptionPreviewProps {
  caption: Caption;
}

export function CaptionPreview({ caption }: CaptionPreviewProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Preview</Label>
      <div className="relative h-24 rounded-lg bg-black/50 flex items-end justify-center overflow-hidden">
        <div
          className={cn(
            'absolute left-0 right-0 px-4 text-center',
            caption.style.position === 'top' && 'top-2',
            caption.style.position === 'center' && 'top-1/2 -translate-y-1/2',
            caption.style.position === 'bottom' && 'bottom-2'
          )}
        >
          <span
            className={cn(
              'px-3 py-1 rounded inline-block',
              caption.style.textShadow && 'drop-shadow-lg'
            )}
            style={{
              fontSize: captionFontSizes[caption.style.fontSize],
              color: caption.style.color,
              backgroundColor: caption.style.backgroundColor,
              fontFamily:
                caption.style.fontFamily === 'serif'
                  ? 'Georgia, serif'
                  : caption.style.fontFamily === 'mono'
                    ? 'monospace'
                    : 'inherit',
            }}
          >
            {caption.text || 'Caption preview'}
          </span>
        </div>
      </div>
    </div>
  );
}
