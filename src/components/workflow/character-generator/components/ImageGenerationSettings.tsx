'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IMAGE_RESOLUTIONS, ASPECT_RATIOS, getImageCost, formatCostCompact } from '@/lib/services/real-costs';
import type { ImageResolution, AspectRatio } from '@/lib/services/real-costs';
import type { ImageGenerationSettingsProps } from '../types';

export function ImageGenerationSettings({
  imageResolution,
  aspectRatio,
  onResolutionChange,
  onAspectRatioChange,
}: ImageGenerationSettingsProps) {
  return (
    <div className="glass rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Resolution Selector */}
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Quality:</Label>
          <Select
            value={imageResolution}
            onValueChange={(value) => onResolutionChange(value as ImageResolution)}
          >
            <SelectTrigger className="w-40 glass border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {(Object.entries(IMAGE_RESOLUTIONS) as [ImageResolution, { label: string; maxPixels: string; description: string }][]).map(([key, data]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{data.label}</span>
                    <span className="text-xs text-muted-foreground">{formatCostCompact(getImageCost(key))}/img</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Aspect:</Label>
          <Select
            value={aspectRatio}
            onValueChange={(value) => onAspectRatioChange(value as AspectRatio)}
          >
            <SelectTrigger className="w-44 glass border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {(Object.entries(ASPECT_RATIOS) as [AspectRatio, { label: string; description: string }][]).map(([key, data]) => (
                <SelectItem key={key} value={key}>
                  <span className="font-medium">{data.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {ASPECT_RATIOS[aspectRatio]?.description}
      </div>
    </div>
  );
}
