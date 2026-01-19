import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CompactSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: Array<{
    value: string;
    label: string;
    badge?: string;
    description?: string;
  }>;
  className?: string;
  placeholder?: string;
  hint?: string;
}

export function CompactSelect({
  label,
  value,
  onChange,
  disabled,
  options,
  className,
  placeholder,
  hint,
}: CompactSelectProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder={placeholder} className="truncate" />
        </SelectTrigger>
        <SelectContent className="max-h-[400px] max-w-[600px]">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="max-w-full">
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-sm">{option.label}</span>
                {option.badge && (
                  <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 h-4 shrink-0">
                    {option.badge}
                  </Badge>
                )}
              </div>
              {option.description && (
                <div className="text-xs text-muted-foreground mt-0.5 break-words">
                  {option.description}
                </div>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}