import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Phone,
  CheckCircle2,
  X,
  MapPin,
  MessageSquare,
  Copy,
  AlertTriangle
} from 'lucide-react';

export const EmergencyModal: React.FC = () => {
  const {
    isSosModalOpen,
    closeSosModal,
    triggerSosDispatch,
    user,
    sosDispatched,
    lastSosEvent,
    showToast
  } = useApp();

  const [countdown, setCountdown] = useState<number>(3);
  const [isCounting, setIsCounting] = useState<boolean>(false);
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');

  const handleLogSos = useCallback(async () => {
    setIsLogging(true);
    try {
      await triggerSosDispatch(note.trim() || undefined);
    } catch {
      // Handled via toast in triggerSosDispatch
    } finally {
      setIsLogging(false);
    }
  }, [triggerSosDispatch, note]);

  useEffect(() => {
    if (isSosModalOpen && !sosDispatched) {
      setIsCounting(true);
      setCountdown(3);
      setNote('');
    }
  }, [isSosModalOpen, sosDispatched]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isCounting && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isCounting && countdown === 0) {
      setIsCounting(false);
      handleLogSos();
    }
    return () => clearTimeout(timer);
  }, [isCounting, countdown, handleLogSos]);

  const handleCancelCountdown = () => {
    setIsCounting(false);
    closeSosModal();
  };

  if (!isSosModalOpen) return null;

  const locationText = lastSosEvent?.userLocation || 'Current GPS pending';
  const emergencyShareMessage = `EMERGENCY SOS from ${user.name || 'HealthCare+ Patient'}. Location: ${locationText}${
    lastSosEvent?.coordinates
      ? ` (https://maps.google.com/?q=${lastSosEvent.coordinates.lat},${lastSosEvent.coordinates.lng})`
      : ''
  }. Blood Group: ${user.bloodGroup || 'Unknown'}. Please call me immediately.`;

  const copyEmergencyMessage = async () => {
    try {
      await navigator.clipboard.writeText(emergencyShareMessage);
      showToast('Emergency location & status message copied', 'success');
    } catch {
      showToast('Copy unavailable on this browser', 'info');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[#181818] border border-red-500/30 rounded-3xl p-6 shadow-2xl text-white overflow-y-auto max-h-[92vh]">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={handleCancelCountdown}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition"
          aria-label="Close SOS Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/40 mb-3 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 id="sos-modal-title" className="text-2xl font-black text-white tracking-tight">
            EMERGENCY SOS ASSISTANT
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Logs your GPS coordinates (if granted), prepares alerts for saved contacts, and provides direct emergency dialers.
          </p>

          {isCounting && (
            <div className="my-5 p-5 rounded-2xl bg-red-950/40 border border-red-500/30 text-center space-y-3">
              <span className="text-5xl font-black text-red-400 inline-block">
                {countdown}
              </span>
              <p className="text-xs text-red-200 font-semibold">
                Logging SOS request & requesting GPS coordinates in {countdown} seconds...
              </p>
              <input
                type="text"
                placeholder="Optional note (e.g., chest pain, fall, address)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white placeholder-neutral-500"
              />
              <button
                onClick={handleCancelCountdown}
                className="px-6 py-2 text-xs font-extrabold uppercase rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10"
              >
                Cancel Countdown
              </button>
            </div>
          )}

          {isLogging && !isCounting && (
            <div className="my-5 p-4 rounded-2xl bg-neutral-900 border border-white/10 text-xs text-neutral-300">
              Recording SOS request & checking browser GPS coordinates...
            </div>
          )}

          {sosDispatched && lastSosEvent && (
            <div className="my-4 space-y-3 text-left">
              {/* 1. SOS Request Logged */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" /> 1. SOS Request Logged
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {lastSosEvent.status}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{lastSosEvent.userLocation}</span>
                </p>
                <p className="text-[10px] text-neutral-400 font-mono">
                  Reference ID: {lastSosEvent.sosId}
                </p>
              </div>

              {/* 2. Important Ambulance / Response Truth Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-200 leading-relaxed">
                  <strong>Important:</strong> HealthCare+ does <strong>not</strong> automatically dispatch ambulances or contact municipal emergency dispatchers. Use the direct dial buttons below right now if immediate medical care is needed.
                </div>
              </div>
            </div>
          )}

          {/* 3. Direct Emergency Services Dialers */}
          <div className="mt-4">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider text-left mb-2">
              Direct Emergency Response Dialers
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'India 112', num: '112' },
                { label: 'Ambulance 108', num: '108' },
                { label: 'Maternal 102', num: '102' },
                { label: 'Intl 911', num: '911' },
              ].map((item) => (
                <a
                  key={item.num}
                  href={`tel:${item.num}`}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/25 transition"
                >
                  <Phone className="w-3.5 h-3.5" /> {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* 4. Emergency Contact Notification Options */}
          <div className="mt-4 pt-4 border-t border-white/10 text-left space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Contact Notification Attempts ({user.emergencyContacts.length})
              </p>
              <button
                onClick={copyEmergencyMessage}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline"
              >
                <Copy className="w-3 h-3" /> Copy SOS Details
              </button>
            </div>

            {user.emergencyContacts.length === 0 ? (
              <p className="text-xs text-neutral-400 p-3 rounded-xl bg-neutral-900 border border-white/5">
                No emergency contacts saved yet. Add contacts in Patient Profile so you can call or text them with one tap.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {user.emergencyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-neutral-900 border border-white/5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {contact.name} {contact.isPrimary && <span className="text-amber-400">(Primary)</span>}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {contact.relation} • {contact.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${contact.phone}`}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                      <a
                        href={`sms:${contact.phone}?body=${encodeURIComponent(emergencyShareMessage)}`}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 border border-white/10 text-[11px] font-bold flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> SMS
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
