'use client';

import { Check, ChevronDown, Cpu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEFAULT_MODEL_ID, SUPPORTED_MODELS } from '@/lib/ai/providers';
import { cn } from '@/lib/utils';

export type ModelSelectorProps = {
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
};

export function ModelSelector({
  selectedModelId = DEFAULT_MODEL_ID,
  onModelChange,
  className,
}: ModelSelectorProps) {
  const currentModel =
    SUPPORTED_MODELS.find((m) => m.id === selectedModelId) || SUPPORTED_MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 text-xs font-medium hover:bg-muted text-foreground transition-colors',
            className,
          )}
          data-testid="model-selector-trigger"
        >
          {currentModel.provider === 'google' ? (
            <Sparkles className="size-3.5 text-primary" />
          ) : (
            <Cpu className="size-3.5 text-primary" />
          )}
          <span>{currentModel.name}</span>
          <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5">
        {SUPPORTED_MODELS.map((model) => {
          const isSelected = model.id === currentModel.id;
          return (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onModelChange?.(model.id)}
              className="flex items-start justify-between p-2.5 cursor-pointer rounded-md focus:bg-accent text-xs"
              data-testid={`model-option-${model.id}`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                  {model.provider === 'google' ? (
                    <Sparkles className="size-3.5 text-primary shrink-0" />
                  ) : (
                    <Cpu className="size-3.5 text-primary shrink-0" />
                  )}
                  <span>{model.name}</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-tight line-clamp-2">
                  {model.description}
                </p>
              </div>
              {isSelected && <Check className="size-4 text-primary shrink-0 ml-2 mt-0.5" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
