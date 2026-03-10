"use client";
import { LayoutDashboard, Heart, Shield, Settings, ChevronRight } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-20 hover:w-64 group transition-all duration-300 bg-white border-r border-blue-50 fixed h-full z-50 flex flex-col items-center py-8 shadow-sm">
      <div className="flex-1 w-full px-4 space-y-8">
        <SidebarIcon icon={<LayoutDashboard size={24} />} label="Dashboard" />
        <SidebarIcon icon={<Heart size={24} />} label="Health Stats" />
        <SidebarIcon icon={<Shield size={24} />} label="Security" />
        <SidebarIcon icon={<Settings size={24} />} label="Settings" />
      </div>
      <div className="p-4 bg-blue-50 rounded-2xl group-hover:px-8 transition-all">
        <ChevronRight className="text-blue-600 group-hover:rotate-180 transition-transform" />
      </div>
    </aside>
  );
}

function SidebarIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-4 cursor-pointer text-slate-400 hover:text-blue-600 transition-all group/item">
      <div className="p-3 rounded-xl group-hover/item:bg-blue-50 transition-colors">{icon}</div>
      <span className="font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{label}</span>
    </div>
  );
}