import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, LogOut, Users, BookOpen, RefreshCw, ChevronDown, ChevronUp, Search, Download } from 'lucide-react';

export default function ViewAttendance() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [viewMode, setViewMode] = useState('byStudent');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsRes, subjectsRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:3000/api/attendance/teacher-view?teacherEmail=${encodeURIComponent(user?.email)}`),
        fetch(`http://${window.location.hostname}:3000/api/subjects/list?teacherEmail=${encodeURIComponent(user?.email)}`)
      ]);

      const recordsData = await recordsRes.json();
      const subjectsData = await subjectsRes.json();

      if (recordsRes.ok) setRecords(recordsData.records || []);
      if (subjectsRes.ok) setSubjects(subjectsData.subjects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter records by selected subject
  const filteredRecords = selectedSubject === 'all'
    ? records
    : records.filter(r => r.subjectId === selectedSubject);

  // Group by student
  const studentMap = {};
  filteredRecords.forEach(r => {
    if (!studentMap[r.studentEmail]) {
      studentMap[r.studentEmail] = { email: r.studentEmail, records: [] };
    }
    studentMap[r.studentEmail].records.push(r);
  });

  let studentsArray = Object.values(studentMap)
    .map(s => ({ ...s, totalClasses: s.records.length }))
    .sort((a, b) => b.totalClasses - a.totalClasses);

  // Apply search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    studentsArray = studentsArray.filter(s => s.email.toLowerCase().includes(q));
  }

  // Group by subject for subject view
  const subjectMap = {};
  filteredRecords.forEach(r => {
    const key = r.subjectId || 'unknown';
    if (!subjectMap[key]) {
      subjectMap[key] = { subjectId: key, subjectName: r.subjectName || 'Unknown', students: new Set(), records: [] };
    }
    subjectMap[key].students.add(r.studentEmail);
    subjectMap[key].records.push(r);
  });
  const subjectsWithData = Object.values(subjectMap);

  const colors = [
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-700' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button onClick={() => navigate('/admin-dashboard')} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer">
              <ArrowLeft size={18} /> Dashboard
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-drop-in">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users size={28} className="text-indigo-600" />
            Student Attendance Records
          </h1>
          <p className="text-gray-500 mt-1">View attendance data for all students across your subjects.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900">{records.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total Entries</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900">{new Set(records.map(r => r.studentEmail)).size}</div>
            <div className="text-xs text-gray-500 mt-1">Unique Students</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900">{subjects.length}</div>
            <div className="text-xs text-gray-500 mt-1">Subjects</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900">{new Set(records.map(r => r.sessionId)).size}</div>
            <div className="text-xs text-gray-500 mt-1">Sessions</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Subject filter */}
          <div className="flex-1">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none bg-white text-sm cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
              ))}
            </select>
          </div>
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            />
          </div>
          {/* Refresh */}
          <button
            onClick={fetchData}
            className="text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-300 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {/* Export */}
          <button
            onClick={async () => {
              setExporting(true);
              try {
                const url = `http://${window.location.hostname}:3000/api/attendance/export?teacherEmail=${encodeURIComponent(user?.email)}&subjectId=${selectedSubject}`;
                const res = await fetch(url);
                const blob = await res.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'attendance_report.xlsx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch (err) {
                console.error('Export failed:', err);
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting || records.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={32} className="animate-spin text-indigo-400" />
            </div>
          ) : studentsArray.length === 0 ? (
            <div className="text-center py-16">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No attendance records found.</p>
              <p className="text-gray-400 text-sm mt-1">Records will appear here once students start scanning QR codes.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {studentsArray.map((student, idx) => {
                const color = colors[idx % colors.length];
                const isExpanded = expandedStudent === student.email;

                // Group this student's records by subject
                const studentSubjects = {};
                student.records.forEach(r => {
                  const key = r.subjectName || 'Unknown';
                  if (!studentSubjects[key]) studentSubjects[key] = [];
                  studentSubjects[key].push(r);
                });

                return (
                  <div key={student.email}>
                    <button
                      onClick={() => setExpandedStudent(isExpanded ? null : student.email)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${color.badge} flex items-center justify-center font-bold text-sm`}>
                          {student.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900 text-sm">{student.email}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {Object.keys(studentSubjects).length} subject{Object.keys(studentSubjects).length !== 1 ? 's' : ''} • {student.totalClasses} total class{student.totalClasses !== 1 ? 'es' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          {student.totalClasses} Present
                        </span>
                        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                        {Object.entries(studentSubjects).map(([subjectName, subRecords]) => (
                          <div key={subjectName} className="mb-4 last:mb-0">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen size={14} className="text-indigo-500" />
                              <span className="font-semibold text-sm text-gray-700">{subjectName}</span>
                              <span className="text-xs text-gray-400">({subRecords.length} class{subRecords.length !== 1 ? 'es' : ''})</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {subRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((r, i) => (
                                <div key={i} className="bg-white px-3 py-2 rounded-lg border border-gray-200 text-xs">
                                  <div className="font-medium text-gray-800">
                                    {new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="text-gray-400">
                                    {new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
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
