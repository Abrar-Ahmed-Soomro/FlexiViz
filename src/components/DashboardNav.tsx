import Link from 'next/link';
import { LogOut } from 'lucide-react';

export default async function DashboardNav() {
  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FV</span>
            </div>
            <Link href="/dashboard" className="text-xl font-bold text-slate-900">
              FlexiViz
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
