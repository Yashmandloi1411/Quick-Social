"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { UserButton } from "@clerk/nextjs";
import { 
  LayoutDashboard, 
  PenSquare, 
  Calendar, 
  Share2, 
  MessageSquareReply, 
  BarChart3, 
  CreditCard, 
  Settings,
  Bell,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Create Post', href: '/dashboard/create', icon: PenSquare },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Connected Accounts', href: '/dashboard/accounts', icon: Share2 },
  { name: 'Auto-Reply', href: '/dashboard/auto-reply', icon: MessageSquareReply },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const getPageTitle = () => {
    const item = navItems.find(item => item.href === pathname);
    return item ? item.name : 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#0a0a0f] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-[#111118] border-r border-zinc-200 dark:border-zinc-800
        transform transition-transform duration-200 ease-in-out
        flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/" className="font-bold text-xl tracking-tight text-purple-600 dark:text-purple-400">
            QuickSocial
          </Link>
          <button className="lg:hidden text-zinc-500" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4 pb-0">
          <Link href="/dashboard/create">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center justify-center gap-2">
              <PenSquare size={18} />
              <span>New Post</span>
            </Button>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md transition-colors
                      ${isActive 
                        ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' 
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/50'}
                    `}
                  >
                    <Icon size={18} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="flex flex-col">
              <span className="text-sm font-medium">My Account</span>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#111118] border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="relative flex items-center justify-center w-9 h-9 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </button>

            <button className="flex items-center justify-center w-9 h-9 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 relative rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-purple-600 rounded-full"></span>
            </button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm hidden sm:flex">
              + Create Post
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
