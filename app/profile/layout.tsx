import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  // Profile page uses the chat layout by being inside app/chat/
  return <>{children}</>;
}
