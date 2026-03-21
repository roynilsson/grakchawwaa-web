'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface SidebarProps {
  isOfficer: boolean;
  isOpen: boolean;
  onClose: () => void;
}

interface NavSection {
  title: string;
  basePath: string;
  items: { label: string; href: string }[];
  officerOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    title: 'Player',
    basePath: '/player',
    items: [
      { label: 'Dashboard', href: '/player' },
      { label: 'My Roster', href: '/player/roster' },
      { label: 'My Warnings', href: '/player/warnings' },
      { label: 'My Violations', href: '/player/violations' },
      { label: 'My Leaves', href: '/player/leaves' },
      { label: 'Settings', href: '/player/settings' },
    ],
  },
  {
    title: 'Guild',
    basePath: '/guild',
    items: [
      { label: 'Members', href: '/guild/members' },
      { label: 'Squads', href: '/guild/squads' },
      { label: 'Fleets', href: '/guild/fleets' },
      { label: 'Raids', href: '/guild/raids' },
    ],
  },
  {
    title: 'Officer',
    basePath: '/officer',
    officerOnly: true,
    items: [
      { label: 'Warnings', href: '/officer/warnings' },
      { label: 'Warning Summary', href: '/officer/warnings/summary' },
      { label: 'Violations', href: '/officer/violations' },
      { label: 'Leaves', href: '/officer/leaves' },
      { label: 'Automations', href: '/officer/automations' },
      { label: 'Raid Config', href: '/officer/raid-config' },
      { label: 'Warning Types', href: '/officer/warning-types' },
    ],
  },
  {
    title: 'Game Data',
    basePath: '/game-data',
    items: [
      { label: 'Characters', href: '/game-data/characters' },
      { label: 'Ships', href: '/game-data/ships' },
      { label: 'Journey Guides', href: '/game-data/journey-guides' },
    ],
  },
];

export function Sidebar({ isOfficer, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const getInitialExpandedSections = () => {
    const expanded: Record<string, boolean> = {};
    navSections.forEach((section) => {
      expanded[section.basePath] = pathname.startsWith(section.basePath);
    });
    return expanded;
  };

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(getInitialExpandedSections);

  useEffect(() => {
    setExpandedSections(getInitialExpandedSections());
  }, [pathname]);

  const toggleSection = (basePath: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [basePath]: !prev[basePath],
    }));
  };

  const isActive = (path: string) => pathname === path;

  const linkClasses = (path: string) =>
    `block px-4 py-1.5 text-sm rounded transition-colors ${
      isActive(path)
        ? 'bg-indigo-600 text-white'
        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
    }`;

  const visibleSections = navSections.filter(
    (section) => !section.officerOnly || isOfficer
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

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
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <nav className="mt-8 lg:mt-0">
            {visibleSections.map((section, index) => (
              <div
                key={section.basePath}
                className={`${index > 0 ? 'border-t border-gray-700 mt-3 pt-3' : ''}`}
              >
                <button
                  onClick={() => toggleSection(section.basePath)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                >
                  <span>{section.title}</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedSections[section.basePath] ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections[section.basePath] && (
                  <div className="space-y-0.5 mt-1 ml-2">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={linkClasses(item.href)}
                        onClick={onClose}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
