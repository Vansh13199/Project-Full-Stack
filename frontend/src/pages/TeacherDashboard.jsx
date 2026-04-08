import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ClipboardList, LogOut, Loader2, AlertTriangle, RefreshCw, ChevronDown, CheckCircle, Clock, MapPin, Users, BookOpen, Calendar } from 'lucide-react';
import { getSubjectDisplayName } from '../utils/subjectMap';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [activeSubjectName, setActiveSubjectName] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle', 'acquiring', 'acquired', 'failed'
  const [teacherLocation, setTeacherLocation] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'schedule'
  const timerRef = useRef(null);

  useEffect(() => {
    fetchSubjects();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!expiresAt) return;
    
    const tick = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setSessionId(null);
        setExpiresAt(null);
        setActiveSubjectName('');
        setError('Session expired! Generate a new one.');
      }
    };
    
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [expiresAt]);

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const [subjectsRes, timetableRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:3000/api/subjects/list?teacherEmail=${encodeURIComponent(user?.email)}`),
        fetch(`http://${window.location.hostname}:3000/api/timetable`)
      ]);
      
      const subjectsData = await subjectsRes.json();
      const timetableData = await timetableRes.json();
      
      if (subjectsRes.ok) setSubjects(subjectsData.subjects || []);
      if (timetableRes.ok) setTimetable(timetableData.timetable || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const acquireLocation = () => {
    setLocationStatus('acquiring');
    setError('');

    const geoOptions = { 
      enableHighAccuracy: true, 
      timeout: 30000, // 30 seconds
      maximumAge: 0 
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTeacherLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationStatus('acquired');
      },
      (err) => {
        console.error('Location error:', err);
        setLocationStatus('failed');
        
        switch(err.code) {
          case 1: // PERMISSION_DENIED
            setError('Location permissions are blocked. Please enable them in your browser settings to start a GPS-verified session.');
            break;
          case 3: // TIMEOUT
            setError('Geolocation timed out. Please ensure you are not indoors with poor signal or try again.');
            break;
          default:
            setError('Could not acquire location. You can still generate a QR code, but distance verification will be disabled for students.');
        }
      },
      geoOptions
    );
  };

  const generateSession = async () => {
    if (!selectedSubject) {
      setError('Please select a subject first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const body = {
        teacherEmail: user?.email,
        subjectId: selectedSubject,
      };
      if (teacherLocation) {
        body.latitude = teacherLocation.latitude;
        body.longitude = teacherLocation.longitude;
      }

      const response = await fetch(`http://${window.location.hostname}:3000/api/attendance/generate-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (response.ok) {
        setSessionId(data.sessionId);
        setActiveSubjectName(data.subjectName);
        setExpiresAt(data.expiresAt);
      } else {
        setError(data.message || 'Failed to generate session');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while generating session');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerPercent = expiresAt ? (timeLeft / (10 * 60)) * 100 : 0;
  const timerColor = timeLeft > 180 ? 'text-green-600' : timeLeft > 60 ? 'text-amber-500' : 'text-red-500';
  const barColor = timeLeft > 180 ? 'bg-green-500' : timeLeft > 60 ? 'bg-amber-500' : 'bg-red-500';

  const isTeacherSubject = (code, title) => {
    return subjects.some(s => s.subjectName === code || s.subjectName === title);
  };

  const renderSchedule = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const currentDay = days[new Date().getDay() - 1]; // getDay() returns 0 for Sunday
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-500"/>
            <h2 className="text-lg font-semibold text-gray-800">My Weekly Schedule</h2>
          </div>
          <p className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
            AUTO-FILTERED FOR YOUR SUBJECTS
          </p>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {days.map(day => {
              const myClasses = timetable.filter(t => t.day === day && isTeacherSubject(t.subjectCode, t.subjectTitle));
              const isToday = day === currentDay;
              
              if (myClasses.length === 0) return null;
              
              return (
                <div key={day} className={`w-64 border rounded-xl overflow-hidden shadow-sm flex-shrink-0 transition-all ${isToday ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`font-semibold py-2 text-center text-sm uppercase tracking-wide flex items-center justify-center gap-2 ${isToday ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-gray-600'}`}>
                    {isToday && <Clock size={14} className="animate-pulse" />}
                    {day} {isToday && '(Today)'}
                  </div>
                  <div className="p-3 space-y-3">
                    {myClasses.map((cls, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col gap-1 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${cls.subjectType === 'P' ? 'bg-amber-400' : cls.subjectType === 'T' ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
                        <div className="flex items-center justify-between">
                           <div className="font-bold text-gray-800 text-xs leading-tight pr-2">
                             {getSubjectDisplayName(cls.subjectCode)}
                           </div>
                           <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                             {cls.subjectType === 'P' ? 'PR' : cls.subjectType === 'T' ? 'TU' : 'LE'}
                           </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600 font-medium mt-1">
                          <Clock size={12} className="mr-1 text-gray-400"/> {cls.time}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                           <div className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100 font-medium">{cls.group}</div>
                           <button 
                             onClick={() => {
                               const subj = subjects.find(s => s.subjectName === cls.subjectCode || s.subjectName === cls.subjectTitle);
                               if (subj) {
                                 setSelectedSubject(subj.subjectId);
                                 setActiveTab('attendance');
                               }
                             }}
                             className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             TAKE ATTENDANCE
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-lg">
                        <ClipboardList size={20} />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                        AttendanceMS
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                      onClick={() => navigate('/manage-subjects')}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-sm border border-indigo-200 hover:border-indigo-300 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                        <BookOpen size={16} /> Subjects
                    </button>
                    <button 
                      onClick={() => navigate('/view-attendance')}
                      className="text-emerald-600 hover:text-emerald-800 font-medium text-sm border border-emerald-200 hover:border-emerald-300 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                        <Users size={16} /> Students
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm">
                            {user?.name ? user.name[0].toUpperCase() : 'T'}
                        </div>
                        <div className="hidden md:block">
                            <div className="text-sm font-medium text-gray-900">{user?.name || 'Teacher'}</div>
                            <div className="text-xs text-gray-500">Teacher</div>
                        </div>
                    </div>
                    <button onClick={logout} className="text-gray-500 hover:text-red-600 font-medium text-sm border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1 cursor-pointer">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-drop-in">
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                Teacher Dashboard
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                    TEACHER
                </span>
            </h1>
            <p className="text-gray-500 mt-1">Manage your sessions and view your dynamic schedule.</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
           <button 
             onClick={() => setActiveTab('attendance')}
             className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'attendance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
           >
             <QrCode size={18} /> QR Attendance
           </button>
           <button 
             onClick={() => setActiveTab('schedule')}
             className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'schedule' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
           >
             <Calendar size={18} /> My Schedule
           </button>
        </div>

        {activeTab === 'schedule' && renderSchedule()}

        {activeTab === 'attendance' && (
        <div className="flex flex-col items-center justify-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-4 animate-scale-in">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4">
            <QrCode size={32} />
          </div>
          <h2 className="text-xl font-semibold mb-2">QR Code Attendance</h2>
          <p className="text-gray-500 text-center max-w-md mb-6">
            Select a subject, enable location tracking, then generate a 10-minute QR session.
          </p>

          {/* Subject Selector + Location */}
          {!sessionId && (
            <div className="w-full max-w-sm mb-6 space-y-4">
              {loadingSubjects ? (
                <div className="flex items-center justify-center py-4 text-gray-400 text-sm">Loading subjects...</div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-3">No subjects yet. Create one first.</p>
                  <button 
                    onClick={() => navigate('/manage-subjects')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 cursor-pointer mx-auto"
                  >
                    <BookOpen size={16} /> Create Subject
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
                    <div className="relative">
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors outline-none appearance-none bg-white cursor-pointer pr-10"
                      >
                        <option value="">— Choose a subject —</option>
                        {subjects.map(s => (
                          <option key={s.subjectId} value={s.subjectId}>{getSubjectDisplayName(s.subjectName)}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Location Button */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location Verification</label>
                    <button
                      type="button"
                      onClick={acquireLocation}
                      disabled={locationStatus === 'acquired'}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        locationStatus === 'acquired'
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : locationStatus === 'acquiring'
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : locationStatus === 'failed'
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <MapPin size={16} />
                      {locationStatus === 'idle' && 'Enable Location Verification'}
                      {locationStatus === 'acquiring' && 'Acquiring GPS...'}
                      {locationStatus === 'acquired' && `✓ Location Locked (${teacherLocation?.latitude.toFixed(4)}, ${teacherLocation?.longitude.toFixed(4)})`}
                      {locationStatus === 'failed' && 'Location Failed — Tap to Retry'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">Students must be within 100m of this location.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {!sessionId && subjects.length > 0 && (
             <button 
               onClick={generateSession} 
               disabled={loading || !selectedSubject}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {loading ? <RefreshCw className="animate-spin" size={20}/> : <QrCode size={20} />} 
                {loading ? 'Generating...' : 'Generate QR Code'}
             </button>
          )}

          {sessionId && (
            <div className="flex flex-col items-center w-full max-w-md">
               <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-lg mb-4 text-center">
                 {getSubjectDisplayName(activeSubjectName)}
               </div>

               <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                 {/* QR Code */}
                 <div className="p-4 bg-white border-4 border-indigo-50 rounded-xl shadow-lg">
                   <QRCodeSVG value={`${window.location.origin}/mark-attendance?session=${sessionId}`} size={220} level="H" />
                 </div>

                 {/* Timer Panel */}
                 <div className="flex flex-col items-center gap-3 bg-gray-50 rounded-xl p-5 border border-gray-200 min-w-[160px]">
                   <Clock size={24} className={timerColor} />
                   <div className={`text-4xl font-mono font-bold ${timerColor} tabular-nums`}>
                     {formatTime(timeLeft)}
                   </div>
                   <div className="w-full bg-gray-200 rounded-full h-2.5">
                     <div className={`h-2.5 rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${timerPercent}%` }}></div>
                   </div>
                   <div className="text-xs text-gray-500">
                     {timeLeft > 60 ? 'Session Active' : timeLeft > 0 ? 'Expiring Soon!' : 'Expired'}
                   </div>
                   
                   {teacherLocation && (
                     <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                       <MapPin size={12} /> GPS Locked
                     </div>
                   )}
                 </div>
               </div>

               <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg font-medium mt-6">
                 <CheckCircle size={18} />
                 Session Active — {formatTime(timeLeft)} remaining
               </div>

               <button 
                 onClick={() => { 
                   clearInterval(timerRef.current);
                   setSessionId(null); 
                   setActiveSubjectName(''); 
                   setSelectedSubject(''); 
                   setExpiresAt(null); 
                   setTimeLeft(0);
                 }}
                 className="mt-4 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer"
               >
                 <RefreshCw size={16} /> New Session
               </button>
            </div>
          )}

          {error && (
             <p className="text-red-500 mt-4 text-sm font-medium flex items-center gap-1">
               <AlertTriangle size={16} /> {error}
             </p>
          )}
        </div>
        )}
      </main>
    </div>
  );
}
