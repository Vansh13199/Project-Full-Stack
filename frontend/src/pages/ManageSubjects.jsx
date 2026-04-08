import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BookOpen, Loader2, ClipboardList, LogOut, Users, UserPlus, Trash2, Globe, CheckCircle } from 'lucide-react';
import { getSubjectDisplayName } from '../utils/subjectMap';

export default function ManageSubjects() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Enrollments State
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [enrollments, setEnrollments] = useState({});
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState({});

  // Global Enrollment State
  const [globalEnrollEmail, setGlobalEnrollEmail] = useState('');
  const [globalEnrolling, setGlobalEnrolling] = useState(false);
  const [globalEnrollError, setGlobalEnrollError] = useState('');
  const [globalEnrollSuccess, setGlobalEnrollSuccess] = useState('');

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/api/subjects/list?teacherEmail=${encodeURIComponent(user?.email)}`);
      const data = await response.json();
      if (response.ok) {
        setSubjects(data.subjects || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchEnrollments = async (subjectId) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/subjects/enrollments?subjectId=${subjectId}`);
      const data = await res.json();
      if (res.ok) {
        setEnrollments(prev => ({ ...prev, [subjectId]: data.enrollments || [] }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSubject = (subjectId) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subjectId);
      setEnrollEmail('');
      setEnrollError({});
      if (!enrollments[subjectId]) {
        fetchEnrollments(subjectId);
      }
    }
  };

  const handleEnroll = async (e, subjectId) => {
    e.preventDefault();
    if (!enrollEmail.trim()) return;

    setEnrolling(true);
    setEnrollError({});

    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/subjects/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: user?.email,
          subjectId,
          studentEmail: enrollEmail.trim()
        })
      });
      const data = await res.json();

      if (res.ok) {
        setEnrollEmail('');
        fetchEnrollments(subjectId);
      } else {
        setEnrollError({ [subjectId]: data.message || 'Failed to enroll student' });
      }
    } catch (err) {
        setEnrollError({ [subjectId]: 'Network error while enrolling student' });
    } finally {
      setEnrolling(false);
    }
  };

  const handleGlobalEnroll = async (e) => {
    e.preventDefault();
    if (!globalEnrollEmail.trim()) return;

    setGlobalEnrolling(true);
    setGlobalEnrollError('');
    setGlobalEnrollSuccess('');

    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/subjects/enroll-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: user?.email,
          studentEmail: globalEnrollEmail.trim()
        })
      });
      const data = await res.json();

      if (res.ok) {
          setGlobalEnrollSuccess(data.message);
          setGlobalEnrollEmail('');
          // Refresh all expanded subject lists
          Object.keys(enrollments).forEach(id => fetchEnrollments(id));
          setTimeout(() => setGlobalEnrollSuccess(''), 5000);
      } else {
          setGlobalEnrollError(data.message || 'Failed to enroll student');
      }
    } catch (err) {
        setGlobalEnrollError('Network error while performing bulk enrollment');
    } finally {
        setGlobalEnrolling(false);
    }
  };

  const handleUnenroll = async (subjectId, studentEmail) => {
    if (!window.confirm(`Are you sure you want to remove ${studentEmail} from this subject?`)) return;

    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/subjects/unenroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          studentEmail,
          teacherEmail: user?.email
        })
      });

      if (res.ok) {
        fetchEnrollments(subjectId);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to remove student');
      }
    } catch (err) {
      alert('Network error while removing student');
    }
  };

  const subjectColors = [
    'bg-blue-50 border-blue-200 text-blue-800',
    'bg-purple-50 border-purple-200 text-purple-800',
    'bg-emerald-50 border-emerald-200 text-emerald-800',
    'bg-amber-50 border-amber-200 text-amber-800',
    'bg-pink-50 border-pink-200 text-pink-800',
    'bg-cyan-50 border-cyan-200 text-cyan-800',
  ];

  return (
    <div className="bg-slate-50 min-h-screen relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
      </div>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button onClick={() => navigate('/admin-dashboard')} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer">
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <ClipboardList size={20} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                AttendanceMS
              </span>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-red-600 font-medium text-sm border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1 cursor-pointer">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-drop-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen size={28} className="text-indigo-600" />
            Manage Subjects & Enrollments
          </h1>
          <p className="text-gray-500 mt-1">Enroll students to track absentees across your subjects.</p>
        </div>

        {/* Global Enrollment Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 bg-gradient-to-r from-indigo-50/50 to-white">
          <h2 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Globe size={18} className="text-indigo-500" />
            Global Enrollment
          </h2>
          <p className="text-xs text-gray-500 mb-4">Quickly enroll a student in ALL your assigned subjects at once.</p>
          <form onSubmit={handleGlobalEnroll} className="flex gap-3">
            <input
              type="email"
              value={globalEnrollEmail}
              onChange={(e) => setGlobalEnrollEmail(e.target.value)}
              placeholder="Student email (e.g. at @cuchd.in)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
              disabled={globalEnrolling}
            />
            <button
              type="submit"
              disabled={globalEnrolling || !globalEnrollEmail.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm shadow-indigo-100"
            >
              {globalEnrolling ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} 
              Enroll in All
            </button>
          </form>

          {globalEnrollSuccess && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200 flex items-center gap-2 animate-bounce-in">
              <CheckCircle size={16} /> {globalEnrollSuccess}
            </div>
          )}
          {globalEnrollError && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
              {globalEnrollError}
            </div>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">{error}</div>}

        {/* Subjects List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Your Subjects ({subjects.length})</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No subjects created yet.</div>
          ) : (
            <div className="space-y-4">
              {subjects.map((subject, index) => {
                 const isExpanded = expandedSubject === subject.subjectId;
                 const colorClass = subjectColors[index % subjectColors.length];
                 const subjEnrollments = enrollments[subject.subjectId] || [];

                 return (
                   <div key={subject.subjectId} className={`rounded-xl border ${colorClass} overflow-hidden transition-all`}>
                     <div 
                       onClick={() => toggleSubject(subject.subjectId)}
                       className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/40"
                     >
                       <div className="font-semibold">{getSubjectDisplayName(subject.subjectName)}</div>
                       <div className="flex items-center gap-4 text-sm font-medium">
                           <span className="flex items-center gap-1 opacity-80"><Users size={16}/> {subjEnrollments.length}</span>
                           <span className="text-xs px-2 py-1 bg-white/60 rounded-md">
                               {isExpanded ? 'Hide' : 'Manage Students'}
                           </span>
                       </div>
                     </div>

                     {isExpanded && (
                       <div className="bg-white border-t border-gray-100 p-4">
                          <form onSubmit={(e) => handleEnroll(e, subject.subjectId)} className="flex gap-2 mb-4">
                            <input 
                              type="email" 
                              required
                              placeholder="Enter student email (e.g. at @cuchd.in)" 
                              value={enrollEmail}
                              onChange={(e) => setEnrollEmail(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <button 
                              type="submit" 
                              disabled={enrolling || !enrollEmail}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              {enrolling ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16} />} Enroll
                            </button>
                          </form>

                          {enrollError[subject.subjectId] && (
                            <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
                                {enrollError[subject.subjectId]}
                            </div>
                          )}

                          <div className="text-sm font-semibold text-gray-600 mb-2">Enrolled Roster:</div>
                          {subjEnrollments.length === 0 ? (
                              <div className="text-sm text-gray-400 italic">No students enrolled yet.</div>
                          ) : (
                              <ul className="space-y-1 max-h-40 overflow-y-auto">
                                  {subjEnrollments.map((enr, i) => (
                                      <li key={i} className="text-sm text-gray-700 flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                                          <div className="w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold">
                                              {enr.studentEmail[0].toUpperCase()}
                                          </div>
                                          {enr.studentEmail}
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleUnenroll(subject.subjectId, enr.studentEmail); }}
                                            className="ml-auto text-gray-400 hover:text-red-500 transition-colors p-1"
                                            title="Remove student"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                      </li>
                                  ))}
                              </ul>
                          )}
                       </div>
                     )}
                   </div>
                 );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
