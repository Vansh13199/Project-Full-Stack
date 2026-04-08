import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, Camera, MapPin, Shield, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// Generate a device fingerprint from browser properties
function generateDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = "14px 'Arial'";
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('fingerprint', 2, 15);
  const canvasData = canvas.toDataURL();

  const raw = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency,
    canvasData.slice(-50),
  ].join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'FP-' + Math.abs(hash).toString(36).toUpperCase();
}

export default function StudentScanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [gpsStatus, setGpsStatus] = useState('pending'); // 'pending', 'acquired', 'failed'
  const [studentLocation, setStudentLocation] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const deviceFP = useRef(generateDeviceFingerprint());

  // Check for session in URL params (from QR link)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionFromUrl = params.get('session');
    if (sessionFromUrl && status === 'idle') {
      acquireLocationThenMark(sessionFromUrl);
    }
  }, [location.search]);

  const acquireLocationThenMark = (sessionId) => {
    setStatus('loading');
    setMessage('Acquiring your location...');
    setGpsStatus('pending');

    const geoOptions = { 
      enableHighAccuracy: true, 
      timeout: 30000, // 30 seconds
      maximumAge: 0 
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStudentLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGpsStatus('acquired');
        markAttendance(sessionId, pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Location failed:', err);
        setGpsStatus('failed');
        setStatus('error');
        
        switch(err.code) {
          case 1: // PERMISSION_DENIED
            setMessage('Location access denied. Please allow location permissions in your browser settings and try again.');
            break;
          case 2: // POSITION_UNAVAILABLE
            setMessage('Location information is unavailable. Ensure your device GPS is turned on.');
            break;
          case 3: // TIMEOUT
            setMessage('GPS took too long to acquire a signal. try moving near a window or an open area.');
            break;
          default:
            setMessage('An unknown error occurred while acquiring location.');
        }
      },
      geoOptions
    );
  };

  const markAttendance = async (sessionId, lat, lon) => {
    stopCamera();
    setStatus('loading');
    setMessage('Marking attendance...');

    try {
      const body = {
        sessionId,
        studentEmail: user?.email,
        deviceFingerprint: deviceFP.current,
      };
      if (lat !== null && lon !== null) {
        body.latitude = lat;
        body.longitude = lon;
      }

      const response = await fetch(`http://${window.location.hostname}:3000/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(`Attendance marked for ${data.subjectName || 'class'}!`);
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startScanning = async () => {
    setStatus('scanning');
    setMessage('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        scanWithBarcodeDetector(detector);
      } else {
        setStatus('error');
        setMessage('Your browser does not support native QR scanning. Please use Chrome on Android or Safari on iOS.');
        stopCamera();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('error');
      if (err.name === 'NotAllowedError') {
        setMessage('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setMessage('No camera found on this device.');
      } else {
        setMessage('Could not access camera: ' + err.message);
      }
    }
  };

  const extractSessionId = (rawValue) => {
    try {
      const url = new URL(rawValue);
      const session = url.searchParams.get('session');
      if (session) return session;
    } catch {}
    return rawValue;
  };

  const scanWithBarcodeDetector = (detector) => {
    const tick = async () => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(() => scanWithBarcodeDetector(detector));
        return;
      }

      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const sessionId = extractSessionId(barcodes[0].rawValue);
          acquireLocationThenMark(sessionId);
          return;
        }
      } catch {}

      animFrameRef.current = requestAnimationFrame(() => scanWithBarcodeDetector(detector));
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="bg-slate-50 min-h-screen relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
      </div>

      <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button onClick={() => { stopCamera(); navigate('/dashboard'); }} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer">
              <ArrowLeft size={18} /> Back
            </button>
            <div className="font-semibold text-gray-800">Mark Attendance</div>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-8 mt-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden text-center p-6">

          {/* Security badges */}
          <div className="flex justify-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"><MapPin size={12} /> GPS Verified</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700"><Shield size={12} /> Device ID: {deviceFP.current.slice(0, 8)}</span>
          </div>

          {/* IDLE STATE */}
          {status === 'idle' && (
            <div className="py-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-6">
                <Camera size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Scan QR Code</h3>
              <p className="text-gray-500 text-sm mb-8 px-4">
                Tap below to open your camera. Your location and device ID will be verified for security.
              </p>
              <button
                onClick={startScanning}
                className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-4 rounded-xl font-bold text-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Camera size={22} /> Open Camera
              </button>
            </div>
          )}

          {/* SCANNING STATE */}
          {status === 'scanning' && (
            <div className="flex flex-col items-center">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black mb-4">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-scan-line"></div>
                  </div>
                </div>
              </div>
              <p className="text-gray-500 text-sm animate-pulse mb-2">Point at the QR code...</p>
              <button onClick={() => { stopCamera(); setStatus('idle'); }} className="text-red-500 hover:text-red-700 text-sm font-medium cursor-pointer mt-2">Cancel</button>
            </div>
          )}

          {/* LOADING STATE */}
          {status === 'loading' && (
            <div className="py-12 flex flex-col items-center">
              <Loader2 size={48} className="animate-spin text-indigo-500 mb-5" />
              <p className="text-gray-700 font-medium text-lg">{message}</p>
              <div className="flex justify-center gap-3 mt-4">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${gpsStatus === 'acquired' ? 'bg-green-50 text-green-700' : gpsStatus === 'failed' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'}`}>
                  <MapPin size={12} /> {gpsStatus === 'acquired' ? 'GPS ✓' : gpsStatus === 'failed' ? 'GPS Skipped' : 'Locating...'}
                </span>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <div className="py-8 flex flex-col items-center">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-5">
                <CheckCircle size={56} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">You're In!</h3>
              <p className="text-green-700 bg-green-50 px-5 py-2.5 rounded-lg font-medium text-sm">{message}</p>
              <button onClick={() => navigate('/dashboard')} className="mt-10 bg-indigo-600 hover:bg-indigo-700 text-white w-full py-4 rounded-xl font-bold text-lg shadow-md transition-colors cursor-pointer">
                Return to Dashboard
              </button>
            </div>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <div className="py-8 flex flex-col items-center">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-5">
                <XCircle size={56} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h3>
              <p className="text-red-700 bg-red-50 px-5 py-2.5 rounded-lg font-medium text-sm">{message}</p>
              <button onClick={() => { setStatus('idle'); setMessage(''); }} className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white w-full py-4 rounded-xl font-bold text-lg shadow-md transition-colors cursor-pointer">
                Try Again
              </button>
              <button onClick={() => navigate('/dashboard')} className="mt-3 text-gray-500 hover:text-gray-700 font-medium cursor-pointer">
                Back to Dashboard
              </button>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
}
