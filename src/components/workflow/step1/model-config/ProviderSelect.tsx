'use client';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProviderSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isFreeUser?: boolean;
  children: React.ReactNode;
}

export function ProviderSelect({ label, value, onChange, disabled, isFreeUser, children }: ProviderSelectProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {isFreeUser && (
          <Badge variant="outline" className="text-xs">
            Free Plan: KIE AI Only
          </Badge>
        )}
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled || isFreeUser}>
        <SelectTrigger>
          <SelectValue />
          {isFreeUser && (
            <span className="ml-auto text-muted-foreground text-xs mr-2">🔒 Locked</span>
          )}
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
