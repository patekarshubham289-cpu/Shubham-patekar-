import React, { useState, useEffect } from 'react';
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
  Download,
  Bell,
  MapPin,
  KeyRound
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
    notificationPermission,
    requestBrowserNotifications,
    sendPasswordReset,
    showToast
  } = useApp();

  const [showTerms, setShowTerms] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string>('Checking...');
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((res) => {
          setGeoStatus(res.state);
          res.onchange = () => setGeoStatus(res.state);
        })
        .catch(() => setGeoStatus('prompt'));
    } else {
      setGeoStatus(typeof navigator !== 'undefined' && navigator.geolocation ? 'prompt' : 'unsupported');
    }
  }, []);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported on this browser.', 'info');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoStatus('granted');
        updateSettings({ locationAccess: true });
        showToast('Location permission granted', 'success');
      },
      () => {
        setGeoStatus('denied');
        showToast('Location permission denied in browser settings.', 'error');
      },
      { timeout: 6000 }
    );
  };

  const handleTriggerPasswordReset = async () => {
    if (!user.email) return;
    setSendingReset(true);
    try {
      await sendPasswordReset(user.email);
    } finally {
      setSendingReset(false);
    }
  };

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
              PREFERENCES &amp; SECURITY
            </span>
            <h1 className="text-2xl font-black text-white">Application Settings</h1>
            <p className="text-xs text-neutral-300">
              Appearance, browser permissions, Firestore vault portability &amp; account security
            </p>
          </div>
        </div>
      </div>

      {/* Admin Panel Quick Entry — Only visible to verified admins */}
      {isAdmin && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-white">System Administration Panel</h4>
              <p className="text-[10px] text-neutral-300">
                Manage verified clinicians, demo profiles, emergency events, user roles &amp; audit logs
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('admin')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md transition shrink-0"
          >
            Open Admin
          </button>
        </div>
      )}

      {/* Theme & Display Options */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Appearance &amp; Language
        </h3>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 gap-3">
          <div className="flex items-center gap-3">
            {settings.theme === 'dark' ? (
              <Moon className="w-5 h-5 text-amber-400" />
            ) : (
              <Sun className="w-5 h-5 text-emerald-500" />
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
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-white/10 shrink-0"
          >
            Switch to {settings.theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 gap-3">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-xs font-bold text-white">Primary Language</p>
              <p className="text-[10px] text-neutral-400">Multi-language AI response preference</p>
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

      {/* Notifications & Device Permissions */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Permissions &amp; Notification Preferences
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 gap-3">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-bold text-white">Browser Medication Notifications</p>
                <p className="text-[10px] text-neutral-400 capitalize">
                  Browser status: {notificationPermission}
                </p>
              </div>
            </div>
            <button
              onClick={requestBrowserNotifications}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 shrink-0"
            >
              {notificationPermission === 'granted' ? 'Enabled' : 'Enable Alerts'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 gap-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-purple-400" />
              <div>
                <p className="font-bold text-white">Geolocation Access (Maps &amp; SOS)</p>
                <p className="text-[10px] text-neutral-400 capitalize">Browser status: {geoStatus}</p>
              </div>
            </div>
            <button
              onClick={handleRequestLocation}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 shrink-0"
            >
              {geoStatus === 'granted' ? 'Granted' : 'Request GPS'}
            </button>
          </div>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 cursor-pointer">
            <span>Enable In-App Medicine Reminder Scheduling</span>
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) => updateSettings({ pushNotifications: e.target.checked })}
              className="rounded border-neutral-700 text-emerald-500 focus:ring-0 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 cursor-pointer">
            <span>Include Location Access in Facility Search</span>
            <input
              type="checkbox"
              checked={settings.locationAccess}
              onChange={(e) => updateSettings({ locationAccess: e.target.checked })}
              className="rounded border-neutral-700 text-emerald-500 focus:ring-0 w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Cloud Firestore Vault Export & Password Reset */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Account Security &amp; Data Portability
        </h3>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 text-xs gap-3">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Real-Time Cloud Firestore Sync Active</p>
              <p className="text-[10px] text-neutral-400">
                {vitalLogs.length} vital logs • {appointments.length} appointments • {reminders.length} reminders
              </p>
            </div>
          </div>
          <button
            onClick={handleExportVaultJson}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-white/5 text-xs gap-3">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Firebase Password Reset</p>
              <p className="text-[10px] text-neutral-400">
                Send a password reset email to {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleTriggerPasswordReset}
            disabled={sendingReset || !user.email}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shrink-0 disabled:opacity-50"
          >
            {sendingReset ? 'Sending...' : 'Send Reset Email'}
          </button>
        </div>
      </div>

      {/* Terms & Sign Out */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3 text-xs">
        <button
          onClick={() => setShowTerms(true)}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-left text-neutral-200"
        >
          <span>Privacy Policy &amp; Terms of Service</span>
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
            <h3 className="text-lg font-bold">Privacy Policy &amp; Terms</h3>
            <div className="text-xs text-neutral-300 leading-relaxed space-y-2">
              <p>
                HealthCare+ secures patient profiles, vitals, reminders, scans, and appointments using Firebase Authentication (verified email sessions), HTTPS/TLS transport security, and user-scoped Cloud Firestore Security Rules.
              </p>
              <p>
                AI features (Medicine Scanner and AI Assistant) provide informational support only and do not constitute medical diagnosis or prescriptions. Always consult a licensed clinician and verify medication packaging physically before use.
              </p>
              <p>
                Nearby Medical Facilities uses Google Maps Platform. Use of map and places features is governed by the Google Maps/Google Earth Additional Terms of Service and Google Privacy Policy. Location searches do not transmit medical history or vitals to Google Maps.
              </p>
            </div>
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
