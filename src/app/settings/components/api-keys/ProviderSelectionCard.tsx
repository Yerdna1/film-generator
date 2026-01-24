import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ProviderOption {
  id: string;
  name: string;
}

type ColorScheme =
  | 'emerald'
  | 'violet'
  | 'blue'
  | 'orange'
  | 'pink'
  | 'cyan'
  | 'red'
  | 'yellow'
  | 'green';

const colorClassMap: Record<
  ColorScheme,
  { border: string; text: string; bg: string; bgSubtle: string; iconText: string }
> = {
  emerald: {
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500',
    bgSubtle: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
  },
  violet: {
    border: 'border-violet-500',
    text: 'text-violet-400',
    bg: 'bg-violet-500',
    bgSubtle: 'bg-violet-500/10',
    iconText: 'text-violet-400',
  },
  blue: {
    border: 'border-blue-500',
    text: 'text-blue-400',
    bg: 'bg-blue-500',
    bgSubtle: 'bg-blue-500/10',
    iconText: 'text-blue-400',
  },
  orange: {
    border: 'border-orange-500',
    text: 'text-orange-400',
    bg: 'bg-orange-500',
    bgSubtle: 'bg-orange-500/10',
    iconText: 'text-orange-400',
  },
  pink: {
    border: 'border-pink-500',
    text: 'text-pink-400',
    bg: 'bg-pink-500',
    bgSubtle: 'bg-pink-500/10',
    iconText: 'text-pink-400',
  },
  cyan: {
    border: 'border-cyan-500',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500',
    bgSubtle: 'bg-cyan-500/10',
    iconText: 'text-cyan-400',
  },
  red: {
    border: 'border-red-500',
    text: 'text-red-400',
    bg: 'bg-red-500',
    bgSubtle: 'bg-red-500/10',
    iconText: 'text-red-400',
  },
  yellow: {
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    bg: 'bg-yellow-500',
    bgSubtle: 'bg-yellow-500/10',
    iconText: 'text-yellow-400',
  },
  green: {
    border: 'border-green-500',
    text: 'text-green-400',
    bg: 'bg-green-500',
    bgSubtle: 'bg-green-500/10',
    iconText: 'text-green-400',
  },
};

interface ProviderSelectionCardProps<T extends string = string> {
  title: string;
  icon: ReactNode;
  colorScheme: ColorScheme;
  selectedProvider: T;
  options: ProviderOption[];
  onProviderChange: (provider: T) => void;
  children?: ReactNode;
}

export function ProviderSelectionCard<T extends string = string>({
  title,
  icon,
  colorScheme,
  selectedProvider,
  options,
  onProviderChange,
  children,
}: ProviderSelectionCardProps<T>) {
  const colors = colorClassMap[colorScheme];

  return (
    <Card className={`glass border-border border-l-4 ${colors.border}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map((option) => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onProviderChange(option.id as T)}
            className={`relative p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
              selectedProvider === option.id
                ? `${colors.border} ${colors.bgSubtle}`
                : 'border-border hover:border-border bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground text-sm">{option.name}</span>
                {selectedProvider === option.id && <Check className={`w-4 h-4 ${colors.iconText}`} />}
              </div>
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  selectedProvider === option.id
                    ? `${colors.border} ${colors.bg}`
                    : 'border-muted-foreground/30'
                }`}
              />
            </div>
          </motion.div>
        ))}
        {children}
      </CardContent>
    </Card>
  );
}
