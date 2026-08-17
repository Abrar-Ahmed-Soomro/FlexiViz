import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';
import DashboardNav from '@/components/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    userId = decoded.userId;
  } catch {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav userId={userId} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
