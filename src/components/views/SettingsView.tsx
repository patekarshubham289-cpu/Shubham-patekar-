import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Sun,
  Moon,
  Globe,
  Database,
  LogOut,
  ChevronRight,
  Shield,
  Download
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    logout,
    setActiveTab,
    isAdmin,
    user,
    vitalLogs,
    appointments,
    reminders,
    scanHistory,
    showToast
  } = useApp();
  const [showTerms, setShowTerms] = useState(false);

  const handleExportVaultJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: user,
      vitalLogs,
      appointments,
      reminders,
      scanHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HealthCarePlus_Vault_${user.id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Health Vault JSON snapshot downloaded', 'success');
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#1f2024] to-[#181818] border border-white/10 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-neutral-800 text-neutral-300 border border-white/10">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 bg-neutral-800 px-2.5 py-0.5 rounded border border-white/10">
              PREFERENCES & SECURITY
            </span>
            <h1 className="text-2xl font-black text-white">Application Settings</h1>
            <p className="text-xs text-neutral-300">
              Customize appearance, notifications, Firestore sync & account security
            </p>
          </div>
        </div>
      </div>

      {/* Admin Panel Quick Entry — Only visible to verified admins */}
      {isAdmin && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-400" />
            <div>
              <h4 className="text-xs font-black text-white">System Administration Panel</h4>
              <p className="text-[10px] text-neutral-300">
                Manage verified specialists, emergency event audits & platform metrics
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('admin')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md transition"
          >
            Open Admin
          </button>
        </div>
      )}

      {/* Theme & Display Options */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Appearance & Language
        </h3>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5">
          <div className="flex items-center gap-3">
            {settings.theme === 'dark' ? (
              <Moon className="w-5 h-5 text-amber-400" />
            ) : (
              <Sun className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <p className="text-xs font-bold text-white">App Theme Mode</p>
              <p className="text-[10px] text-neutral-400">
                Currently: {settings.theme === 'dark' ? 'Luxury Dark Canvas' : 'Clean Light Canvas'}
              </p>
            </div>
          </div>

          <button
            onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-white/10"
          >
            Switch to {settings.theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-xs font-bold text-white">Primary Language</p>
              <p className="text-[10px] text-neutral-400">Multi-language AI translation preference</p>
            </div>
          </div>

          <select
            value={settings.language}
            onChange={(e) => updateSettings({ language: e.target.value as any })}
            className="p-2 rounded-xl bg-neutral-800 border border-white/10 text-xs font-bold text-white"
          >
            <option value="English">English</option>
            <option value="Spanish">Español</option>
            <option value="French">Français</option>
            <option value="German">Deutsch</option>
            <option value="Hindi">Hindi</option>
          </select>
        </div>
      </div>

      {/* Notifications */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Notification Preferences
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 cursor-pointer">
            <span>Push Notifications for Medicine Alarms</span>
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) => updateSettings({ pushNotifications: e.target.checked })}
              className="rounded border-neutral-700 text-emerald-500 focus:ring-0 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 cursor-pointer">
            <span>SMS Emergency Alerts to Primary Contacts</span>
            <input
              type="checkbox"
              checked={settings.smsAlerts}
              onChange={(e) => updateSettings({ smsAlerts: e.target.checked })}
              className="rounded border-neutral-700 text-emerald-500 focus:ring-0 w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Cloud Firestore Vault Export */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Cloud Firestore Data & Portability
        </h3>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 text-xs">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="font-bold text-white">Real-Time Cloud Firestore Sync Active</p>
              <p className="text-[10px] text-neutral-400">
                {vitalLogs.length} vital logs • {appointments.length} appointments • {reminders.length} reminders
              </p>
            </div>
          </div>
          <button
            onClick={handleExportVaultJson}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
        </div>
      </div>

      {/* Terms & Sign Out */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3 text-xs">
        <button
          onClick={() => setShowTerms(true)}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-left text-neutral-200"
        >
          <span>Privacy Policy & Terms of Service</span>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-400 font-extrabold"
        >
          <LogOut className="w-4 h-4" /> Sign Out of HealthCare+
        </button>
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#181818] border border-white/10 rounded-3xl p-6 text-white space-y-4">
            <h3 className="text-lg font-bold">Privacy Policy & Terms</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              HealthCare+ protects user health telemetry using Firebase Authentication and strict Firestore Security Rules ensuring each authenticated patient can only access their own records.
            </p>
            <button
              onClick={() => setShowTerms(false)}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
