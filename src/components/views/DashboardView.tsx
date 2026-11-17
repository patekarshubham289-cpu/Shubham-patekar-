import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Heart,
  Activity,
  Droplets,
  ScanLine,
  Bot,
  CalendarCheck,
  ShieldAlert,
  MapPin,
  Pill,
  Sparkles,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    user,
    healthScore,
    latestVital,
    setActiveTab,
    reminders,
    toggleReminderTaken,
    appointments,
    openSosModal,
    editVitalLog,
    showToast
  } = useApp();

  const handleQuickWaterAdd = async () => {
    if (!latestVital) {
      showToast('Log your baseline vitals first before recording daily water intake.', 'info');
      setActiveTab('records');
      return;
    }
    await editVitalLog(latestVital.id, {
      waterIntakeMl: Math.min(20000, (latestVital.waterIntakeMl || 0) + 250),
    });
  };

  const displayScore = healthScore ?? 0;
  const upcomingAppointments = appointments.filter((a) => a.status === 'Upcoming');
  const activeReminders = reminders.filter((r) => r.active);

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Welcome Banner & Health Score */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181818] via-[#1f2923] to-[#121f18] border border-emerald-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Vitality Monitoring Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                {user.name || 'Patient'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-lg">
              {latestVital
                ? 'Your health telemetry is synced with your protected Cloud Firestore vault.'
                : 'Log your first vital measurements to compute your personal Health Index score.'}
            </p>
          </div>

          {/* Score Gauge */}
          <div className="flex items-center gap-4 bg-neutral-900/80 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
            <div className="relative flex items-center justify-center w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="32" stroke="#262626" strokeWidth="8" fill="transparent" />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="#10B981"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="201"
                  strokeDashoffset={201 - (201 * displayScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white">
                  {healthScore !== null ? healthScore : '--'}
                </span>
                <span className="text-[9px] text-neutral-400 font-bold uppercase">/ 100</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">Health Index</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {healthScore === null
                  ? 'No Vitals Yet'
                  : healthScore >= 85
                  ? 'Optimal Vitals'
                  : 'Needs Attention'}
              </p>
              <button
                onClick={() => setActiveTab('records')}
                className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1 hover:underline"
              >
                <TrendingUp className="w-3 h-3" /> {latestVital ? 'View Vital Trends' : 'Record First Vitals'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 mb-3">
          Quick Action Hub
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setActiveTab('scanner')}
            className="p-4 rounded-2xl bg-[#181818] hover:bg-neutral-800 border border-emerald-500/30 text-left transition shadow-lg group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 w-fit mb-2 group-hover:scale-110 transition">
              <ScanLine className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-white">Scan Medicine</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Gemini Vision AI</p>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className="p-4 rounded-2xl bg-[#181818] hover:bg-neutral-800 border border-amber-500/30 text-left transition shadow-lg group"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 w-fit mb-2 group-hover:scale-110 transition">
              <Bot className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-white">AI Assistant</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Symptoms &amp; Info</p>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className="p-4 rounded-2xl bg-[#181818] hover:bg-neutral-800 border border-cyan-500/30 text-left transition shadow-lg group"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 w-fit mb-2 group-hover:scale-110 transition">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-white">Book Doctor</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">In-Person / Video</p>
          </button>

          <button
            onClick={() => setActiveTab('maps')}
            className="p-4 rounded-2xl bg-[#181818] hover:bg-neutral-800 border border-purple-500/30 text-left transition shadow-lg group"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 w-fit mb-2 group-hover:scale-110 transition">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-white">Nearby Hospital</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Google Maps Locator</p>
          </button>

          <button
            onClick={openSosModal}
            className="p-4 rounded-2xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-left transition shadow-lg col-span-2 sm:col-span-1 group"
          >
            <div className="p-2.5 rounded-xl bg-red-600 text-white w-fit mb-2 group-hover:scale-110 transition animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <p className="text-xs font-black text-red-400">Emergency SOS</p>
            <p className="text-[10px] text-red-300 mt-0.5">SOS &amp; Direct 112/108</p>
          </button>
        </div>
      </div>

      {/* Vitals Overview Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            Latest Vitals Snapshot
          </h3>
          <button
            onClick={() => setActiveTab('records')}
            className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
          >
            Full Health Vault <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase">Heart Rate</span>
              <Heart className="w-4 h-4 text-red-500 animate-pulse fill-red-500/20" />
            </div>
            <p className="text-2xl font-black text-white">
              {latestVital ? latestVital.heartRate : '--'}{' '}
              <span className="text-xs font-normal text-neutral-400">BPM</span>
            </p>
            <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">
              {latestVital ? 'Synced from Vault' : 'No reading logged'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase">Blood Pressure</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {latestVital ? `${latestVital.bloodPressureSys}/${latestVital.bloodPressureDia}` : '--/--'}{' '}
              <span className="text-xs font-normal text-neutral-400">mmHg</span>
            </p>
            <span className="text-[10px] text-amber-400 font-semibold mt-1 block">
              {latestVital ? 'Latest Measurement' : 'No reading logged'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase">Blood Sugar</span>
              <Droplets className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {latestVital ? latestVital.bloodSugar : '--'}{' '}
              <span className="text-xs font-normal text-neutral-400">mg/dL</span>
            </p>
            <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">
              {latestVital ? 'Recorded Level' : 'No reading logged'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#181818] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase">Water Intake</span>
              <button
                onClick={handleQuickWaterAdd}
                className="p-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/30 transition"
                title={latestVital ? 'Add 250mL to latest reading' : 'Record initial vitals first'}
              >
                +250ml
              </button>
            </div>
            <p className="text-2xl font-black text-white">
              {latestVital ? (latestVital.waterIntakeMl / 1000).toFixed(1) : '--'}{' '}
              <span className="text-xs font-normal text-neutral-400">L / 3.0L</span>
            </p>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((latestVital?.waterIntakeMl || 0) / 3000) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Reminders & Upcoming Appointments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Pill className="w-4 h-4 text-emerald-400" /> Active Medicine Reminders ({activeReminders.length})
            </h4>
            <button onClick={() => setActiveTab('reminders')} className="text-xs font-bold text-emerald-400 hover:underline">
              Schedule
            </button>
          </div>

          {activeReminders.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-neutral-400">No active medication reminders.</p>
              <button
                onClick={() => setActiveTab('reminders')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30"
              >
                <Plus className="w-3.5 h-3.5" /> Add Medication
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeReminders.slice(0, 4).map((rem) => (
                <div key={rem.id} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900 border border-white/5 gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{rem.name}</p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {rem.dosage} • {rem.timeSlots.join(', ')} ({rem.instructions})
                    </p>
                  </div>
                  <button
                    onClick={() => toggleReminderTaken(rem.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                      rem.takenToday
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {rem.takenToday ? 'Taken' : 'Mark Taken'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-amber-400" /> Upcoming Consultations ({upcomingAppointments.length})
            </h4>
            <button onClick={() => setActiveTab('appointments')} className="text-xs font-bold text-amber-400 hover:underline">
              Find Doctors
            </button>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-neutral-400">No upcoming appointments scheduled.</p>
              <button
                onClick={() => setActiveTab('appointments')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 text-xs font-bold border border-amber-500/30"
              >
                Book Specialist
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingAppointments.slice(0, 3).map((app) => (
                <div key={app.id} className="p-3.5 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {app.doctorPhoto && (
                      <img src={app.doctorPhoto} alt={app.doctorName} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{app.doctorName}</p>
                      <p className="text-[10px] text-amber-400 truncate">
                        {app.doctorSpecialty} • {app.type}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" /> {app.date} at {app.timeSlot}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 shrink-0">
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
