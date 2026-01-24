'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOfficer: boolean;
}

export function Sidebar({ isOfficer }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const linkClasses = (path: string) =>
    `block px-4 py-2 rounded transition-colors ${
      isActive(path)
        ? 'bg-indigo-600 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen p-4">
      <nav className="space-y-6">
        <div>
          <Link href="/dashboard" className={linkClasses('/dashboard')}>
            Dashboard
          </Link>
        </div>

        <div>
          <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            My Account
          </h3>
          <div className="space-y-1">
            <Link href="/dashboard/warnings" className={linkClasses('/dashboard/warnings')}>
              Warnings
            </Link>
            <Link href="/dashboard/violations" className={linkClasses('/dashboard/violations')}>
              Violations
            </Link>
          </div>
        </div>

        {isOfficer && (
          <div>
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Guild
            </h3>
            <div className="space-y-1">
              <Link href="/dashboard/guild/warnings" className={linkClasses('/dashboard/guild/warnings')}>
                Warnings
              </Link>
              <Link href="/dashboard/guild/violations" className={linkClasses('/dashboard/guild/violations')}>
                Violations
              </Link>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
