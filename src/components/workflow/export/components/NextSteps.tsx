'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ExternalLink, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NextStepsProps {
  overallProgress: number;
  onExportMarkdown: () => void;
}

export function NextSteps({ overallProgress, onExportMarkdown }: NextStepsProps) {
  const t = useTranslations();

  return (
    <>
      {/* Next Steps */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-green-400" />
          {t('steps.export.nextSteps')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="glass rounded-lg p-4">
            <h4 className="font-medium mb-2 text-cyan-400">CapCut</h4>
            <p className="text-muted-foreground">{t('steps.export.capcutInstructions')}</p>
          </div>
          <div className="glass rounded-lg p-4">
            <h4 className="font-medium mb-2 text-purple-400">DaVinci Resolve</h4>
            <p className="text-muted-foreground">{t('steps.export.davinciInstructions')}</p>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {overallProgress >= 80 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 border-2 border-green-500/30 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">{t('steps.export.congratulations')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('steps.export.congratulationsDescription')}
          </p>
          <Button
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0"
            onClick={onExportMarkdown}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('steps.export.downloadAllPrompts')}
          </Button>
        </motion.div>
      )}

    </>
  );
}
