import { Server, ExternalLink, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ModalEndpoints } from '@/types/project';

interface ModalEndpointConfig {
  id: string;
  name: string;
  placeholder: string;
  docsUrl: string;
}

interface ModalEndpointsSectionProps {
  modalEndpoints: ModalEndpoints;
  endpointConfigs: ModalEndpointConfig[];
  onEndpointChange: (key: keyof ModalEndpoints, value: string) => void;
  onSave: () => void;
  title?: string;
  description?: string;
}

export function ModalEndpointsSection({
  modalEndpoints,
  endpointConfigs,
  onEndpointChange,
  onSave,
  title = 'Modal.com Self-Hosted Endpoints',
  description = 'Configure your Modal.com endpoints for self-hosted models. Deploy models to Modal and enter the endpoint URLs below.',
}: ModalEndpointsSectionProps) {
  const endpointKeyMap: Record<string, keyof ModalEndpoints> = {
    modalLlmEndpoint: 'llmEndpoint',
    modalTtsEndpoint: 'ttsEndpoint',
    modalImageEndpoint: 'imageEndpoint',
    modalImageEditEndpoint: 'imageEditEndpoint',
    modalVideoEndpoint: 'videoEndpoint',
    modalMusicEndpoint: 'musicEndpoint',
    modalVectcutEndpoint: 'vectcutEndpoint',
  };

  return (
    <Card className="glass border-border border-l-4 border-l-cyan-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {endpointConfigs.map((endpoint) => {
            const endpointKey = endpointKeyMap[endpoint.id];

            return (
              <div key={endpoint.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">{endpoint.name}</label>
                  <a
                    href={endpoint.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    Docs <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Input
                  type="url"
                  placeholder={endpoint.placeholder}
                  value={modalEndpoints[endpointKey] || ''}
                  onChange={(e) => onEndpointChange(endpointKey, e.target.value)}
                  className="bg-muted/50 border-border"
                />
              </div>
            );
          })}
        </div>
        <Button onClick={onSave} className="w-full bg-cyan-600 hover:bg-cyan-700">
          <Save className="w-4 h-4 mr-2" />
          Save Modal Endpoints
        </Button>
      </CardContent>
    </Card>
  );
}
