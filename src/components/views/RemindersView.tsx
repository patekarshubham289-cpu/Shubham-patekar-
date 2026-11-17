import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Pill, Plus, CheckCircle2, X, Trash2 } from 'lucide-react';

export const RemindersView: React.FC = () => {
  const { reminders, toggleReminderTaken, addReminder, removeReminder } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('1 Tablet');
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'As Needed'>('Daily');
  const [timeSlot, setTimeSlot] = useState('08:00 AM');
  const [instructions, setInstructions] = useState<'Before Food' | 'After Food' | 'With Water'>('After Food');
  const [pillsLeft, setPillsLeft] = useState(30);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addReminder({
      name,
      dosage,
      frequency,
      timeSlots: [timeSlot],
      instructions,
      pillsLeft: Number(pillsLeft),
      active: true,
    });
    setName('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#12221b] to-[#181818] border border-emerald-500/30 flex items-center justify-between shadow-2xl">
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
              Synced with Cloud Firestore • Track daily adherence and pill inventory
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" /> Add Reminder
        </button>
      </div>

      {/* Active Schedules List */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4 shadow-xl">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Scheduled Medication ({reminders.length})
        </h3>

        {reminders.length === 0 ? (
          <p className="text-xs text-neutral-400 py-6 text-center">
            No medication reminders configured yet. Click &quot;Add Reminder&quot; to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  rem.takenToday
                    ? 'bg-neutral-900/60 border-emerald-500/30 opacity-80'
                    : 'bg-neutral-900 border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      rem.takenToday ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{rem.name}</h4>
                    <p className="text-xs text-neutral-400">
                      {rem.dosage} • {rem.frequency} • {rem.timeSlots.join(', ')} ({rem.instructions})
                    </p>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                      {rem.pillsLeft} Pills Remaining in Pack
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleReminderTaken(rem.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                      rem.takenToday
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {rem.takenToday ? 'Taken' : 'Mark Dose Taken'}
                  </button>
                  <button
                    onClick={() => removeReminder(rem.id)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition"
                    title="Delete reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#181818] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white">New Medicine Schedule</h3>

            <form onSubmit={handleCreateReminder} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Medicine Name & Strength</label>
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
                  <label className="block text-neutral-400 font-semibold mb-1">Alarm Time</label>
                  <input
                    type="text"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    maxLength={32}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>
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

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg transition mt-2"
              >
                Save Schedule Alarm
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
