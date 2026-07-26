import React from 'react';
import { useApp, ActiveTab } from '../../context/AppContext';
import {
  LayoutDashboard,
  ScanLine,
  Bot,
  LineChart,
  CalendarCheck,
  MapPin,
  Pill,
  User,
  Settings,
  Plus
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'scanner', label: 'Scan', icon: <ScanLine className="w-5 h-5" /> },
    { id: 'ai', label: 'AI Doctor', icon: <Bot className="w-5 h-5 text-amber-400" /> },
    { id: 'records', label: 'Vitals', icon: <LineChart className="w-5 h-5" /> },
    { id: 'appointments', label: 'Doctors', icon: <CalendarCheck className="w-5 h-5" /> },
    { id: 'maps', label: 'Locator', icon: <MapPin className="w-5 h-5" /> },
    { id: 'reminders', label: 'Pills', icon: <Pill className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0D]/95 border-t border-white/10 backdrop-blur-2xl px-2 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-around overflow-x-auto no-scrollbar py-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all duration-300 relative ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-md shadow-emerald-500/10 scale-105'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                {item.icon}
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </div>
              <span className="text-[10px] font-semibold mt-1 truncate max-w-[60px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
