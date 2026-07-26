import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, Phone, MapPin, Ambulance, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export const EmergencyModal: React.FC = () => {
  const { isSosModalOpen, closeSosModal, triggerSosDispatch, user, sosDispatched } = useApp();
  const [countdown, setCountdown] = useState<number>(3);
  const [isCounting, setIsCounting] = useState<boolean>(false);
  const [sosDetails, setSosDetails] = useState<any>(null);

  useEffect(() => {
    if (isSosModalOpen && !sosDispatched) {
      setIsCounting(true);
      setCountdown(3);
    }
  }, [isSosModalOpen, sosDispatched]);

  useEffect(() => {
    let timer: any;
    if (isCounting && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isCounting && countdown === 0) {
      setIsCounting(false);
      handleDispatch();
    }
    return () => clearTimeout(timer);
  }, [isCounting, countdown]);

  const handleDispatch = async () => {
    const res = await triggerSosDispatch();
    setSosDetails(res);
  };

  const handleCancelCountdown = () => {
    setIsCounting(false);
    closeSosModal();
  };

  if (!isSosModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#181818] border border-red-500/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden">
        
        {/* Glow backdrop effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={closeSosModal}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/40 mb-4 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            EMERGENCY SOS ALERT
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Dispatching live GPS location to nearest hospital & emergency contacts
          </p>

          {/* Countdown view */}
          {isCounting && (
            <div className="my-6 p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center">
              <span className="text-6xl font-black text-red-400 animate-ping inline-block">
                {countdown}
              </span>
              <p className="text-xs text-red-300 font-semibold mt-3">
                Broadcasting emergency call in {countdown} seconds...
              </p>
              <button
                onClick={handleCancelCountdown}
                className="mt-4 px-6 py-2 text-xs font-extrabold uppercase rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10"
              >
                Cancel Alarm
              </button>
            </div>
          )}

          {/* Dispatched view */}
          {sosDispatched && (
            <div className="my-6 p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-left space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" /> SOS Dispatch Confirmed
              </div>
              <div className="text-xs space-y-1.5 text-neutral-300">
                <p className="flex justify-between">
                  <span className="text-neutral-400">Unit:</span>
                  <span className="font-semibold text-white">{sosDetails?.dispatchedUnit || 'Metro Rapid Response #408'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-neutral-400">Estimated Arrival:</span>
                  <span className="font-semibold text-emerald-400">~6 Minutes</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-neutral-400">Contacts Alerted:</span>
                  <span className="font-semibold text-white">{user.emergencyContacts.length} Contacts (SMS + Location)</span>
                </p>
              </div>
            </div>
          )}

          {/* Emergency Hotline Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <a
              href="tel:911"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition"
            >
              <Phone className="w-4 h-4" /> CALL 911 / 112
            </a>
            <a
              href="tel:108"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-lg shadow-amber-600/30 transition"
            >
              <Ambulance className="w-4 h-4" /> DISPATCH AMBULANCE
            </a>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 text-left">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Primary Emergency Contact
            </p>
            {user.emergencyContacts[0] && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">{user.emergencyContacts[0].name}</p>
                  <p className="text-[10px] text-neutral-400">{user.emergencyContacts[0].relation} • {user.emergencyContacts[0].phone}</p>
                </div>
                <a
                  href={`tel:${user.emergencyContacts[0].phone}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
                >
                  Call
                </a>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
