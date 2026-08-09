import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/dashboard');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-bold text-3xl tracking-tight" data-testid="dashboard-heading">
        Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground" data-testid="dashboard-welcome">
        Welcome back, {user.user_metadata?.full_name || user.email}!
      </p>
    </div>
  );
}
