'use client';

import { LucideIcon, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useApiKeys } from '@/contexts/ApiKeysContext';
import type { OperationType } from '@/lib/services/user-permissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ActionButton {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  visible?: boolean;
  badge?: string | number;
}

export interface DropdownOption {
  label: string;
  value: string;
  onClick: () => void;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface ActionDropdown {
  label: string;
  icon?: LucideIcon;
  options: DropdownOption[];
  disabled?: boolean;
  visible?: boolean;
}

export interface ActionSelect {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  visible?: boolean;
}

interface StepActionBarProps {
  title: string;
  icon?: LucideIcon;
  subtitle?: string;
  actions?: ActionButton[];
  dropdowns?: ActionDropdown[];
  selects?: ActionSelect[];
  className?: string;
  // API Key button props
  operation?: OperationType;
  showApiKeyButton?: boolean;
  // Custom right content
  rightContent?: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white border-0 font-medium animate-pulse-border-red',
  secondary: 'bg-violet-500 hover:bg-violet-600 text-white border-0',
  outline: 'border-violet-500/30 hover:bg-violet-500/10',
  destructive: 'bg-red-600 hover:bg-red-500 text-white border-0',
  ghost: 'hover:bg-white/5',
};

export function StepActionBar({
  title,
  icon: Icon,
  subtitle,
  actions = [],
  dropdowns = [],
  selects = [],
  className,
  operation,
  showApiKeyButton = false,
  rightContent,
}: StepActionBarProps) {
  const { showApiKeyModal, apiKeys } = useApiKeys();

  // Check if any API key is configured
  const hasAnyApiKey = apiKeys && (
    apiKeys.geminiApiKey ||
    apiKeys.grokApiKey ||
    apiKeys.kieApiKey ||
    apiKeys.elevenLabsApiKey ||
    apiKeys.claudeApiKey ||
    apiKeys.openaiApiKey ||
    apiKeys.nanoBananaApiKey ||
    apiKeys.sunoApiKey ||
    apiKeys.openRouterApiKey ||
    apiKeys.piapiApiKey ||
    apiKeys.resendApiKey
  );

  const handleApiKeyClick = () => {
    if (operation) {
      showApiKeyModal({ operation, missingKeys: [] });
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 pb-4 border-b border-white/10",
      className
    )}>
      {/* Left: Title and subtitle */}
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-violet-500" />}
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Custom content */}
        {rightContent}

        {/* Selects */}
        {selects
          .filter(select => select.visible !== false)
          .map((select, index) => (
            <Select
              key={`select-${index}`}
              value={select.value}
              onValueChange={select.onChange}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs border-violet-500/30">
                <SelectValue placeholder={select.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {select.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

        {/* Dropdowns */}
        {dropdowns
          .filter(dropdown => dropdown.visible !== false)
          .map((dropdown, index) => {
            const DropdownIcon = dropdown.icon;
            return (
              <DropdownMenu key={`dropdown-${index}`}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={dropdown.disabled}
                    className="border-violet-500/30 hover:bg-violet-500/10"
                  >
                    {DropdownIcon && <DropdownIcon className="w-4 h-4 mr-1" />}
                    {dropdown.label}
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-strong border-white/10">
                  {dropdown.options.map((option, optionIndex) => (
                    <DropdownMenuItem
                      key={optionIndex}
                      onClick={option.onClick}
                      className="cursor-pointer"
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}

        {/* API Key button */}
        {showApiKeyButton && operation && (
          <Button
            onClick={handleApiKeyClick}
            variant="outline"
            size="sm"
            className={cn(
              "bg-yellow-500 hover:bg-yellow-600 text-black dark:bg-yellow-400 dark:hover:bg-yellow-500 dark:text-black border-0 transition-all duration-200 font-medium",
              !hasAnyApiKey && "animate-pulse-border"
            )}
            title="Configure API Keys & Providers"
          >
            <Settings className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Configure your own API keys</span>
            <span className="sm:hidden">API Keys</span>
          </Button>
        )}

        {/* Action buttons */}
        {actions
          .filter(action => action.visible !== false)
          .map((action, index) => {
            const ButtonIcon = action.icon;
            const variant = action.variant || 'outline';
            return (
              <Button
                key={`action-${index}`}
                onClick={action.onClick}
                disabled={action.disabled}
                size="sm"
                className={cn(
                  "transition-all duration-200",
                  buttonVariants[variant]
                )}
              >
                {ButtonIcon && <ButtonIcon className="w-4 h-4 mr-1" />}
                {action.label}
                {action.badge && (
                  <span className="ml-2 text-xs opacity-80">
                    {action.badge}
                  </span>
                )}
              </Button>
            );
          })}
      </div>
    </div>
  );
}
