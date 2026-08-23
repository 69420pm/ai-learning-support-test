'use client';

import { Check, Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';
import { type Theme, updateThemePreference } from '@/app/actions/theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ThemeToggleProps = {
  className?: string;
  align?: 'start' | 'center' | 'end';
};

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const;

export function ThemeToggle({ className, align = 'end' }: ThemeToggleProps) {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    void updateThemePreference(newTheme).catch(() => {
      // Gracefully ignore network or background persistence errors on client
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-9', className)}
          aria-label="Select theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isSelected = mounted && theme === value;

          return (
            <DropdownMenuItem
              key={value}
              onClick={() => handleThemeChange(value)}
              className="flex items-center justify-between"
              data-active={isSelected ? 'true' : 'false'}
            >
              <div className="flex items-center gap-2">
                <Icon className="size-4" />
                <span>{label}</span>
              </div>
              {isSelected && <Check className="ml-auto size-4" data-testid={`check-${value}`} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
