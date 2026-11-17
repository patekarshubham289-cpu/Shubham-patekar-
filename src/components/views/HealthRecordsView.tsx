import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LineChart,
  Activity,
  Heart,
  Droplets,
  Plus,
  Download,
  Wind,
  X
} from 'lucide-react';

export const HealthRecordsView: React.FC = () => {
  const { vitalLogs, addVitalLog, latestVital, user, showToast } = useApp();
  const [showLogModal, setShowLogModal] = useState(false);

  // Form State
  const [heartRate, setHeartRate] = useState(latestVital?.heartRate ?? 72);
  const [sysBP, setSysBP] = useState(latestVital?.bloodPressureSys ?? 118);
  const [diaBP, setDiaBP] = useState(latestVital?.bloodPressureDia ?? 78);
  const [sugar, setSugar] = useState(latestVital?.bloodSugar ?? 95);
  const [weight, setWeight] = useState(latestVital?.weightKg ?? user.weightKg ?? 72);
  const [temp, setTemp] = useState(latestVital?.temperatureC ?? 36.6);
  const [spO2, setSpO2] = useState(latestVital?.spO2 ?? 99);
  const [water, setWater] = useState(latestVital?.waterIntakeMl ?? 2000);
  const [sleep, setSleep] = useState(latestVital?.sleepHours ?? 7.5);
  const [mood, setMood] = useState<'Excellent' | 'Good' | 'Neutral' | 'Fatigued' | 'Unwell'>(
    latestVital?.mood ?? 'Good'
  );

  const handleSaveVital = async (e: React.FormEvent) => {
    e.preventDefault();
    const heightM = (user.heightCm || 170) / 100;
    const computedBmi = Number((weight / (heightM * heightM)).toFixed(1));
    await addVitalLog({
      heartRate: Number(heartRate),
      bloodPressureSys: Number(sysBP),
      bloodPressureDia: Number(diaBP),
      bloodSugar: Number(sugar),
      bmi: computedBmi,
      weightKg: Number(weight),
      temperatureC: Number(temp),
      spO2: Number(spO2),
      waterIntakeMl: Number(water),
      sleepHours: Number(sleep),
      mood,
    });
    setShowLogModal(false);
  };

  const downloadClinicalReport = () => {
    const lines = [
      'HEALTHCARE+ CLINICAL SUMMARY REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      `Patient: ${user.name} (${user.email})`,
      `Blood Group: ${user.bloodGroup} | Age: ${user.age} | Height: ${user.heightCm}cm`,
      `Allergies: ${user.allergies.join(', ') || 'None'}`,
      `Conditions: ${user.medicalConditions.join(', ') || 'None'}`,
      '',
      'RECENT VITAL LOGS:',
      ...vitalLogs.map(
        (v) =>
          `- ${new Date(v.timestamp).toLocaleString()} | HR: ${v.heartRate} bpm | BP: ${v.bloodPressureSys}/${v.bloodPressureDia} mmHg | Glucose: ${v.bloodSugar} mg/dL | SpO2: ${v.spO2}% | Temp: ${v.temperatureC}°C | Mood: ${v.mood}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HealthCarePlus_Clinical_Summary_${(user.name || 'patient').replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Clinical summary exported', 'success');
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#12221b] to-[#181818] border border-emerald-500/30 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <LineChart className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
              FIRESTORE HEALTH VAULT
            </span>
            <h1 className="text-2xl font-black text-white">Health Vitals & Records</h1>
            <p className="text-xs text-neutral-300">
              Biometric telemetry tracking, historical charts & exportable medical reports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadClinicalReport}
            disabled={vitalLogs.length === 0}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40"
            title="Export Clinical Summary"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Summary</span>
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Record Vitals
          </button>
        </div>
      </div>

      {/* Primary Vitals Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Pulse</span>
            <Heart className="w-4 h-4 text-red-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-white">
            {latestVital ? latestVital.heartRate : '--'} <span className="text-xs text-neutral-400">BPM</span>
          </p>
          <p className="text-[10px] text-emerald-400 font-semibold">Resting Heart Rate</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Blood Pressure</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {latestVital ? `${latestVital.bloodPressureSys}/${latestVital.bloodPressureDia}` : '--/--'}
          </p>
          <p className="text-[10px] text-amber-400 font-semibold">Systolic / Diastolic</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Blood Glucose</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {latestVital ? latestVital.bloodSugar : '--'} <span className="text-xs text-neutral-400">mg/dL</span>
          </p>
          <p className="text-[10px] text-emerald-400 font-semibold">Glucose Telemetry</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Body Oxygen</span>
            <Wind className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {latestVital ? `${latestVital.spO2}%` : '--%'} <span className="text-xs text-neutral-400">SpO2</span>
          </p>
          <p className="text-[10px] text-purple-400 font-semibold">Saturated O2</p>
        </div>
      </div>

      {/* Visual Chart Trends */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4 shadow-xl">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 flex items-center justify-between">
          <span>Heart Rate Telemetry Trend</span>
          <span className="text-emerald-400 text-[10px] font-bold">Firestore Live Sync</span>
        </h3>

        {vitalLogs.length === 0 ? (
          <p className="text-xs text-neutral-400 py-8 text-center">
            No vital records found yet. Click &quot;Record Vitals&quot; above to add your first entry.
          </p>
        ) : (
          <div className="h-40 w-full flex items-end justify-between gap-3 pt-6 px-2">
            {vitalLogs.slice(0, 7).reverse().map((log) => {
              const hrHeight = Math.min(100, (log.heartRate / 120) * 100);
              return (
                <div key={log.id} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-extrabold text-emerald-400">{log.heartRate}</span>
                  <div className="w-full max-w-[32px] bg-neutral-900 rounded-t-xl h-28 flex items-end p-1 relative group">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-500"
                      style={{ height: `${hrHeight}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] text-neutral-500">
                    {new Date(log.timestamp).toLocaleDateString([], { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Vital Logs Table */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Historical Measurement Logs ({vitalLogs.length})
        </h3>

        {vitalLogs.length === 0 ? (
          <p className="text-xs text-neutral-400 py-4 text-center">No measurements logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 uppercase text-[10px]">
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3">Pulse</th>
                  <th className="pb-3">Blood Pressure</th>
                  <th className="pb-3">Sugar</th>
                  <th className="pb-3">Temp</th>
                  <th className="pb-3">SpO2</th>
                  <th className="pb-3">Mood</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {vitalLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-900/50 transition">
                    <td className="py-3 font-semibold text-white">
                      {new Date(log.timestamp).toLocaleDateString()}{' '}
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 font-bold text-red-400">{log.heartRate} bpm</td>
                    <td className="py-3 font-bold text-amber-400">
                      {log.bloodPressureSys}/{log.bloodPressureDia}
                    </td>
                    <td className="py-3 font-bold text-cyan-400">{log.bloodSugar} mg/dL</td>
                    <td className="py-3 font-semibold text-neutral-300">{log.temperatureC}°C</td>
                    <td className="py-3 font-semibold text-purple-400">{log.spO2}%</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                        {log.mood}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to Add New Vitals */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#181818] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowLogModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white mb-4">Record New Vitals</h3>

            <form onSubmit={handleSaveVital} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">Heart Rate (BPM)</label>
                  <input
                    type="number"
                    min={20}
                    max={260}
                    value={heartRate}
                    onChange={(e) => setHeartRate(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    min={20}
                    max={800}
                    value={sugar}
                    onChange={(e) => setSugar(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">BP Systolic (mmHg)</label>
                  <input
                    type="number"
                    min={40}
                    max={300}
                    value={sysBP}
                    onChange={(e) => setSysBP(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">BP Diastolic (mmHg)</label>
                  <input
                    type="number"
                    min={20}
                    max={200}
                    value={diaBP}
                    onChange={(e) => setDiaBP(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">Body Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={30}
                    max={45}
                    value={temp}
                    onChange={(e) => setTemp(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">SpO2 Oxygen (%)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={spO2}
                    onChange={(e) => setSpO2(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={500}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">Water Intake (mL)</label>
                  <input
                    type="number"
                    min={0}
                    max={20000}
                    value={water}
                    onChange={(e) => setWater(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">Sleep (hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={24}
                    value={sleep}
                    onChange={(e) => setSleep(Number(e.target.value))}
                    required
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">Current Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value as any)}
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-white/10 text-white"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Fatigued">Fatigued</option>
                    <option value="Unwell">Unwell</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg transition"
                >
                  Save Vitals to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
