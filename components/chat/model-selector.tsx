'use client';

import { Bot, Check, ChevronDown, Cpu, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEFAULT_MODEL_ID, type ModelOption, SUPPORTED_MODELS } from '@/lib/ai/providers';
import { cn } from '@/lib/utils';

export type ModelSelectorProps = {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  className?: string;
};

function getProviderIcon(provider: 'google' | 'openai') {
  switch (provider) {
    case 'google':
      return <Sparkles className="size-3.5 text-amber-500 dark:text-amber-400" />;
    case 'openai':
      return <Cpu className="size-3.5 text-emerald-500 dark:text-emerald-400" />;
    default:
      return <Bot className="size-3.5 text-primary" />;
  }
}

export function ModelSelector({ selectedModelId, onModelChange, className }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const activeModel = useMemo(() => {
    return (
      SUPPORTED_MODELS.find((m) => m.id === selectedModelId) ??
      SUPPORTED_MODELS.find((m) => m.id === DEFAULT_MODEL_ID) ??
      SUPPORTED_MODELS[0]
    );
  }, [selectedModelId]);

  const googleModels = useMemo(() => SUPPORTED_MODELS.filter((m) => m.provider === 'google'), []);

  const openaiModels = useMemo(() => SUPPORTED_MODELS.filter((m) => m.provider === 'openai'), []);

  const renderModelItem = (model: ModelOption) => {
    const isSelected = selectedModelId === model.id;

    return (
      <DropdownMenuItem
        key={model.id}
        onSelect={() => {
          onModelChange(model.id);
          setOpen(false);
        }}
        className="flex cursor-pointer items-start justify-between gap-3 p-2.5 rounded-md focus:bg-accent focus:text-accent-foreground"
        data-testid={`model-selector-item-${model.id}`}
      >
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {getProviderIcon(model.provider)}
            <span className="font-medium text-xs text-foreground">{model.name}</span>
            {model.badge && (
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[10px] font-normal leading-none"
              >
                {model.badge}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground leading-normal">
            {model.description}
          </span>
        </div>

        {isSelected && <Check className="size-4 shrink-0 text-primary self-center" />}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 rounded-lg border-border/60 bg-muted/40 px-2.5 font-normal text-foreground text-xs shadow-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-accent',
            className,
          )}
          data-testid="model-selector-trigger"
        >
          {getProviderIcon(activeModel.provider)}
          <span className="font-medium">{activeModel.name}</span>
          <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[300px] p-1.5">
        <DropdownMenuLabel className="px-2.5 py-1 font-semibold text-[10px] text-muted-foreground tracking-wider uppercase">
          Google Gemini
        </DropdownMenuLabel>
        {googleModels.map(renderModelItem)}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuLabel className="px-2.5 py-1 font-semibold text-[10px] text-muted-foreground tracking-wider uppercase">
          OpenAI
        </DropdownMenuLabel>
        {openaiModels.map(renderModelItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
