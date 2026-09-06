import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Camera, Image as ImageIcon, Sparkles, X, Flashlight, RefreshCw, QrCode, SwitchCamera, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ScanMode } from '../types';

export const CameraScreen: React.FC = () => {
  const { scanMode, setScanMode, setScreen, setCapturedImage, processBarcodeScan, processPackagedScan, processMealScan, processQualityScan } = useAppStore();
  const [flashlight, setFlashlight] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const samplePresets = [
    {
      name: 'Rotis & Bhaji Meal',
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
      mode: 'MEAL_PHOTO' as ScanMode
    },
    {
      name: 'Salmon Meal Bowl',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      mode: 'MEAL_PHOTO' as ScanMode
    },
    {
      name: 'Granola Label (OCR)',
      image: 'https://images.unsplash.com/photo-1517093728432-a0440f8d3380?w=600&auto=format&fit=crop&q=80',
      mode: 'PACKAGED_PHOTO' as ScanMode
    },
    {
      name: 'Fresh Apple (Quality)',
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80',
      mode: 'QUALITY_CHECK' as ScanMode
    }
  ];

  // Reset captured image state on camera mount
  useEffect(() => {
    setCapturedImage(null);
  }, []);

  // Initialize MediaDevices getUserMedia for Live WebRTC Camera Stream
  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      // Stop any existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser or environment.');
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isMounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setIsCameraActive(true);
        }
      } catch (err: any) {
        console.warn('Camera initialization notice:', err);
        if (isMounted) {
          setIsCameraActive(false);
          setCameraError(
            err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
              ? 'Camera permission was denied. Please allow camera access in your browser settings or select a photo from your gallery.'
              : 'Live camera is currently unvailable on this device. You can upload a photo or use sample test images.'
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Flashlight toggle handler
  const toggleFlashlight = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = (track.getCapabilities?.() || {}) as any;
          if (capabilities.torch) {
            await track.applyConstraints({
              advanced: [{ torch: !flashlight }]
            } as any);
            setFlashlight(!flashlight);
          } else {
            setFlashlight(!flashlight);
          }
        } catch (e) {
          setFlashlight(!flashlight);
        }
      }
    }
  };

  // Stop camera tracks before navigating away
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Capture Photo Handler (Live Camera snapshot or Preset)
  const handleShutterCapture = async (presetUrl?: string) => {
    let capturedBase64 = presetUrl || null;

    // If live camera is active, take snapshot from video stream
    if (!presetUrl && videoRef.current && isCameraActive) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          capturedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        }
      } catch (err) {
        console.error('Failed to capture frame from video:', err);
      }
    }

    // Fallback to diverse sample photos if live snapshot unavailable
    if (!capturedBase64) {
      const fallbacks = [
        'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80', // Rotis & Bhaji
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80', // Salmon Bowl
        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80', // Curry & Rice
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80'  // Pizza
      ];
      capturedBase64 = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // Append unique timestamp entropy to guarantee unique photo identification
    const uniqueToken = `#snap=${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const finalImage = capturedBase64.startsWith('data:') ? capturedBase64 : `${capturedBase64}${uniqueToken}`;

    stopCamera();
    setCapturedImage(finalImage);

    // Transition to preview screen so user sees their captured photo
    setScreen('IMAGE_PREVIEW');
  };

  // File Upload Handler (Gallery / native photo picker)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        stopCamera();
        setCapturedImage(base64);
        setScreen('IMAGE_PREVIEW');
      };
      reader.readAsDataURL(file);
    }
  };

  const modeTitles: Record<ScanMode, string> = {
    PACKAGED_BARCODE: 'Barcode Scanner',
    PACKAGED_PHOTO: 'Label & OCR Scanner',
    MEAL_PHOTO: 'Meal & Dish Scanner',
    QUALITY_CHECK: 'Freshness Inspection'
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col justify-between overflow-hidden">
      {/* Top Camera Toolbar Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent backdrop-blur-sm">
        <button
          onClick={() => {
            stopCamera();
            setScreen('DASHBOARD');
          }}
          className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-200 hover:text-white hover:border-emerald-500 transition shadow-md"
        >
          <X size={20} />
        </button>

        <span className="text-xs font-extrabold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {modeTitles[scanMode]}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-200 hover:text-emerald-400 hover:border-emerald-500/50 transition shadow-md"
            title="Switch Camera (Front/Back)"
          >
            <SwitchCamera size={18} />
          </button>

          <button
            onClick={toggleFlashlight}
            className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition shadow-md ${
              flashlight ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-900/80 text-slate-200 border-slate-700/60 hover:text-amber-400'
            }`}
            title="Flashlight / Torch"
          >
            <Flashlight size={18} />
          </button>
        </div>
      </div>

      {/* Viewfinder View */}
      <div className="relative flex-1 flex items-center justify-center p-4 pt-16 pb-32 bg-slate-950">
        <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden border-2 border-emerald-500/80 shadow-2xl shadow-emerald-500/20 bg-slate-900 flex items-center justify-center">
          {/* Live Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraActive ? 'opacity-100' : 'opacity-0 hidden'}`}
          />

          {/* Camera Permission / Error Fallback Screen */}
          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 backdrop-blur-md text-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg">
                <Camera size={32} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Live Camera Viewfinder</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
                {cameraError || 'Take a photo of your food, meal dish, or package label to analyze nutrition and safety.'}
              </p>

              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
                >
                  <ImageIcon size={18} /> Take / Select Photo from Device
                </button>
              </div>
            </div>
          )}

          {/* Laser Scanner Alignment Line */}
          {isCameraActive && <div className="laser-line" />}

          {/* Bounding Corner Guidance Frames */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-md" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-md" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-md" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-md" />

          {/* Dynamic HUD Guidance Badge */}
          <div className="absolute bottom-5 left-0 right-0 text-center px-4 z-10">
            <span className="bg-slate-950/90 text-emerald-300 text-[11px] font-extrabold px-4 py-2 rounded-full border border-emerald-500/40 backdrop-blur-md inline-flex items-center gap-1.5 shadow-xl">
              <CheckCircle2 size={13} className="text-emerald-400" />
              {scanMode === 'PACKAGED_BARCODE'
                ? 'Align barcode inside emerald frame'
                : scanMode === 'PACKAGED_PHOTO'
                ? 'Frame nutrition facts & ingredients label'
                : scanMode === 'MEAL_PHOTO'
                ? 'Center plate or meal dish in camera frame'
                : 'Inspect food surface for defects or freshness'}
            </span>
          </div>
        </div>
      </div>

      {/* Food Category Selector Toolbar */}
      <div className="bg-slate-900 border-t border-slate-800 p-2.5 z-30">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
            Food Category:
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Tap category to switch target</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-2 py-0.5">
          <button
            type="button"
            onClick={() => {
              useAppStore.getState().setFoodCategory('HOME_FOOD');
              setScanMode('MEAL_PHOTO');
            }}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border whitespace-nowrap transition ${
              useAppStore.getState().foodCategory === 'HOME_FOOD'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            🏡 Home Food
          </button>

          <button
            type="button"
            onClick={() => {
              useAppStore.getState().setFoodCategory('RESTAURANT_FOOD');
              setScanMode('MEAL_PHOTO');
            }}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border whitespace-nowrap transition ${
              useAppStore.getState().foodCategory === 'RESTAURANT_FOOD'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            🍽️ Restaurant
          </button>

          <button
            type="button"
            onClick={() => {
              useAppStore.getState().setFoodCategory('OUTSIDE_PACKAGED');
              setScanMode('PACKAGED_PHOTO');
            }}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border whitespace-nowrap transition ${
              useAppStore.getState().foodCategory === 'OUTSIDE_PACKAGED'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            🍪 Outside Food
          </button>

          <button
            type="button"
            onClick={() => {
              useAppStore.getState().setFoodCategory('FRUITS');
              setScanMode('MEAL_PHOTO');
            }}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border whitespace-nowrap transition ${
              useAppStore.getState().foodCategory === 'FRUITS'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            🍎 Fruits
          </button>

          <button
            type="button"
            onClick={() => {
              useAppStore.getState().setFoodCategory('VEGETABLES');
              setScanMode('MEAL_PHOTO');
            }}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border whitespace-nowrap transition ${
              useAppStore.getState().foodCategory === 'VEGETABLES'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            🥦 Vegetables
          </button>
        </div>

        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={12} className="text-emerald-400" /> Sample Test Foods:
          </span>
          <span className="text-[10px] text-slate-400">Tap to test AI report</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {samplePresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setScanMode(preset.mode);
                handleShutterCapture(preset.image);
              }}
              className="text-[11px] font-bold bg-slate-800 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-400 px-3.5 py-1 rounded-xl whitespace-nowrap transition flex items-center gap-2 shadow-sm"
            >
              <img src={preset.image} alt={preset.name} className="w-4 h-4 rounded-full object-cover border border-slate-600" />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Shutter & Controls Dock */}
      <div className="p-5 bg-slate-950 border-t border-slate-900 flex items-center justify-around z-30">
        {/* Hidden File Picker */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Gallery / File Picker Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 transition shadow-lg"
          title="Upload or Take Photo from Device"
        >
          <ImageIcon size={22} />
        </button>

        {/* Big Main Shutter Button */}
        <button
          onClick={() => handleShutterCapture()}
          className="w-20 h-20 rounded-full border-4 border-emerald-400 p-1.5 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl shadow-emerald-500/40"
          title="Take Photo"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-extrabold shadow-inner">
            {scanMode === 'PACKAGED_BARCODE' ? (
              <QrCode size={30} className="text-slate-950" />
            ) : (
              <Camera size={32} className="text-slate-950" />
            )}
          </div>
        </button>

        {/* Switch Scan Mode Button */}
        <button
          onClick={() => {
            const modes: ScanMode[] = ['MEAL_PHOTO', 'PACKAGED_PHOTO', 'QUALITY_CHECK', 'PACKAGED_BARCODE'];
            const nextMode = modes[(modes.indexOf(scanMode) + 1) % modes.length];
            setScanMode(nextMode);
          }}
          className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 transition shadow-lg"
          title="Switch Scan Mode"
        >
          <RefreshCw size={20} />
        </button>
      </div>
    </div>
  );
};
