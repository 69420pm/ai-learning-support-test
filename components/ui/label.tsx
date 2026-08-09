import { cva, type VariantProps } from 'class-variance-authority';
import { Label as RadixLabel } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

const Label = React.forwardRef<
  React.ElementRef<typeof RadixLabel.Root>,
  React.ComponentPropsWithoutRef<typeof RadixLabel.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <RadixLabel.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = RadixLabel.Root.displayName;

export { Label };
