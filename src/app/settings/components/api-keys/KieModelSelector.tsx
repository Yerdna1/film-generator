import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatKiePrice } from '@/lib/constants/kie-models';

export interface KieModel {
  modelId: string;
  name: string;
  credits: number;
  description?: string;
  modality?: string[];
  qualityOptions?: string[];
  quality?: string;
  length?: string;
}

interface KieModelSelectorProps {
  models: KieModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  isLoading: boolean;
  icon: ReactNode;
  label: string;
  placeholder: string;
  showMetadata?: boolean;
}

export function KieModelSelector({
  models,
  selectedModel,
  onModelChange,
  isLoading,
  icon,
  label,
  placeholder,
  showMetadata = true,
}: KieModelSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.2 }}
      className="mt-3 p-3 rounded-lg bg-muted/50 border border-border"
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      <Select value={selectedModel} onValueChange={onModelChange} disabled={isLoading || models.length === 0}>
        <SelectTrigger className="w-full bg-muted/50 border-border">
          <SelectValue placeholder={isLoading ? 'Loading models...' : placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {models.map((model) => (
            <SelectItem key={model.modelId} value={model.modelId}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start flex-col">
                  <span className="font-medium">{model.name}</span>
                  {showMetadata && (
                    <>
                      {model.description && (
                        <span className="text-[10px] text-muted-foreground mt-1">{model.description}</span>
                      )}
                      {model.modality && model.modality.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">{model.modality.join(', ')}</span>
                        </div>
                      )}
                      {model.qualityOptions && model.qualityOptions.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {model.qualityOptions[0]}
                          </Badge>
                        </div>
                      )}
                      {model.quality && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {model.quality}
                          </Badge>
                        </div>
                      )}
                      {model.length && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {model.length}
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <span className="text-xs text-muted-foreground ml-2">{formatKiePrice(model.credits)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  );
}
