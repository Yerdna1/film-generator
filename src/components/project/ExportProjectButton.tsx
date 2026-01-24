'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast';

interface ExportProjectButtonProps {
  projectId: string;
  projectName: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportProjectButton({
  projectId,
  projectName,
  variant = 'outline',
  size = 'sm',
}: ExportProjectButtonProps) {
  const t = useTranslations();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportMetadata = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/export`);

      if (!response.ok) {
        throw new Error('Failed to export project');
      }

      const data = await response.json();

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_metadata.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('project.exportSuccess'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('project.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWithAssets = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/export`);

      if (!response.ok) {
        throw new Error('Failed to export project');
      }

      const data = await response.json();

      // Create a list of assets to download
      const assets: Array<{ url: string; filename: string }> = [];

      // Character images
      data.characters?.forEach((char: { name: string; imageUrl?: string }) => {
        if (char.imageUrl) {
          const ext = char.imageUrl.split('.').pop()?.split('?')[0] || 'jpeg';
          assets.push({
            url: char.imageUrl,
            filename: `${char.name.toLowerCase().replace(/\s+/g, '_')}.${ext}`,
          });
        }
      });

      // Scene images and videos
      data.scenes?.forEach((scene: { number: number; imageUrl?: string; videoUrl?: string }) => {
        if (scene.imageUrl) {
          const ext = scene.imageUrl.split('.').pop()?.split('?')[0] || 'jpeg';
          assets.push({
            url: scene.imageUrl,
            filename: `scene${scene.number}.${ext}`,
          });
        }
        if (scene.videoUrl) {
          const ext = scene.videoUrl.split('.').pop()?.split('?')[0] || 'mp4';
          assets.push({
            url: scene.videoUrl,
            filename: `video${scene.number}.${ext}`,
          });
        }
      });

      // Download metadata
      const metadataBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const metadataUrl = URL.createObjectURL(metadataBlob);
      const a = document.createElement('a');
      a.href = metadataUrl;
      a.download = 'metadata.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(metadataUrl);

      // Show info about assets
      if (assets.length > 0) {
        toast.info(
          `${t('project.downloadingAssets')} (${assets.length} ${t('project.files')})`,
          { duration: 5000 }
        );

        // Download assets one by one with delay to avoid browser blocking
        for (let i = 0; i < assets.length; i++) {
          const asset = assets[i];
          setTimeout(async () => {
            try {
              const assetResponse = await fetch(asset.url);
              const assetBlob = await assetResponse.blob();
              const assetUrl = URL.createObjectURL(assetBlob);
              const link = document.createElement('a');
              link.href = assetUrl;
              link.download = asset.filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(assetUrl);
            } catch (e) {
              console.error(`Failed to download ${asset.filename}:`, e);
            }
          }, i * 500); // 500ms delay between downloads
        }
      }

      toast.success(t('project.exportSuccess'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('project.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {size !== 'icon' && <span className="ml-2">{t('project.export')}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong border-white/10">
        <DropdownMenuItem onClick={handleExportMetadata}>
          {t('project.exportMetadataOnly')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportWithAssets}>
          {t('project.exportWithAssets')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
