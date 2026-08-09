import { LoginForm } from '@/components/auth/login-form';

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo, message } = await searchParams;

  let displayMessage: string | undefined;
  if (message === 'password-updated') {
    displayMessage =
      'Your password has been successfully updated. Please sign in with your new password.';
  } else if (message) {
    displayMessage = message;
  }

  return <LoginForm redirectTo={redirectTo} initialMessage={displayMessage} />;
}
