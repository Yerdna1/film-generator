'use client';

import { useTranslations } from 'next-intl';
import { Package, FileJson, FileText, ClipboardList, Scissors } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExportOptionsProps {
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  onExportText: () => void;
  onExportCapCut: () => void;
  compact?: boolean;
}

export function ExportOptions({
  onExportJSON,
  onExportMarkdown,
  onExportText,
  onExportCapCut,
  compact = false,
}: ExportOptionsProps) {
  const t = useTranslations();

  if (compact) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Export</h4>
        <div className="grid grid-cols-4 gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportJSON}
            className="h-auto py-2 px-2 flex-col gap-1 border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30"
          >
            <FileJson className="w-4 h-4 text-blue-400" />
            <span className="text-[10px]">JSON</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportMarkdown}
            className="h-auto py-2 px-2 flex-col gap-1 border-white/10 hover:bg-green-500/10 hover:border-green-500/30"
          >
            <FileText className="w-4 h-4 text-green-400" />
            <span className="text-[10px]">MD</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportText}
            className="h-auto py-2 px-2 flex-col gap-1 border-white/10 hover:bg-amber-500/10 hover:border-amber-500/30"
          >
            <ClipboardList className="w-4 h-4 text-amber-400" />
            <span className="text-[10px]">Text</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCapCut}
            className="h-auto py-2 px-2 flex-col gap-1 border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30"
          >
            <Scissors className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px]">CapCut</span>
          </Button>
        </div>
      </div>
    );
  }

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
          <button
            onClick={onExportJSON}
            className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
          >
            <FileJson className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold mb-1">JSON</h4>
            <p className="text-xs text-muted-foreground">{t('steps.export.jsonDescription')}</p>
          </button>
          <button
            onClick={onExportMarkdown}
            className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
          >
            <FileText className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold mb-1">Markdown</h4>
            <p className="text-xs text-muted-foreground">{t('steps.export.markdownDescription')}</p>
          </button>
          <button
            onClick={onExportText}
            className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
          >
            <ClipboardList className="w-8 h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold mb-1">Text</h4>
            <p className="text-xs text-muted-foreground">{t('steps.export.textDescription')}</p>
          </button>
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
