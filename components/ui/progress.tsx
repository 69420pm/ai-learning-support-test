import { Progress as RadixProgress } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof RadixProgress.Root>,
  React.ComponentPropsWithoutRef<typeof RadixProgress.Root>
>(({ className, value, ...props }, ref) => (
  <RadixProgress.Root
    ref={ref}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
    {...props}
  >
    <RadixProgress.Indicator
      className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </RadixProgress.Root>
));
Progress.displayName = RadixProgress.Root.displayName;

export { Progress };
