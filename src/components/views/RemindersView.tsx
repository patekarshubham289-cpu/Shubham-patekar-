import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MedicineReminder } from '../../types';
import { getTodayDateString } from '../../lib/validation';
import {
  Pill,
  Plus,
  CheckCircle2,
  X,
  Trash2,
  Edit,
  Bell,
  Clock,
  AlertTriangle,
  XCircle
} from 'lucide-react';

export const RemindersView: React.FC = () => {
  const {
    reminders,
    toggleReminderTaken,
    markReminderMissed,
    addReminder,
    editReminder,
    removeReminder,
    notificationPermission,
    requestBrowserNotifications,
    showToast
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<MedicineReminder | null>(null);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('1 Tablet');
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'As Needed'>('Daily');
  const [timeSlotsText, setTimeSlotsText] = useState('08:00 AM, 08:00 PM');
  const [instructions, setInstructions] = useState<'Before Food' | 'After Food' | 'With Water'>('After Food');
  const [pillsLeft, setPillsLeft] = useState(30);
  const [active, setActive] = useState(true);

  const today = getTodayDateString();
  const takenCount = reminders.filter((r) => r.active && r.takenToday).length;
  const missedTodayCount = reminders.filter((r) => r.active && r.missedDates?.includes(today)).length;
  const pendingCount = reminders.filter(
    (r) => r.active && !r.takenToday && !r.missedDates?.includes(today)
  ).length;

  const openAddModal = () => {
    setEditingReminder(null);
    setName('');
    setDosage('1 Tablet');
    setFrequency('Daily');
    setTimeSlotsText('08:00 AM');
    setInstructions('After Food');
    setPillsLeft(30);
    setActive(true);
    setShowModal(true);
  };

  const openEditModal = (rem: MedicineReminder) => {
    setEditingReminder(rem);
    setName(rem.name);
    setDosage(rem.dosage);
    setFrequency(rem.frequency);
    setTimeSlotsText(rem.timeSlots.join(', '));
    setInstructions(rem.instructions);
    setPillsLeft(rem.pillsLeft);
    setActive(rem.active);
    setShowModal(true);
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parsedSlots = timeSlotsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const finalSlots = parsedSlots.length > 0 ? parsedSlots : ['08:00 AM'];

    if (editingReminder) {
      await editReminder(editingReminder.id, {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        timeSlots: finalSlots,
        instructions,
        pillsLeft: Number(pillsLeft),
        active,
      });
    } else {
      await addReminder({
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        timeSlots: finalSlots,
        instructions,
        pillsLeft: Number(pillsLeft),
        active,
      });
    }
    setShowModal(false);
    setEditingReminder(null);
  };

  const handleTestNotification = async () => {
    let perm = notificationPermission;
    if (perm === 'default') {
      perm = await requestBrowserNotifications();
    }
    if (perm === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
      new Notification('HealthCare+ Medication Reminder', {
        body: 'Browser medication notifications are active for your scheduled doses.',
      });
      showToast('Test browser notification sent', 'success');
    } else if (perm === 'denied') {
      showToast('Notification permission is blocked in your browser settings.', 'error');
    } else {
      showToast('Browser notifications are unavailable in this environment; in-app alerts remain active.', 'info');
    }
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#12221b] to-[#181818] border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Pill className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
              SMART PILL TIMELINE
            </span>
            <h1 className="text-2xl font-black text-white">Medicine Reminders</h1>
            <p className="text-xs text-neutral-300">
              Schedule multiple daily times, track taken vs missed doses, and manage pill inventory
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" /> Add Reminder
        </button>
      </div>

      {/* Browser Notification Status & Adherence Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10">
          <p className="text-[10px] uppercase font-bold text-neutral-400">Completed Today</p>
          <p className="text-2xl font-black text-emerald-400">{takenCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10">
          <p className="text-[10px] uppercase font-bold text-neutral-400">Due Today</p>
          <p className="text-2xl font-black text-amber-400">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10">
          <p className="text-[10px] uppercase font-bold text-neutral-400">Missed Today</p>
          <p className="text-2xl font-black text-red-400">{missedTodayCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">Browser Alerts</p>
            <p className="text-xs font-bold text-white capitalize mt-1">
              {notificationPermission === 'granted'
                ? 'Granted'
                : notificationPermission === 'denied'
                ? 'Blocked'
                : notificationPermission === 'unsupported'
                ? 'In-App Only'
                : 'Not Requested'}
            </p>
          </div>
          <button
            onClick={
              notificationPermission === 'granted' ? handleTestNotification : requestBrowserNotifications
            }
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 shrink-0"
          >
            <Bell className="w-3.5 h-3.5" />
            {notificationPermission === 'granted' ? 'Test' : 'Allow'}
          </button>
        </div>
      </div>

      {/* Active Schedules List */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4 shadow-xl">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Medication Schedules ({reminders.length})
        </h3>

        {reminders.length === 0 ? (
          <p className="text-xs text-neutral-400 py-6 text-center">
            No medication reminders configured yet. Click &quot;Add Reminder&quot; to create your first schedule.
          </p>
        ) : (
          <div className="space-y-3">
            {reminders.map((rem) => {
              const isMissedToday = Boolean(rem.missedDates?.includes(today)) && !rem.takenToday;
              const lowStock = rem.pillsLeft <= 5;

              return (
                <div
                  key={rem.id}
                  className={`p-4 rounded-2xl border transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    !rem.active
                      ? 'bg-neutral-900/40 border-white/5 opacity-60'
                      : rem.takenToday
                      ? 'bg-neutral-900/70 border-emerald-500/30'
                      : isMissedToday
                      ? 'bg-red-950/20 border-red-500/30'
                      : 'bg-neutral-900 border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl shrink-0 ${
                        rem.takenToday
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isMissedToday
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      <Pill className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{rem.name}</h4>
                        {!rem.active && (
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px] font-bold">
                            Paused
                          </span>
                        )}
                        {isMissedToday && (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                            Missed Today
                          </span>
                        )}
                        {lowStock && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 flex items-center gap-1.5 flex-wrap">
                        <span>{rem.dosage}</span>
                        <span>•</span>
                        <span>{rem.frequency}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-neutral-300">
                          <Clock className="w-3 h-3 text-emerald-400" /> {rem.timeSlots.join(', ')}
                        </span>
                        <span>({rem.instructions})</span>
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        <span className="text-emerald-400 font-semibold">{rem.pillsLeft} pills remaining</span>
                        {' • '}
                        Completed days: {rem.completedDates?.length || 0}
                        {' • '}
                        Missed days: {rem.missedDates?.length || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => toggleReminderTaken(rem.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                        rem.takenToday
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {rem.takenToday ? 'Taken Today' : 'Mark Taken'}
                    </button>

                    {!rem.takenToday && !isMissedToday && (
                      <button
                        onClick={() => markReminderMissed(rem.id)}
                        className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-red-950/60 text-neutral-300 hover:text-red-300 border border-white/10 text-xs font-bold flex items-center gap-1 transition"
                        title="Record missed dose today"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Missed
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(rem)}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                      title="Edit reminder"
                      aria-label={`Edit ${rem.name}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => removeReminder(rem.id)}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition"
                      title="Delete reminder"
                      aria-label={`Delete ${rem.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Reminder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#181818] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white">
              {editingReminder ? 'Edit Medicine Schedule' : 'New Medicine Schedule'}
            </h3>

            <form onSubmit={handleSaveReminder} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Medicine Name &amp; Strength</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={160}
                  placeholder="e.g. Amoxicillin 500mg, Vitamin C"
                  required
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Dose Amount</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    maxLength={80}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Total Pill Count</label>
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    value={pillsLeft}
                    onChange={(e) => setPillsLeft(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Reminder Times (comma separated)
                </label>
                <input
                  type="text"
                  value={timeSlotsText}
                  onChange={(e) => setTimeSlotsText(e.target.value)}
                  placeholder="e.g. 08:00 AM, 08:00 PM"
                  required
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="As Needed">As Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Instructions</label>
                  <select
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value as any)}
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  >
                    <option value="After Food">After Food</option>
                    <option value="Before Food">Before Food</option>
                    <option value="With Water">With Water</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-neutral-300 font-semibold">Reminder Schedule Active</span>
              </label>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg transition mt-2"
              >
                {editingReminder ? 'Update Reminder Schedule' : 'Save Schedule Alarm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
