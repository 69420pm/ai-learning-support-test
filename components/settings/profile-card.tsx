import { Mail, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitials } from '@/lib/utils';

export type ProfileCardProps = {
  user: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
};

export function ProfileCard({ user }: ProfileCardProps) {
  const displayName = user.fullName || user.email;
  const initials = getInitials(user.fullName, user.email);

  return (
    <Card data-testid="profile-card" className="border-border shadow-xs">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl font-semibold tracking-tight">Profile</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Your personal account and learner details.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-normal">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Learner</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="size-16 border border-border">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-lg font-semibold bg-muted text-foreground">
              {initials || <UserIcon className="size-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold text-lg leading-tight" data-testid="profile-name">
              {displayName}
            </h4>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-3.5" />
              <span data-testid="profile-email">{user.email}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60">
          <div className="flex flex-col gap-1 rounded-lg border border-border/50 bg-muted/20 p-3.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Display Name
            </p>
            <p className="text-sm font-medium text-foreground">{displayName}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-border/50 bg-muted/20 p-3.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Email Address
            </p>
            <p className="text-sm font-medium text-foreground">{user.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
