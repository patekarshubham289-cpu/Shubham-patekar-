import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { MedicineScanResult } from '../../types';
import {
  Camera,
  Upload,
  ScanLine,
  Sparkles,
  Pill,
  AlertTriangle,
  CheckCircle2,
  Search,
  DollarSign,
  ShieldAlert,
  ChevronRight,
  Trash2
} from 'lucide-react';

export const MedicineScannerView: React.FC = () => {
  const { addScanResult, scanHistory, removeScan, showToast, getAuthToken } = useApp();
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [manualQuery, setManualQuery] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedScan, setSelectedScan] = useState<MedicineScanResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentResult = selectedScan || scanHistory[0] || null;

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      showToast('Camera access denied or unavailable. Please upload an image file instead.', 'info');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        stopCamera();
        analyzeMedicine(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        analyzeMedicine(base64, undefined, file.type || 'image/jpeg');
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeMedicine = async (
    base64Img?: string,
    queryText?: string,
    mimeType = 'image/jpeg'
  ) => {
    setIsAnalyzing(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/medicine/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType,
          manualSearchQuery: queryText || manualQuery,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || 'Scan request failed');
      }
      if (json.success && json.data) {
        const { id: _ignoreId, ...scanPayload } = json.data;
        setSelectedScan(json.data);
        await addScanResult(scanPayload);
      }
    } catch (e: any) {
      showToast(e?.message || 'Scan failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Title Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#1b2520] to-[#121f18] border border-emerald-500/30 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ScanLine className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
              GEMINI VISION AI
            </span>
            <h1 className="text-2xl font-black text-white">AI Medicine Scanner</h1>
            <p className="text-xs text-neutral-300">
              Instant composition, dosage, warnings & generic alternatives saved to your Firestore vault
            </p>
          </div>
        </div>
      </div>

      {/* Scanner Control Hub */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        {cameraActive ? (
          <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 aspect-video bg-black flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-8 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-400 bg-black/60 px-3 py-1 rounded-full">
                Align Medicine Box or Strip Here
              </span>
            </div>
            <div className="absolute bottom-4 flex gap-3 z-10">
              <button
                onClick={capturePhoto}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg flex items-center gap-2"
              >
                <Camera className="w-4 h-4" /> Capture & Scan
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={startCamera}
              className="p-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-emerald-500/30 text-center space-y-2 transition group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-sm font-extrabold text-white">Use Device Camera</p>
              <p className="text-[11px] text-neutral-400">Point lens at pill bottle, box or prescription</p>
            </button>

            <label className="p-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-center space-y-2 transition cursor-pointer group block">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-extrabold text-white">Upload Box Image</p>
              <p className="text-[11px] text-neutral-400">Select PNG, JPG, or JPEG file</p>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        <div className="pt-3 border-t border-white/10">
          <p className="text-xs font-bold text-neutral-400 mb-2">Or Search Medicine Manually</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && manualQuery.trim() && analyzeMedicine(undefined, manualQuery)}
                placeholder="e.g. Augmentin 625, Metformin, Lipitor, Paracetamol..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => analyzeMedicine(undefined, manualQuery)}
              disabled={isAnalyzing || !manualQuery.trim()}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              Analyze
            </button>
          </div>
        </div>
      </div>

      {isAnalyzing && (
        <div className="p-8 rounded-3xl bg-[#181818] border border-amber-500/40 text-center space-y-4 animate-pulse">
          <Sparkles className="w-10 h-10 text-amber-400 mx-auto animate-spin" />
          <h3 className="text-lg font-black text-amber-400">Gemini AI Analyzing Chemical Composition...</h3>
          <p className="text-xs text-neutral-400">Processing active pharmaceutical ingredients, side effects & alternatives.</p>
        </div>
      )}

      {currentResult && !isAnalyzing && (
        <div className="p-6 rounded-3xl bg-[#181818] border border-emerald-500/30 space-y-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                VERIFIED AI ANALYSIS
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{currentResult.name}</h2>
              <p className="text-xs font-semibold text-amber-400 mt-0.5">{currentResult.composition}</p>
            </div>
            <span className="text-xs font-bold text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-white/10">
              Est. Price: {currentResult.priceRange}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Primary Indications & Benefits
              </h4>
              <ul className="space-y-1 text-xs text-neutral-300">
                {currentResult.uses.map((use, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {use}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4" /> Recommended Clinical Dosage
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed">{currentResult.dosage}</p>
              <p className="text-[10px] text-neutral-500 mt-2">Storage: {currentResult.storage}</p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Reported Side Effects
              </h4>
              <ul className="space-y-1 text-xs text-neutral-300">
                {currentResult.sideEffects.map((se, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> {se}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Critical Warnings
              </h4>
              <ul className="space-y-1 text-xs text-neutral-300">
                {currentResult.warnings.map((w, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Lower-Cost Generic Alternatives
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {currentResult.alternativeMedicines.map((alt, i) => (
                <div key={i} className="p-3 rounded-xl bg-neutral-950 border border-white/5 text-xs">
                  <p className="font-bold text-white">{alt.name}</p>
                  <p className="text-emerald-400 font-semibold">{alt.approxPrice}</p>
                  <p className="text-[10px] text-neutral-400">{alt.manufacturer}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-neutral-500 italic text-center pt-2 border-t border-white/5">
            {currentResult.disclaimer}
          </p>
        </div>
      )}

      {/* History Archive */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
          Saved Medicine Scan Vault ({scanHistory.length})
        </h3>
        {scanHistory.length === 0 ? (
          <p className="text-xs text-neutral-400 py-4 text-center">
            No scanned medicines saved yet. Scan a box or search a medication above.
          </p>
        ) : (
          <div className="space-y-2">
            {scanHistory.map((scan) => (
              <div
                key={scan.id}
                className="p-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 flex items-center justify-between transition"
              >
                <div onClick={() => setSelectedScan(scan)} className="flex-1 cursor-pointer">
                  <p className="text-xs font-bold text-white">{scan.name}</p>
                  <p className="text-[10px] text-neutral-400">{scan.composition}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedScan?.id === scan.id) setSelectedScan(null);
                      removeScan(scan.id);
                    }}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition"
                    title="Delete scan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight
                    onClick={() => setSelectedScan(scan)}
                    className="w-4 h-4 text-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
