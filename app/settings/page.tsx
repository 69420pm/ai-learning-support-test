import { redirect } from 'next/navigation';
import { AppearanceCard } from '@/components/settings/appearance-card';
import { ProfileCard } from '@/components/settings/profile-card';
import { getCurrentUser } from '@/lib/auth/session';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirectTo=/settings');
  }

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl flex flex-col gap-8">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            data-testid="settings-heading"
          >
            Settings
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your account profile and appearance preferences.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <ProfileCard user={user} />
          <AppearanceCard />
        </div>
      </div>
    </div>
  );
}
