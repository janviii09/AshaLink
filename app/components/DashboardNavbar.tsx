'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, HeartPulse, Smile, BellDot } from 'lucide-react';

const navItems = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: Home // Represents safety and the central hub
  },
  {
    label: 'My Community',
    href: '/dashboard/community',
    icon: Users // Focuses on friendship and belonging
  },
  {
    label: 'Get Help',
    href: '/dashboard/sos',
    icon: HeartPulse // "Get Help" is more comforting and clear than "SOS"
  },
  {
    label: 'My Companion',
    href: '/dashboard/avatar',
    icon: Smile // Refers to the AI as a friend rather than a "technical" avatar
  },
];

export default function DashboardNavbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-bold text-gray-800">ApkaSaathi</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>

          <Link
            href="/"
            className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </nav>
  );
}
