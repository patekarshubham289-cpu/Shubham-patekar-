import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Shield,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Lock
} from 'lucide-react';

interface AdminStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  totalEmergencyEvents: number;
}

export const AdminView: React.FC = () => {
  const {
    isAdmin,
    doctors,
    emergencyEvents,
    setActiveTab,
    seedDoctorDirectory,
    verifyDoctor,
    getAuthToken,
    showToast
  } = useApp();

  const [serverStats, setServerStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const loadOverview = async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const res = await fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.stats) {
          setServerStats(data.stats);
        }
      } catch {
        // Non-blocking if Admin SDK service account not configured
      }
    };

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, getAuthToken]);

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-3xl bg-[#181818] border border-red-500/30 text-center space-y-4 my-8">
        <Lock className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-xl font-black text-white">Administrator Access Required</h2>
        <p className="text-xs text-neutral-400 max-w-md mx-auto">
          Your account does not have verified administrator privileges.
        </p>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#241c12] to-[#181818] border border-amber-500/30 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="p-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
              VERIFIED SYSTEM CONTROL PLANE
            </span>
            <h1 className="text-2xl font-black text-white">Super Admin Dashboard</h1>
            <p className="text-xs text-neutral-300">
              Live Firestore specialist directory & emergency dispatch audit logs
            </p>
          </div>
        </div>

        <button
          onClick={seedDoctorDirectory}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" /> Sync Default Specialists
        </button>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Patients (Firestore)</span>
          <p className="text-2xl font-black text-white">
            {serverStats ? serverStats.totalPatients : '--'}
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold">
            {serverStats ? 'Live Server Count' : 'Requires Admin Service Account'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Verified Doctors</span>
          <p className="text-2xl font-black text-cyan-400">{doctors.length}</p>
          <span className="text-[10px] text-cyan-400 font-semibold">Firestore Synced</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Appointments</span>
          <p className="text-2xl font-black text-purple-400">
            {serverStats ? serverStats.totalAppointments : '--'}
          </p>
          <span className="text-[10px] text-purple-400 font-semibold">Platform Wide</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">SOS Events</span>
          <p className="text-2xl font-black text-red-400">{emergencyEvents.length}</p>
          <span className="text-[10px] text-emerald-400 font-semibold">Live Audit Log</span>
        </div>
      </div>

      {/* Doctor Verification Table */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 flex items-center justify-between">
          <span>Medical Practitioner Registrations ({doctors.length})</span>
          <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Admin Write Protected
          </span>
        </h3>

        {doctors.length === 0 ? (
          <p className="text-xs text-neutral-400 py-4 text-center">
            No doctors in Firestore yet. Click &quot;Sync Default Specialists&quot; above to initialize the directory.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 uppercase text-[10px]">
                  <th className="pb-3">Doctor</th>
                  <th className="pb-3">Specialty</th>
                  <th className="pb-3">Hospital Affiliation</th>
                  <th className="pb-3">Consult Fee</th>
                  <th className="pb-3">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-neutral-900/50 transition">
                    <td className="py-3 font-bold text-white flex items-center gap-2">
                      <img src={doc.photo} alt={doc.name} className="w-8 h-8 rounded-lg object-cover" />
                      <span>{doc.name}</span>
                    </td>
                    <td className="py-3 text-cyan-400 font-semibold">{doc.specialty}</td>
                    <td className="py-3 text-neutral-300">{doc.hospital}</td>
                    <td className="py-3 font-extrabold text-emerald-400">${doc.feeUsd}</td>
                    <td className="py-3">
                      <button
                        onClick={() => verifyDoctor(doc.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Re-Verify License
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Emergency SOS Event Log */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Emergency Dispatch Event Logs ({emergencyEvents.length})
        </h3>

        {emergencyEvents.length === 0 ? (
          <p className="text-xs text-neutral-400 py-4 text-center">No emergency SOS events recorded.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {emergencyEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-white">
                    {ev.patientName || ev.userId} • {ev.dispatchedUnit}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Location: {ev.userLocation} • SOS ID: {ev.sosId} •{' '}
                    {new Date(ev.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
