import { Avatar as RadixAvatar } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Root>,
  React.ComponentPropsWithoutRef<typeof RadixAvatar.Root>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Root
    ref={ref}
    className={cn('relative flex size-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
));
Avatar.displayName = RadixAvatar.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Image>,
  React.ComponentPropsWithoutRef<typeof RadixAvatar.Image>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Image ref={ref} className={cn('aspect-square size-full', className)} {...props} />
));
AvatarImage.displayName = RadixAvatar.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Fallback>,
  React.ComponentPropsWithoutRef<typeof RadixAvatar.Fallback>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Fallback
    ref={ref}
    className={cn(
      'flex size-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = RadixAvatar.Fallback.displayName;

export { Avatar, AvatarFallback, AvatarImage };
