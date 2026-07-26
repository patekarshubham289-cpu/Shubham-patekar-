import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Sun,
  Moon,
  Globe,
  Bell,
  Lock,
  Fingerprint,
  Database,
  Trash2,
  LogOut,
  ShieldCheck,
  Info,
  ChevronRight,
  Shield
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, logout, setActiveTab, showToast } = useApp();
  const [showTerms, setShowTerms] = useState(false);

  const handleBackup = () => {
    showToast('Encrypted Health Vault cloud backup completed successfully', 'success');
  };

  const handleRestore = () => {
    showToast('Vault restored from last cloud snapshot (Today 00:00 GMT)', 'success');
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
              Customize appearance, biometric authentication, notifications & data privacy
            </p>
          </div>
        </div>
      </div>

      {/* Admin Panel Quick Entry */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-amber-400" />
          <div>
            <h4 className="text-xs font-black text-white">System Administration Panel</h4>
            <p className="text-[10px] text-neutral-300">Manage doctors, hospitals, system logs & user permissions</p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('admin')}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md transition"
        >
          Open Admin
        </button>
      </div>

      {/* Theme & Display Options */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Appearance & Language
        </h3>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5">
          <div className="flex items-center gap-3">
            {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-emerald-400" />}
            <div>
              <p className="text-xs font-bold text-white">App Theme Mode</p>
              <p className="text-[10px] text-neutral-400">Currently: {settings.theme === 'dark' ? 'Luxury Dark Canvas' : 'Clean Light Canvas'}</p>
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
              <p className="text-[10px] text-neutral-400">Multi-language AI translation enabled</p>
            </div>
          </div>

          <select
            value={settings.language}
            onChange={e => updateSettings({ language: e.target.value as any })}
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
          Push Notifications & Alerts
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 cursor-pointer">
            <span>Push Notifications for Medicine Alarms</span>
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={e => updateSettings({ pushNotifications: e.target.checked })}
              className="rounded border-neutral-700 text-emerald-500 focus:ring-0 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 cursor-pointer">
            <span>SMS Emergency Alerts to Primary Contacts</span>
            <input
              type="checkbox"
              checked={settings.smsAlerts}
              onChange={e => updateSettings({ smsAlerts: e.target.checked })}
              className="rounded border-neutral-700 text-emerald-500 focus:ring-0 w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Biometrics & Privacy */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Biometrics & Security
        </h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 cursor-pointer text-xs">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-emerald-400" />
              <span>Enable FaceID / Fingerprint Lock</span>
            </div>
            <input
              type="checkbox"
              checked={settings.biometricsEnabled}
              onChange={e => updateSettings({ biometricsEnabled: e.target.checked })}
              className="rounded border-neutral-700 text-emerald-500 focus:ring-0 w-4 h-4"
            />
          </label>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 text-xs">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-cyan-400" />
              <span>Encrypted Data Cloud Backup</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleBackup} className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                Backup Now
              </button>
              <button onClick={handleRestore} className="px-3 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 font-bold">
                Restore
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Privacy */}
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

      {/* Modal Terms */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#181818] border border-white/10 rounded-3xl p-6 text-white space-y-4">
            <h3 className="text-lg font-bold">Privacy Policy & Terms</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              HealthCare+ protects user health telemetry using zero-knowledge end-to-end encryption. All medical records are stored strictly in accordance with HIPAA standards.
            </p>
            <button onClick={() => setShowTerms(false)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold">
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
