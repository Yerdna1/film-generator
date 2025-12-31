'use client';

import { useTranslations } from 'next-intl';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface TimelineHeaderProps {
  totalDuration: number; // in seconds
  zoom: number; // pixels per second
  scrollLeft: number;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  compact?: boolean;
}

const SCENE_DURATION = 6; // seconds per scene

export function TimelineHeader({
  totalDuration,
  zoom,
  scrollLeft,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  compact = false,
}: TimelineHeaderProps) {
  const t = useTranslations();

  // Generate time markers
  const markerInterval = zoom >= 100 ? 6 : 12; // Show markers every 6s or 12s based on zoom
  const markers: number[] = [];
  for (let time = 0; time <= totalDuration; time += markerInterval) {
    markers.push(time);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center border-b border-white/10 bg-black/20">
      {/* Track labels column */}
      <div className={`${compact ? 'w-20' : 'w-24'} flex-shrink-0 px-2 py-0.5 border-r border-white/10 flex items-center justify-between`}>
        <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Timeline</span>
      </div>

      {/* Time ruler */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className={`relative ${compact ? 'h-5' : 'h-6'} flex items-end`}
          style={{ width: totalDuration * zoom }}
        >
          {markers.map((time) => (
            <div
              key={time}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: time * zoom }}
            >
              <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-muted-foreground mb-0.5`}>
                {formatTime(time)}
              </span>
              <div className="w-px h-1.5 bg-white/30" />
            </div>
          ))}
          {/* Minor ticks (every 2 seconds when zoomed in) */}
          {zoom >= 100 &&
            Array.from({ length: Math.ceil(totalDuration / 2) }, (_, i) => i * 2)
              .filter(t => t % markerInterval !== 0)
              .map((time) => (
                <div
                  key={`minor-${time}`}
                  className="absolute bottom-0 w-px h-1 bg-white/20"
                  style={{ left: time * zoom }}
                />
              ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex-shrink-0 px-2 py-0.5 border-l border-white/10 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onZoomOut}
          disabled={zoom <= 50}
        >
          <ZoomOut className="h-2.5 w-2.5" />
        </Button>
        <div className="w-14">
          <Slider
            value={[zoom]}
            min={50}
            max={200}
            step={25}
            onValueChange={([value]) => onZoomChange(value)}
            className="h-1"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onZoomIn}
          disabled={zoom >= 200}
        >
          <ZoomIn className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}
