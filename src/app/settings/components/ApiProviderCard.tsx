'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { ApiProvider } from '../constants';

interface ApiProviderCardProps {
  provider: ApiProvider;
  index: number;
  showKey: boolean;
  isSaved: boolean;
  value: string;
  isConfigured: boolean;
  onToggleVisibility: () => void;
  onSave: () => void;
  onChange: (value: string) => void;
  isHighlighted?: boolean;
}

export function ApiProviderCard({
  provider,
  index,
  showKey,
  isSaved,
  value,
  isConfigured,
  onToggleVisibility,
  onSave,
  onChange,
  isHighlighted,
}: ApiProviderCardProps) {
  const tPage = useTranslations('settingsPage');
  const tCommon = useTranslations('common');

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`glass rounded-xl p-4 space-y-3 ${isHighlighted ? 'ring-2 ring-amber-500/50 bg-amber-500/5' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${provider.bgColor} flex items-center justify-center`}>
            <provider.icon className={`w-5 h-5 ${provider.color}`} />
          </div>
          <div>
            <h3 className="font-medium">{provider.name}</h3>
            <p className="text-xs text-muted-foreground">{provider.description}</p>
          </div>
        </div>
        <a
          href={provider.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
        >
          {tPage('getApiKey')}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            placeholder={`Enter ${provider.name} API key...`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pr-10 glass border-border focus:border-purple-500/50"
          />
          <button
            type="button"
            onClick={onToggleVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <Button
          onClick={onSave}
          disabled={!value}
          className={`${
            isSaved
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500'
          } text-white border-0 min-w-[100px]`}
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              {tCommon('save')}d
            </>
          ) : (
            tCommon('save')
          )}
        </Button>
      </div>
      {isConfigured && (
        <Badge variant="outline" className="border-green-500/30 text-green-400">
          <Check className="w-3 h-3 mr-1" />
          {tPage('configured')}
        </Badge>
      )}
    </motion.div>
  );
}
