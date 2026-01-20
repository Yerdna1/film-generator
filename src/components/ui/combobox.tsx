'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  className,
  disabled = false,
  loading = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between text-left', className)}
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : selectedOption ? (
            <span className="text-sm truncate block">{selectedOption.label}</span>
          ) : (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[800px] p-0"
        align="start"
      >
        <Command className="w-full">
          <CommandInput placeholder="Search models..." className="h-9" />
          {!options.length ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No models found
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto p-2">
              <div className="grid grid-cols-1 gap-1">
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer hover:bg-accent rounded-md px-3 py-2.5 flex items-center gap-2"
                  >
                    <span className="truncate flex-1 text-sm">{option.label}</span>
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </div>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
