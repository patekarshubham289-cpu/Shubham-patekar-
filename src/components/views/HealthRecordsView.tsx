import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { VitalLog } from '../../types';
import {
  LineChart,
  Activity,
  Heart,
  Droplets,
  Plus,
  Download,
  Wind,
  Edit,
  Trash2,
  X
} from 'lucide-react';

type ChartMetric = 'heartRate' | 'bloodPressure' | 'bloodSugar' | 'spO2' | 'weightKg';

export const HealthRecordsView: React.FC = () => {
  const { vitalLogs, addVitalLog, editVitalLog, removeVitalLog, latestVital, user, showToast } = useApp();
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<VitalLog | null>(null);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('heartRate');

  // Form State
  const [heartRate, setHeartRate] = useState(72);
  const [sysBP, setSysBP] = useState(118);
  const [diaBP, setDiaBP] = useState(78);
  const [sugar, setSugar] = useState(95);
  const [weight, setWeight] = useState(user.weightKg || 72);
  const [temp, setTemp] = useState(36.6);
  const [spO2, setSpO2] = useState(99);
  const [water, setWater] = useState(2000);
  const [sleep, setSleep] = useState(7.5);
  const [mood, setMood] = useState<'Excellent' | 'Good' | 'Neutral' | 'Fatigued' | 'Unwell'>('Good');

  const openAddModal = () => {
    setEditingLog(null);
    setHeartRate(latestVital?.heartRate ?? 72);
    setSysBP(latestVital?.bloodPressureSys ?? 118);
    setDiaBP(latestVital?.bloodPressureDia ?? 78);
    setSugar(latestVital?.bloodSugar ?? 95);
    setWeight(latestVital?.weightKg ?? user.weightKg ?? 72);
    setTemp(latestVital?.temperatureC ?? 36.6);
    setSpO2(latestVital?.spO2 ?? 99);
    setWater(latestVital?.waterIntakeMl ?? 2000);
    setSleep(latestVital?.sleepHours ?? 7.5);
    setMood(latestVital?.mood ?? 'Good');
    setShowLogModal(true);
  };

  const openEditModal = (log: VitalLog) => {
    setEditingLog(log);
    setHeartRate(log.heartRate);
    setSysBP(log.bloodPressureSys);
    setDiaBP(log.bloodPressureDia);
    setSugar(log.bloodSugar);
    setWeight(log.weightKg || user.weightKg || 70);
    setTemp(log.temperatureC || 36.6);
    setSpO2(log.spO2);
    setWater(log.waterIntakeMl || 0);
    setSleep(log.sleepHours || 7);
    setMood(log.mood);
    setShowLogModal(true);
  };

  const handleSaveVital = async (e: React.FormEvent) => {
    e.preventDefault();
    const heightM = (user.heightCm || 170) / 100;
    const computedBmi = Number((weight / (heightM * heightM)).toFixed(1));
    const payload = {
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
    };

    if (editingLog) {
      await editVitalLog(editingLog.id, payload);
    } else {
      await addVitalLog(payload);
    }
    setShowLogModal(false);
    setEditingLog(null);
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
          `- ${new Date(v.timestamp).toLocaleString()} | HR: ${v.heartRate} bpm | BP: ${v.bloodPressureSys}/${v.bloodPressureDia} mmHg | Glucose: ${v.bloodSugar} mg/dL | SpO2: ${v.spO2}% | Weight: ${v.weightKg}kg | Temp: ${v.temperatureC}°C | Mood: ${v.mood}`
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

  const chartLogs = vitalLogs.slice(0, 10).reverse();

  const metricConfig: Record<
    ChartMetric,
    { label: string; unit: string; maxVal: number; minVal: number; color: string }
  > = {
    heartRate: { label: 'Heart Rate', unit: 'bpm', maxVal: 140, minVal: 40, color: 'from-red-500 to-rose-400' },
    bloodPressure: { label: 'Blood Pressure (Sys/Dia)', unit: 'mmHg', maxVal: 180, minVal: 50, color: 'from-amber-500 to-yellow-400' },
    bloodSugar: { label: 'Blood Glucose', unit: 'mg/dL', maxVal: 240, minVal: 50, color: 'from-cyan-500 to-sky-400' },
    spO2: { label: 'Oxygen Saturation', unit: '%', maxVal: 100, minVal: 85, color: 'from-purple-500 to-violet-400' },
    weightKg: { label: 'Weight', unit: 'kg', maxVal: 150, minVal: 30, color: 'from-emerald-500 to-teal-400' },
  };

  const activeCfg = metricConfig[chartMetric];

  const getMetricValue = (log: VitalLog): number => {
    if (chartMetric === 'bloodPressure') return log.bloodPressureSys;
    if (chartMetric === 'bloodSugar') return log.bloodSugar;
    if (chartMetric === 'spO2') return log.spO2;
    if (chartMetric === 'weightKg') return log.weightKg || user.weightKg || 70;
    return log.heartRate;
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#12221b] to-[#181818] border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <LineChart className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
              FIRESTORE HEALTH VAULT
            </span>
            <h1 className="text-2xl font-black text-white">Health Vitals &amp; Records</h1>
            <p className="text-xs text-neutral-300">
              Track, edit, analyze multi-metric trends &amp; export clinical summaries
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
            onClick={openAddModal}
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

      {/* Interactive Multi-Metric Trend Chart */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
              {activeCfg.label} Trend
            </h3>
            <p className="text-[11px] text-neutral-500">Last {chartLogs.length} Firestore readings</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'heartRate', label: 'Heart Rate' },
                { id: 'bloodPressure', label: 'Blood Pressure' },
                { id: 'bloodSugar', label: 'Blood Sugar' },
                { id: 'spO2', label: 'SpO2' },
                { id: 'weightKg', label: 'Weight' },
              ] as { id: ChartMetric; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setChartMetric(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition ${
                  chartMetric === tab.id
                    ? 'bg-emerald-500 text-white shadow'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {chartLogs.length === 0 ? (
          <p className="text-xs text-neutral-400 py-8 text-center">
            No vital records found yet. Click &quot;Record Vitals&quot; above to add your first measurement.
          </p>
        ) : (
          <div className="h-48 w-full flex items-end justify-between gap-2.5 pt-6 px-2 overflow-x-auto">
            {chartLogs.map((log) => {
              const rawVal = getMetricValue(log);
              const pct = Math.max(
                14,
                Math.min(100, ((rawVal - activeCfg.minVal) / (activeCfg.maxVal - activeCfg.minVal)) * 100)
              );
              const labelValue =
                chartMetric === 'bloodPressure'
                  ? `${log.bloodPressureSys}/${log.bloodPressureDia}`
                  : `${rawVal}`;

              return (
                <div key={log.id} className="flex-1 min-w-[44px] flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-emerald-400 whitespace-nowrap">
                    {labelValue}
                  </span>
                  <div className="w-full max-w-[36px] bg-neutral-900 rounded-t-xl h-32 flex items-end p-1 border border-white/5">
                    <div
                      className={`w-full rounded-t-lg bg-gradient-to-t ${activeCfg.color} transition-all duration-500`}
                      style={{ height: `${pct}%` }}
                      title={`${activeCfg.label}: ${labelValue} ${activeCfg.unit}`}
                    ></div>
                  </div>
                  <span className="text-[9px] text-neutral-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
                  <th className="pb-3 pr-3">Date &amp; Time</th>
                  <th className="pb-3 pr-3">Pulse</th>
                  <th className="pb-3 pr-3">BP</th>
                  <th className="pb-3 pr-3">Sugar</th>
                  <th className="pb-3 pr-3">Weight</th>
                  <th className="pb-3 pr-3">SpO2</th>
                  <th className="pb-3 pr-3">Mood</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {vitalLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-900/50 transition">
                    <td className="py-3 pr-3 font-semibold text-white whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()}{' '}
                      <span className="text-neutral-400 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-bold text-red-400">{log.heartRate} bpm</td>
                    <td className="py-3 pr-3 font-bold text-amber-400">
                      {log.bloodPressureSys}/{log.bloodPressureDia}
                    </td>
                    <td className="py-3 pr-3 font-bold text-cyan-400">{log.bloodSugar} mg/dL</td>
                    <td className="py-3 pr-3 font-semibold text-neutral-300">{log.weightKg || '--'} kg</td>
                    <td className="py-3 pr-3 font-semibold text-purple-400">{log.spO2}%</td>
                    <td className="py-3 pr-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                        {log.mood}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(log)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-emerald-400 border border-white/10 transition"
                          title="Edit vital log"
                          aria-label="Edit vital log"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeVitalLog(log.id)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-white/10 transition"
                          title="Delete vital log"
                          aria-label="Delete vital log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to Add or Edit Vitals */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#181818] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowLogModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white mb-4">
              {editingLog ? 'Edit Vital Measurement' : 'Record New Vitals'}
            </h3>

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
                  {editingLog ? 'Update Vital Record' : 'Save Vitals to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
