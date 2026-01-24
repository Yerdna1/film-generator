import { motion } from 'framer-motion';
import { Save, X, Wand2, Clock, Palette, Type, AlignVerticalJustifyCenter, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SCENE_DURATION } from './caption-constants';
import type { Caption } from '@/types/project';

interface CaptionFormProps {
  caption: Caption;
  onUpdateField: <K extends keyof Caption>(field: K, value: Caption[K]) => void;
  onUpdateStyle: <K extends keyof Caption['style']>(field: K, value: Caption['style'][K]) => void;
  onSave: () => void;
  onCancel: () => void;
  compact?: boolean;
}

export function CaptionForm({
  caption,
  onUpdateField,
  onUpdateStyle,
  onSave,
  onCancel,
  compact = false,
}: CaptionFormProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  const animationOptions = [
    { value: 'none', label: 'None' },
    { value: 'fadeIn', label: 'Fade In' },
    { value: 'slideUp', label: 'Slide Up' },
    { value: 'typewriter', label: 'Typewriter' },
    { value: 'popIn', label: 'Pop In' },
  ] as const;

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ] as const;

  const positionOptions = [
    { value: 'top', label: 'Top' },
    { value: 'center', label: 'Center' },
    { value: 'bottom', label: 'Bottom' },
  ] as const;

  const fontFamilyOptions = [
    { value: 'default', label: 'Sans Serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Monospace' },
  ] as const;

  if (compact) {
    return (
      <div className="space-y-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
        <Textarea
          value={caption.text}
          onChange={(e) => onUpdateField('text', e.target.value)}
          placeholder="Caption text..."
          className="min-h-[50px] text-xs bg-white/5 border-white/10"
        />
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-6 text-[10px] flex-1">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!caption.text.trim()}
            className="h-6 text-[10px] flex-1 bg-yellow-600 hover:bg-yellow-700"
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
    >
      {/* Caption text */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <Type className="w-3 h-3" />
          Caption Text
        </Label>
        <Textarea
          value={caption.text}
          onChange={(e) => onUpdateField('text', e.target.value)}
          placeholder="Enter caption text..."
          className="min-h-[60px] bg-white/5 border-white/10"
        />
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Start Time ({formatTime(caption.startTime)})
          </Label>
          <Slider
            value={[caption.startTime]}
            min={0}
            max={SCENE_DURATION}
            step={0.1}
            onValueChange={([value]) => onUpdateField('startTime', value)}
            className="cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            End Time ({formatTime(caption.endTime)})
          </Label>
          <Slider
            value={[caption.endTime]}
            min={0}
            max={SCENE_DURATION}
            step={0.1}
            onValueChange={([value]) => onUpdateField('endTime', value)}
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* Style options */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Animation
          </Label>
          <Select
            value={caption.animation}
            onValueChange={(value) => onUpdateField('animation', value as Caption['animation'])}
          >
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {animationOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <AlignVerticalJustifyCenter className="w-3 h-3" />
            Position
          </Label>
          <Select
            value={caption.style.position}
            onValueChange={(value) => onUpdateStyle('position', value as 'top' | 'center' | 'bottom')}
          >
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {positionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Type className="w-3 h-3" />
            Font Size
          </Label>
          <Select
            value={caption.style.fontSize}
            onValueChange={(value) => onUpdateStyle('fontSize', value as 'small' | 'medium' | 'large')}
          >
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontSizeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Type className="w-3 h-3" />
            Font Family
          </Label>
          <Select
            value={caption.style.fontFamily}
            onValueChange={(value) => onUpdateStyle('fontFamily', value as 'default' | 'serif' | 'mono')}
          >
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilyOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Palette className="w-3 h-3" />
            Text Color
          </Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={caption.style.color}
              onChange={(e) => onUpdateStyle('color', e.target.value)}
              className="w-10 h-9 p-1 bg-white/5 border-white/10 cursor-pointer"
            />
            <Input
              type="text"
              value={caption.style.color}
              onChange={(e) => onUpdateStyle('color', e.target.value)}
              className="flex-1 bg-white/5 border-white/10 font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Palette className="w-3 h-3" />
            Background
          </Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={caption.style.backgroundColor.replace(/rgba?\([^)]+\)/, '#000000')}
              onChange={(e) => {
                const hex = e.target.value;
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                onUpdateStyle('backgroundColor', `rgba(${r},${g},${b},0.7)`);
              }}
              className="w-10 h-9 p-1 bg-white/5 border-white/10 cursor-pointer"
            />
            <Input
              type="text"
              value={caption.style.backgroundColor}
              onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}
              className="flex-1 bg-white/5 border-white/10 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={!caption.text.trim()}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          <Save className="w-4 h-4 mr-1" />
          Save Caption
        </Button>
      </div>
    </motion.div>
  );
}
