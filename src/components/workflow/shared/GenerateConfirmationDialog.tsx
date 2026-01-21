'use client';

import { motion } from 'framer-motion';
import { Wand2, User, FileText, Video, Mic, Image as ImageIcon, LucideIcon, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

type ConfirmationIcon = 'wand' | 'user' | 'file' | 'video' | 'mic' | 'image';

const ICONS: Record<ConfirmationIcon, LucideIcon> = {
  wand: Wand2,
  user: User,
  file: FileText,
  video: Video,
  mic: Mic,
  image: ImageIcon,
};

const DEFAULT_GRADIENT = 'from-purple-500 to-cyan-500';
const ICON_COLORS: Record<ConfirmationIcon, string> = {
  wand: 'text-purple-400',
  user: 'text-purple-400',
  file: 'text-cyan-400',
  video: 'text-pink-400',
  mic: 'text-violet-400',
  image: 'text-blue-400',
};

export interface InfoItem {
  label: string;
  value: string;
  icon?: string;
}

export interface GenerateConfirmationDialogProps {
  isOpen: boolean;
  icon?: ConfirmationIcon;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  infoItems?: InfoItem[];
  provider?: string;
  model?: string;
  isGenerating?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  providerColor?: string;
  modelColor?: string;
}

export function GenerateConfirmationDialog({
  isOpen,
  icon = 'wand',
  title,
  description,
  confirmLabel,
  cancelLabel,
  infoItems = [],
  provider,
  model,
  isGenerating = false,
  onConfirm,
  onCancel,
  providerColor = 'text-purple-400',
  modelColor = 'text-cyan-400',
}: GenerateConfirmationDialogProps) {
  const commonT = useTranslations('common');

  if (!isOpen) return null;

  const IconComponent = ICONS[icon];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-2xl p-8 max-w-md mx-4 border border-white/10 w-full"
      >
        <div className="flex flex-col gap-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${DEFAULT_GRADIENT} rounded-full blur-xl opacity-50`}></div>
              <IconComponent className={`w-16 h-16 ${ICON_COLORS[icon]} relative z-10`} />
            </div>
          </div>

          {/* Title and description */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          {/* Info items */}
          <div className="space-y-2 py-2">
            {/* Provider info */}
            {provider && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-white/5">
                <div className="flex items-center gap-2">
                  {infoItems.find(i => i.label === 'Provider')?.icon && (
                    <span className="text-xl">{infoItems.find(i => i.label === 'Provider')!.icon}</span>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Provider</div>
                    <div className={`font-medium text-sm ${providerColor}`}>{provider}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Model info */}
            {model && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-white/5">
                <div>
                  <div className="text-xs text-muted-foreground">Model</div>
                  <div className={`font-medium text-sm ${modelColor}`} title={model}>
                    {model.includes('/') ? model.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || model : model}
                  </div>
                </div>
              </div>
            )}

            {/* Additional info items */}
            {infoItems
              .filter(item => item.label !== 'Provider')
              .map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-white/5">
                  {item.icon && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className="font-medium text-sm">{item.value}</div>
                      </div>
                    </div>
                  )}
                  {!item.icon && (
                    <div>
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                      <div className="font-medium text-sm">{item.value}</div>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isGenerating}
              className="flex-1 border-white/10"
            >
              {cancelLabel || commonT('cancel')}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isGenerating}
              className={`flex-1 bg-gradient-to-r ${DEFAULT_GRADIENT} hover:opacity-90 text-white border-0`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {commonT('generating')}
                </>
              ) : (
                <>
                  <IconComponent className="w-4 h-4 mr-2" />
                  {confirmLabel || commonT('generate')}
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
