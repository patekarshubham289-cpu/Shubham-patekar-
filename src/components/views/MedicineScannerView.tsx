import React, { useState, useRef, useEffect } from 'react';
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
  Trash2,
  CalendarClock
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

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const rawW = videoRef.current.videoWidth || 640;
        const rawH = videoRef.current.videoHeight || 480;
        const scale = Math.min(1, 1280 / Math.max(rawW, rawH));
        canvasRef.current.width = Math.round(rawW * scale);
        canvasRef.current.height = Math.round(rawH * scale);
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
        stopCamera();
        analyzeMedicine(dataUrl, undefined, 'image/jpeg');
      }
    }
  };

  const downscaleImageDataUrl = (file: File): Promise<{ dataUrl: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read uploaded file.'));
      reader.onloadend = () => {
        const rawUrl = reader.result as string;
        const img = new Image();
        img.onerror = () => resolve({ dataUrl: rawUrl, mimeType: file.type || 'image/jpeg' });
        img.onload = () => {
          const maxDim = 1280;
          if (img.width <= maxDim && img.height <= maxDim && file.size <= 1_800_000) {
            resolve({ dataUrl: rawUrl, mimeType: file.type || 'image/jpeg' });
            return;
          }
          const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
          const offscreen = document.createElement('canvas');
          offscreen.width = Math.round(img.width * ratio);
          offscreen.height = Math.round(img.height * ratio);
          const ctx = offscreen.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: rawUrl, mimeType: file.type || 'image/jpeg' });
            return;
          }
          ctx.drawImage(img, 0, 0, offscreen.width, offscreen.height);
          resolve({ dataUrl: offscreen.toDataURL('image/jpeg', 0.85), mimeType: 'image/jpeg' });
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image exceeds 10 MB limit. Please select a smaller photo.', 'error');
      return;
    }
    try {
      const { dataUrl, mimeType } = await downscaleImageDataUrl(file);
      await analyzeMedicine(dataUrl, undefined, mimeType);
    } catch {
      showToast('Failed to process uploaded image.', 'error');
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

  const expiryUnconfirmed =
    !currentResult?.expiryDate ||
    /not visible|not legible|not applicable|inspect physical/i.test(currentResult.expiryDate);

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Title Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#1b2520] to-[#121f18] border border-emerald-500/30 shadow-2xl space-y-3">
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
              Extract composition, legible expiry date, uses, storage &amp; warnings to your Firestore vault
            </p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Medical Safety Disclaimer:</strong> Results provide general pharmaceutical reference only and are <strong>not</strong> a personal prescription. Always inspect the physical label for batch/expiry date and follow your licensed clinician&apos;s instructions.
          </span>
        </div>
      </div>

      {/* Scanner Control Hub */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
        {cameraActive ? (
          <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 aspect-video bg-black flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-8 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-400 bg-black/60 px-3 py-1 rounded-full">
                Align Medicine Box, Strip &amp; Expiry Date Here
              </span>
            </div>
            <div className="absolute bottom-4 flex gap-3 z-10">
              <button
                onClick={capturePhoto}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg flex items-center gap-2"
              >
                <Camera className="w-4 h-4" /> Capture &amp; Scan
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
              <p className="text-[11px] text-neutral-400">Capture pill strip, bottle or box label</p>
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
          <p className="text-xs font-bold text-neutral-400 mb-2">Or Search Medicine by Name</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && manualQuery.trim() && analyzeMedicine(undefined, manualQuery)}
                placeholder="e.g. Dolo 650, Augmentin 625, Crocin, Metformin, Paracetamol..."
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
          <h3 className="text-lg font-black text-amber-400">Gemini AI Analyzing Packaging &amp; Composition...</h3>
          <p className="text-xs text-neutral-400">Checking visible expiry stamp, active ingredients, warnings &amp; storage guidance.</p>
        </div>
      )}

      {currentResult && !isAnalyzing && (
        <div className="p-6 rounded-3xl bg-[#181818] border border-emerald-500/30 space-y-5 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                GEMINI PACKAGING ANALYSIS
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{currentResult.name}</h2>
              <p className="text-xs font-semibold text-amber-400 mt-0.5">
                {currentResult.composition || 'Active composition not identified — verify packaging'}
              </p>
            </div>
            <span className="text-xs font-bold text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-white/10">
              Est. Price: {currentResult.priceRange || 'Not identified'}
            </span>
          </div>

          {/* Legible Expiry Date Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              expiryUnconfirmed
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <CalendarClock
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                expiryUnconfirmed ? 'text-amber-400' : 'text-emerald-400'
              }`}
            />
            <div className="text-xs">
              <p className="font-extrabold uppercase tracking-wider text-[10px]">
                Printed Expiry Date (Extracted Only When Clearly Legible)
              </p>
              <p className="font-bold mt-0.5">
                {currentResult.expiryDate || 'Not legible / not visible — inspect physical packaging before use.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> General Uses
              </h4>
              {currentResult.uses.length === 0 ? (
                <p className="text-xs text-neutral-400">Uses not identified from provided input.</p>
              ) : (
                <ul className="space-y-1 text-xs text-neutral-300">
                  {currentResult.uses.map((use, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                      <span>{use}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4" /> General Labeling Reference (Not a Prescription)
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {currentResult.dosage || 'Consult a licensed physician or pharmacist for individualized dosing.'}
              </p>
              <p className="text-[11px] text-neutral-400 mt-2">
                <strong>Storage:</strong> {currentResult.storage || 'Check printed label for storage temperature.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Reported Side Effects
              </h4>
              {currentResult.sideEffects.length === 0 ? (
                <p className="text-xs text-neutral-400">None identified — review official medication leaflet.</p>
              ) : (
                <ul className="space-y-1 text-xs text-neutral-300">
                  {currentResult.sideEffects.map((se, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                      <span>{se}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Safety Warnings
              </h4>
              {currentResult.warnings.length === 0 ? (
                <p className="text-xs text-neutral-400">Check package leaflet &amp; consult a pharmacist.</p>
              ) : (
                <ul className="space-y-1 text-xs text-neutral-300">
                  {currentResult.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {currentResult.alternativeMedicines.length > 0 && (
            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Common Generic Ingredient Equivalents
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
          )}

          <p className="text-[11px] text-amber-300/90 italic text-center pt-2 border-t border-white/5">
            {currentResult.disclaimer ||
              'Informational labeling overview only — NOT a personal prescription. Always verify physical expiry dates and consult a licensed clinician or pharmacist.'}
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
                className="p-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 flex items-center justify-between transition gap-2"
              >
                <div onClick={() => setSelectedScan(scan)} className="flex-1 cursor-pointer min-w-0">
                  <p className="text-xs font-bold text-white truncate">{scan.name}</p>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {scan.composition} • Exp: {scan.expiryDate || 'Not visible'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (selectedScan?.id === scan.id) setSelectedScan(null);
                      removeScan(scan.id);
                    }}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition"
                    title="Delete scan"
                    aria-label={`Delete ${scan.name}`}
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
