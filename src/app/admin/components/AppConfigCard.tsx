import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppConfig } from '../types';

interface AppConfigCardProps {
  config: AppConfig | null;
  onEdit: () => void;
  t: (key: string) => string;
}

export const AppConfigCard = ({ config, onEdit, t }: AppConfigCardProps) => {
  return (
    <div className="glass-strong rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Settings className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('appConfiguration')}</h2>
            <p className="text-sm text-muted-foreground">{t('globalSettings')}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-4 bg-background/50 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('startingCredits')}</p>
              <p className="text-2xl font-bold">{config?.startingCredits ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('creditsForNewUsers')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
            >
              {t('edit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
