'use client';

import { useTranslations } from 'next-intl';
import { Package, FileJson, FileText, ClipboardList, Scissors } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExportOptionsProps {
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  onExportText: () => void;
  onExportCapCut: () => void;
}

export function ExportOptions({
  onExportJSON,
  onExportMarkdown,
  onExportText,
  onExportCapCut,
}: ExportOptionsProps) {
  const t = useTranslations();

  return (
    <Card className="glass border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-green-400" />
          {t('steps.export.exportOptions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* JSON Export */}
          <button
            onClick={onExportJSON}
            className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
          >
            <FileJson className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold mb-1">JSON</h4>
            <p className="text-xs text-muted-foreground">{t('steps.export.jsonDescription')}</p>
          </button>

          {/* Markdown Export */}
          <button
            onClick={onExportMarkdown}
            className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
          >
            <FileText className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold mb-1">Markdown</h4>
            <p className="text-xs text-muted-foreground">{t('steps.export.markdownDescription')}</p>
          </button>

          {/* Text Export */}
          <button
            onClick={onExportText}
            className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
          >
            <ClipboardList className="w-8 h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold mb-1">Text</h4>
            <p className="text-xs text-muted-foreground">{t('steps.export.textDescription')}</p>
          </button>

          {/* CapCut Export */}
          <button
            onClick={onExportCapCut}
            className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-cyan-500/30 group"
          >
            <Scissors className="w-8 h-8 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold mb-1">CapCut</h4>
            <p className="text-xs text-muted-foreground">{t('steps.export.capcutDescription')}</p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
