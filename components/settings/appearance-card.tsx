'use client';

import { Check, Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';
import { type Theme, updateThemePreference } from '@/app/actions/theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ThemePreviewOption = {
  value: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
};

export const THEME_PREVIEW_OPTIONS: ThemePreviewOption[] = [
  {
    value: 'system',
    label: 'System',
    description: 'Sync with system preferences',
    icon: Laptop,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Clean and bright theme',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Dark mode for low light',
    icon: Moon,
  },
];

function ThemePreviewMockup({ theme }: { theme: Theme }) {
  if (theme === 'system') {
    return (
      <div className="w-full h-28 rounded-lg mb-3.5 p-2.5 flex flex-col justify-between border overflow-hidden transition-colors bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-900 border-zinc-300 dark:border-zinc-700">
        <div className="flex h-full w-full rounded overflow-hidden border border-zinc-200/50 shadow-2xs">
          {/* Left Half: Light Preview */}
          <div className="w-1/2 bg-white p-1.5 flex flex-col justify-between border-r border-zinc-200">
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-8 rounded bg-zinc-300" />
              <div className="h-1 w-12 rounded bg-zinc-200" />
            </div>
            <div className="h-4 rounded bg-zinc-100 border border-zinc-200" />
          </div>
          {/* Right Half: Dark Preview */}
          <div className="w-1/2 bg-zinc-900 p-1.5 flex flex-col justify-between">
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-8 rounded bg-zinc-700" />
              <div className="h-1 w-12 rounded bg-zinc-800" />
            </div>
            <div className="h-4 rounded bg-zinc-800 border border-zinc-700" />
          </div>
        </div>
      </div>
    );
  }

  if (theme === 'light') {
    return (
      <div className="w-full h-28 rounded-lg mb-3.5 p-2.5 flex flex-col justify-between border overflow-hidden transition-colors bg-zinc-50 border-zinc-200 text-zinc-900">
        <div className="flex flex-col justify-between h-full w-full bg-white rounded p-2 border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
            <div className="h-2 w-10 rounded bg-zinc-800" />
            <div className="size-2 rounded-full bg-zinc-300" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 w-full rounded bg-zinc-200" />
            <div className="h-1.5 w-3/4 rounded bg-zinc-100" />
          </div>
          <div className="h-4 w-full rounded bg-zinc-100 border border-zinc-200/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-28 rounded-lg mb-3.5 p-2.5 flex flex-col justify-between border overflow-hidden transition-colors bg-zinc-950 border-zinc-800 text-zinc-100">
      <div className="flex flex-col justify-between h-full w-full bg-zinc-900 rounded p-2 border border-zinc-800 shadow-2xs">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
          <div className="h-2 w-10 rounded bg-zinc-200" />
          <div className="size-2 rounded-full bg-zinc-700" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full rounded bg-zinc-700" />
          <div className="h-1.5 w-3/4 rounded bg-zinc-800" />
        </div>
        <div className="h-4 w-full rounded bg-zinc-800 border border-zinc-700/60" />
      </div>
    </div>
  );
}

export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    void updateThemePreference(newTheme).catch(() => {
      // Gracefully ignore client network error during optimistic switch
    });
  };

  return (
    <Card data-testid="appearance-card" className="border-border shadow-xs">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight">Appearance</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Customize the visual appearance of the application. Automatically switches between themes.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {THEME_PREVIEW_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = mounted && theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                data-testid={`theme-option-${option.value}`}
                onClick={() => handleSelectTheme(option.value)}
                className={cn(
                  'group relative flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                    : 'border-border hover:border-foreground/30 bg-card hover:bg-muted/30',
                )}
              >
                <ThemePreviewMockup theme={option.value} />

                {/* Option Header & Indicator */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-foreground" />
                    <span className="font-medium text-sm text-foreground">{option.label}</span>
                  </div>
                  {isSelected && (
                    <div
                      data-testid={`theme-indicator-${option.value}`}
                      className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs"
                    >
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Option Subtitle */}
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
