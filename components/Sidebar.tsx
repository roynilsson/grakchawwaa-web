'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOfficer: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOfficer, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const linkClasses = (path: string) =>
    `block px-4 py-2 rounded transition-colors ${
      isActive(path)
        ? 'bg-indigo-600 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-gray-800 border-r border-gray-700
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}
      >
        <div className="p-4">
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <nav className="space-y-6">
            <div>
              <Link href="/dashboard" className={linkClasses('/dashboard')} onClick={onClose}>
                Dashboard
              </Link>
            </div>

            <div>
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Guild
              </h3>
              <div className="space-y-1">
                <Link href="/dashboard/guild/members" className={linkClasses('/dashboard/guild/members')} onClick={onClose}>
                  Members
                </Link>
                <Link href="/dashboard/raids" className={linkClasses('/dashboard/raids')} onClick={onClose}>
                  Raids
                </Link>
              </div>
            </div>

            <div>
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                My Account
              </h3>
              <div className="space-y-1">
                <Link href="/dashboard/warnings" className={linkClasses('/dashboard/warnings')} onClick={onClose}>
                  Warnings
                </Link>
                <Link href="/dashboard/violations" className={linkClasses('/dashboard/violations')} onClick={onClose}>
                  Ticket Violations
                </Link>
                <Link href="/dashboard/settings" className={linkClasses('/dashboard/settings')} onClick={onClose}>
                  Settings
                </Link>
              </div>
            </div>

            {isOfficer && (
              <div>
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Officer Tools
                </h3>
                <div className="space-y-1">
                  <Link href="/dashboard/guild/warnings" className={linkClasses('/dashboard/guild/warnings')} onClick={onClose}>
                    Warnings
                  </Link>
                  <Link href="/dashboard/guild/violations" className={linkClasses('/dashboard/guild/violations')} onClick={onClose}>
                    Ticket Violations
                  </Link>
                  <Link href="/dashboard/guild/warning-types" className={linkClasses('/dashboard/guild/warning-types')} onClick={onClose}>
                    Warning Types
                  </Link>
                  <Link href="/dashboard/guild/raid-config" className={linkClasses('/dashboard/guild/raid-config')} onClick={onClose}>
                    Raid Configuration
                  </Link>
                  <Link href="/dashboard/guild/automations" className={linkClasses('/dashboard/guild/automations')} onClick={onClose}>
                    Automations
                  </Link>
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
