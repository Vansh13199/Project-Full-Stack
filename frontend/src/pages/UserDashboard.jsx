import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, CheckCircle, TrendingUp, RefreshCw, ClipboardList, LogOut, QrCode, BookOpen, ChevronDown, ChevronUp, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSubjectDisplayName } from '../utils/subjectMap';

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPresent: 0, totalAbsent: 0, subjects: 0 });
  const [subjectStats, setSubjectStats] = useState([]);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'timetable'

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const fetchMyData = async () => {
    setLoading(true);
    try {
      const email = encodeURIComponent(user?.email);
      const [historyRes, absentsRes, timetableRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:3000/api/attendance/history?studentEmail=${email}`),
        fetch(`http://${window.location.hostname}:3000/api/attendance/absents?studentEmail=${email}`),
        fetch(`http://${window.location.hostname}:3000/api/timetable`)
      ]);

      const historyData = await historyRes.json();
      const absentsData = await absentsRes.json();
      const timetableData = await timetableRes.json();

      if (timetableRes.ok) setTimetable(timetableData.timetable || []);

      if (historyRes.ok && absentsRes.ok) {
        const presents = historyData.records || [];
        const absents = absentsData.absents || [];

        const normalizedPresents = presents.map(r => ({ ...r, displayStatus: 'present', dateRaw: new Date(r.timestamp) }));
        const normalizedAbsents = absents.map(a => ({
          subjectId: a.subjectId,
          subjectName: a.subjectName,
          timestamp: a.createdAt,
          dateRaw: new Date(a.createdAt),
          displayStatus: 'absent'
        }));

        const allRecords = [...normalizedPresents, ...normalizedAbsents];

        // Group by subject
        const subjectMap = {};
        allRecords.forEach(r => {
          const key = r.subjectId || 'unknown';
          if (!subjectMap[key]) {
            subjectMap[key] = {
              subjectId: key,
              subjectName: r.subjectName || 'Unknown',
              records: [],
              presents: 0,
              absents: 0
            };
          }
          subjectMap[key].records.push(r);
          if (r.displayStatus === 'present') subjectMap[key].presents++;
          if (r.displayStatus === 'absent') subjectMap[key].absents++;
        });

        const subjectsArray = Object.values(subjectMap).map(s => {
          const totalSessions = s.presents + s.absents;
          const percentage = totalSessions > 0 ? Math.round((s.presents / totalSessions) * 100) : 100;
          return {
            ...s,
            totalSessions,
            percentage,
            records: s.records.sort((a, b) => b.dateRaw - a.dateRaw),
          };
        });

        subjectsArray.sort((a, b) => a.percentage - b.percentage); // Lowest attendance first

        setSubjectStats(subjectsArray);
        setStats({
          totalPresent: presents.length,
          totalAbsent: absents.length,
          subjects: subjectsArray.length,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyData();
  }, []);

  const subjectColors = [
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
  ];

  const lowAttendanceSubjects = subjectStats.filter(s => s.percentage < 75);

  const renderTimetable = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Calendar size={20} className="text-gray-500"/>
          <h2 className="text-lg font-semibold text-gray-800">Weekly Lecture Schedule</h2>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {days.map(day => {
              const dayClasses = timetable.filter(t => t.day === day);
              if (dayClasses.length === 0) return null;
              
              return (
                <div key={day} className="w-64 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                  <div className="bg-indigo-600 text-white font-semibold py-2 text-center text-sm uppercase tracking-wide">
                    {day}
                  </div>
                  <div className="p-3 space-y-3">
                    {dayClasses.map((cls, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col gap-1 relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${cls.subjectType === 'P' ? 'bg-amber-400' : cls.subjectType === 'T' ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
                        <div className="flex items-center justify-between">
                           <div className="font-bold text-gray-800 text-xs leading-tight pr-2">
                             {getSubjectDisplayName(cls.subjectCode)}
                           </div>
                           <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                             {cls.subjectType === 'P' ? 'Practical' : cls.subjectType === 'T' ? 'Tutorial' : 'Lecture'}
                           </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 font-medium">
                          <Clock size={12} className="mr-1 inline-block"/> {cls.time}
                        </div>
                        <div className="text-[10px] text-gray-400">{cls.group}</div>
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
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

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
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                            {getInitials(user?.name)}
                        </div>
                        <div className="hidden md:block">
                            <div className="text-sm font-medium text-gray-900">{user?.name || 'Student'}</div>
                            <div className="text-xs text-gray-500">Student</div>
                        </div>
                    </div>
                    <button onClick={logout} className="text-gray-500 hover:text-red-600 font-medium text-sm border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1 cursor-pointer">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-drop-in">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                My Dashboard
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                    STUDENT
                </span>
            </h1>
            <p className="text-gray-500 mt-1">Track your absentees and view your upcoming classes.</p>
          </div>
          <button 
            onClick={() => navigate('/mark-attendance')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-200 cursor-pointer active:scale-95"
          >
            <QrCode size={18} /> Scan QR / Mark Attendance
          </button>
        </div>

        {/* Low Attendance Banner */}
        {lowAttendanceSubjects.length > 0 && activeTab === 'attendance' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 text-sm">⚠️ Low Attendance Warning</h3>
                <p className="text-red-700 text-sm mt-1">
                  You are below the 75% threshold in {lowAttendanceSubjects.length} subject(s)!
                </p>
                <ul className="mt-2 space-y-1">
                  {lowAttendanceSubjects.map(s => (
                    <li key={s.subjectId} className="text-sm text-red-700 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      {getSubjectDisplayName(s.subjectName)}: <span className="font-bold">{s.percentage}%</span> ({s.presents} Present, {s.absents} Absent)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalPresent}</div>
              <div className="text-sm text-gray-500 font-medium mt-1">Classes Attended</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
              <XCircle size={24} />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalAbsent}</div>
              <div className="text-sm text-gray-500 font-medium mt-1">Classes Missed</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{stats.subjects}</div>
              <div className="text-sm text-gray-500 font-medium mt-1">Enrolled Subjects</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
           <button 
             onClick={() => setActiveTab('attendance')}
             className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'attendance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
             Attendance History
           </button>
           <button 
             onClick={() => setActiveTab('timetable')}
             className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'timetable' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
             My Timetable
           </button>
        </div>

        {activeTab === 'timetable' && renderTimetable()}

        {/* Subject-wise Breakdown */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Enrollments & Absences</h2>
              <button onClick={fetchMyData} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 cursor-pointer">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={32} className="animate-spin text-indigo-400" />
                </div>
              ) : subjectStats.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">You are not enrolled in any subjects yet.</p>
                  <p className="text-gray-400 text-sm mt-1">Your teacher must assign you to a subject.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subjectStats.map((subject, idx) => {
                    const color = subjectColors[idx % subjectColors.length];
                    const isExpanded = expandedSubject === subject.subjectId;
                    const isLow = subject.percentage < 75;

                    return (
                      <div key={subject.subjectId} className={`rounded-xl border ${isLow ? 'border-red-300' : color.border} overflow-hidden transition-all`}>
                        <button
                          onClick={() => setExpandedSubject(isExpanded ? null : subject.subjectId)}
                          className={`w-full px-5 py-4 flex items-center justify-between ${isLow ? 'bg-red-50' : color.bg} cursor-pointer hover:opacity-90`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center font-bold text-xl ${isLow ? 'text-red-700' : color.text}`}>
                              {subject.subjectName.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left">
                              <div className={`font-bold text-lg ${isLow ? 'text-red-700' : color.text} flex items-center gap-2`}>
                                {getSubjectDisplayName(subject.subjectName)}
                                {isLow && <AlertTriangle size={16} className="text-red-500" />}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {subject.presents} Present • {subject.absents} Absent
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end gap-1">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {subject.percentage}%
                              </span>
                              <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${subject.percentage}%`}}></div>
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="bg-white">
                            <table className="w-full text-left border-t border-gray-100">
                              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                  <th className="px-5 py-3 font-medium">Date</th>
                                  <th className="px-5 py-3 font-medium">Time Logged</th>
                                  <th className="px-5 py-3 font-medium">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 text-sm">
                                {subject.records.length === 0 ? (
                                    <tr><td colSpan="3" className="px-5 py-4 text-center text-gray-400">No classes taken yet.</td></tr>
                                ) : (
                                    subject.records.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3 font-medium text-gray-900 border-l-[3px] border-transparent" style={{ borderLeftColor: r.displayStatus === 'absent' ? '#ef4444' : '#22c55e' }}>
                                        {r.dateRaw.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                                        {r.dateRaw.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-5 py-3">
                                        {r.displayStatus === 'present' ? (
                                            <span className="px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-700 border border-green-200 rounded-md inline-flex items-center gap-1.5 shadow-sm">
                                            <CheckCircle size={12} /> Present
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 border border-red-200 rounded-md inline-flex items-center gap-1.5 shadow-sm">
                                            <XCircle size={12} /> Absent
                                            </span>
                                        )}
                                        </td>
                                    </tr>
                                    ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
