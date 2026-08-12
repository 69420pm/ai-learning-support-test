'use client';

import { Check, ChevronDown, Sparkles } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SUPPORTED_MODELS, type SupportedModel } from '@/lib/ai/providers';
import { cn } from '@/lib/utils';

export type ModelSelectorProps = {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  className?: string;
};

export function ModelSelector({
  selectedModelId,
  onModelChange,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedModel =
    SUPPORTED_MODELS.find((m) => m.id === selectedModelId) || SUPPORTED_MODELS[1];

  const googleModels = SUPPORTED_MODELS.filter((m) => m.provider === 'google');
  const openAiModels = SUPPORTED_MODELS.filter((m) => m.provider === 'openai');

  const handleSelect = (modelId: string) => {
    onModelChange(modelId);
    setOpen(false);
  };

  const renderModelGroup = (title: string, models: SupportedModel[]) => (
    <div className="flex flex-col gap-1">
      <div className="px-2 py-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
        {title}
      </div>
      {models.map((model) => {
        const isSelected = model.id === selectedModelId;
        return (
          <button
            key={model.id}
            type="button"
            onClick={() => handleSelect(model.id)}
            data-testid={`model-option-${model.id}`}
            className={cn(
              'flex items-center justify-between w-full rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              isSelected && 'bg-accent/60 font-medium',
            )}
          >
            <div className="flex flex-col gap-0.5 min-w-0 pr-2">
              <span className="font-medium text-foreground text-xs">{model.name}</span>
              <span className="text-[11px] text-muted-foreground line-clamp-1">
                {model.description}
              </span>
            </div>
            {isSelected && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="model-selector-trigger"
          className={cn(
            'h-8 gap-1.5 rounded-full border-border/60 bg-muted/50 px-3 font-medium text-xs text-foreground hover:bg-muted focus-visible:ring-1',
            className,
          )}
        >
          <Sparkles className="size-3.5 text-primary" />
          <span>{selectedModel.name}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-2 flex flex-col gap-2"
        data-testid="model-selector-popover"
      >
        {renderModelGroup('Google Gemini', googleModels)}
        <div className="h-px bg-border/50 my-0.5" />
        {renderModelGroup('OpenAI GPT', openAiModels)}
      </PopoverContent>
    </Popover>
  );
}
