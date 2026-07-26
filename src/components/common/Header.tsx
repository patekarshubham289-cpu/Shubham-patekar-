import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Activity, ShieldAlert, User, Bell, Sun, Moon, Sparkles, HeartPulse } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, settings, updateSettings, openSosModal, setIsMedicalIdOpen, healthScore, activeTab } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#0D0D0D]/90 border-b border-white/10 px-4 py-3 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-900 text-white shadow-lg shadow-emerald-500/20">
            <HeartPulse className="w-6 h-6 animate-pulse text-white" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-[#0D0D0D] flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-amber-900 rounded-full"></span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-emerald-400 bg-clip-text text-transparent">
                HealthCare<span className="text-emerald-400">+</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">
                LUXURY AI
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium capitalize">
              {activeTab.replace('-', ' ')} • Health Score <span className="text-emerald-400 font-bold">{healthScore}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Medical ID Button */}
          <button
            onClick={() => setIsMedicalIdOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-white/10 transition"
            title="Emergency Medical ID"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Medical ID</span>
          </button>

          {/* SOS Emergency Trigger */}
          <button
            onClick={openSosModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600/90 hover:bg-red-500 text-white shadow-md shadow-red-600/30 border border-red-500/50 animate-bounce"
          >
            <ShieldAlert className="w-4 h-4 text-white" />
            <span className="font-extrabold tracking-wide">SOS</span>
          </button>

          {/* Notifications Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl bg-neutral-900 text-neutral-300 hover:text-white border border-white/10 transition"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#181818] border border-white/10 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Notifications
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    2 New
                  </span>
                </div>
                <div className="space-y-3 mt-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/5">
                    <p className="font-semibold text-neutral-200">Medicine Reminder</p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">Amoxicillin 500mg dose scheduled after dinner.</p>
                    <span className="text-[9px] text-neutral-500 mt-1 block">10 minutes ago</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/5">
                    <p className="font-semibold text-neutral-200">Doctor Appointment</p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">Dr. Elena Rostova confirmed your video consult for Friday.</p>
                    <span className="text-[9px] text-neutral-500 mt-1 block">1 hour ago</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-neutral-900 text-neutral-300 hover:text-white border border-white/10 transition"
            title="Toggle Dark/Light Mode"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* User Profile Avatar */}
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/40 shadow-sm"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0D0D0D]"></span>
          </div>

        </div>

      </div>
    </header>
  );
};
