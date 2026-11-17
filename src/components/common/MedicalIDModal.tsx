import React from 'react';
import { useApp } from '../../context/AppContext';
import { Activity, Heart, AlertTriangle, Phone, X, Stethoscope } from 'lucide-react';

export const MedicalIDModal: React.FC = () => {
  const { isMedicalIdOpen, setIsMedicalIdOpen, user, latestVital } = useApp();

  if (!isMedicalIdOpen) return null;

  const initials = (user.name || user.email || 'HC')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#181818] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Luxury Gold/Emerald Background Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={() => setIsMedicalIdOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              FIRST RESPONDER PASSPORT
            </span>
            <h3 className="text-xl font-black text-white">Emergency Medical ID</h3>
          </div>
        </div>

        {/* User Card */}
        <div className="my-4 flex items-center gap-4 p-4 rounded-2xl bg-neutral-900 border border-white/5">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/50"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 font-black text-lg flex items-center justify-center ring-2 ring-emerald-500/50">
              {initials}
            </div>
          )}
          <div>
            <h4 className="text-lg font-bold text-white">{user.name || 'Patient'}</h4>
            <p className="text-xs text-neutral-400">
              {user.gender} • {user.age} Years Old • Height: {user.heightCm}cm
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 font-black text-xs">
                Blood Group: {user.bloodGroup || 'Unknown'}
              </span>
              {user.isDonor && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-emerald-400" /> Organ Donor
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Vitals Snapshot */}
        <div className="grid grid-cols-3 gap-2 text-center my-4">
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/5">
            <span className="text-[10px] text-neutral-400 uppercase">Heart Rate</span>
            <p className="text-base font-black text-emerald-400">
              {latestVital ? `${latestVital.heartRate} BPM` : '--'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/5">
            <span className="text-[10px] text-neutral-400 uppercase">Blood Pressure</span>
            <p className="text-base font-black text-amber-400">
              {latestVital ? `${latestVital.bloodPressureSys}/${latestVital.bloodPressureDia}` : '--'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/5">
            <span className="text-[10px] text-neutral-400 uppercase">SpO2 Oxygen</span>
            <p className="text-base font-black text-cyan-400">
              {latestVital ? `${latestVital.spO2}%` : '--'}
            </p>
          </div>
        </div>

        {/* Critical Allergies & Conditions */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30">
            <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-4 h-4" /> Known Allergies
            </h5>
            {user.allergies.length === 0 ? (
              <p className="text-xs text-neutral-400">No allergies recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {user.allergies.map((allergy, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 font-semibold text-xs border border-red-500/30"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900 border border-white/5">
            <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Stethoscope className="w-4 h-4" /> Chronic Conditions
            </h5>
            {user.medicalConditions.length === 0 ? (
              <p className="text-xs text-neutral-400">No chronic conditions recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {user.medicalConditions.map((cond, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-semibold text-xs border border-amber-500/20"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Emergency Contacts */}
          <div className="p-3.5 rounded-xl bg-neutral-900 border border-white/5">
            <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Phone className="w-4 h-4 text-emerald-400" /> Designated Emergency Contacts
            </h5>
            {user.emergencyContacts.length === 0 ? (
              <p className="text-xs text-neutral-400">
                No emergency contacts saved yet. Add contacts in your Profile.
              </p>
            ) : (
              <div className="space-y-2">
                {user.emergencyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-white/5"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">
                        {contact.name} ({contact.relation})
                      </p>
                      <p className="text-[11px] text-neutral-400">{contact.phone}</p>
                    </div>
                    <a
                      href={`tel:${contact.phone}`}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs"
                    >
                      Call
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] text-neutral-500">
            HealthCare+ Encrypted Digital Health Passport • Verified by Firebase Auth
          </p>
        </div>
      </div>
    </div>
  );
};
