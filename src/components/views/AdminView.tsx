import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Shield,
  Users,
  Stethoscope,
  Building2,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Search
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { doctors, nearbyPlaces, setActiveTab, showToast } = useApp();

  const handleVerifyDoctor = (docName: string) => {
    showToast(`Doctor credentials for ${docName} re-verified on National Medical Registry`, 'success');
  };

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
              SYSTEM CONTROL PLANE
            </span>
            <h1 className="text-2xl font-black text-white">Super Admin Dashboard</h1>
            <p className="text-xs text-neutral-300">
              Platform telemetry, doctor credentials verification & emergency audit logs
            </p>
          </div>
        </div>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Active Patients</span>
          <p className="text-2xl font-black text-white">14,280</p>
          <span className="text-[10px] text-emerald-400 font-semibold">+12% growth</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Verified Doctors</span>
          <p className="text-2xl font-black text-cyan-400">{doctors.length}</p>
          <span className="text-[10px] text-cyan-400 font-semibold">100% Verified</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">Partner Hospitals</span>
          <p className="text-2xl font-black text-purple-400">{nearbyPlaces.length}</p>
          <span className="text-[10px] text-purple-400 font-semibold">Realtime Sync</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">System Uptime</span>
          <p className="text-2xl font-black text-emerald-400">99.98%</p>
          <span className="text-[10px] text-emerald-400 font-semibold">0 incidents today</span>
        </div>
      </div>

      {/* Doctor Verification Table */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 flex items-center justify-between">
          <span>Medical Practitioner Registrations</span>
          <span className="text-amber-400 text-[10px] font-bold">HIPAA Audit Ready</span>
        </h3>

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
              {doctors.map(doc => (
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
                      onClick={() => handleVerifyDoctor(doc.name)}
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
      </div>

      {/* Emergency SOS Event Log */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Recent Emergency Dispatch Event Logs
        </h3>

        <div className="space-y-2 text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Alex Vance • Critical Heart Rate Alert</p>
              <p className="text-[10px] text-neutral-400">GPS: 37.7749, -122.4194 • Dispatch ID #99281</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              Ambulance En Route
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
