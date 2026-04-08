import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ClipboardList, Loader2, GraduationCap, BookOpen } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loginMode, setLoginMode] = useState('student'); // 'student' or 'teacher'
  
  const { loginUser, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const params = new URLSearchParams(location.search);
      const redirectUrl = params.get('redirect');
      if (redirectUrl) {
        navigate(decodeURIComponent(redirectUrl), { replace: true });
      } else {
        navigate(role === 'Teacher' ? '/admin-dashboard' : '/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Domain validation
    const domain = email.split('@')[1]?.toLowerCase();
    if (loginMode === 'student' && domain !== 'cuchd.in') {
      setError('Students must use a @cuchd.in email address.');
      return;
    }
    if (loginMode === 'teacher' && domain !== 'cumail.in') {
      setError('Teachers must use a @cumail.in email address.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await loginUser(email, password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const isStudent = loginMode === 'student';

  // Theme colors based on mode
  const theme = isStudent
    ? {
        accent: 'indigo',
        bg: 'from-indigo-50 via-white to-purple-50',
        blob1: 'bg-purple-200/30',
        blob2: 'bg-indigo-200/30',
        blob3: 'bg-pink-200/30',
        iconBg: 'bg-indigo-100 text-indigo-600',
        inputFocus: 'focus:ring-indigo-500 focus:border-indigo-500',
        btnBg: 'bg-indigo-600 hover:bg-indigo-700',
        linkColor: 'text-indigo-600 hover:text-indigo-800',
        tabActive: 'bg-indigo-600 text-white shadow-md',
        tabInactive: 'text-gray-500 hover:text-gray-700',
      }
    : {
        accent: 'amber',
        bg: 'from-amber-50 via-white to-orange-50',
        blob1: 'bg-orange-200/30',
        blob2: 'bg-amber-200/30',
        blob3: 'bg-yellow-200/30',
        iconBg: 'bg-amber-100 text-amber-600',
        inputFocus: 'focus:ring-amber-500 focus:border-amber-500',
        btnBg: 'bg-amber-600 hover:bg-amber-700',
        linkColor: 'text-amber-600 hover:text-amber-800',
        tabActive: 'bg-amber-600 text-white shadow-md',
        tabInactive: 'text-gray-500 hover:text-gray-700',
      };

  const switchMode = (mode) => {
    setLoginMode(mode);
    setError(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 transition-all duration-700">
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} transition-all duration-700`}></div>
        <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 ${theme.blob1} rounded-full blur-3xl animate-blob`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-96 h-96 ${theme.blob2} rounded-full blur-3xl animate-blob animation-delay-2000`}></div>
        <div className={`absolute bottom-[-10%] left-[20%] w-96 h-96 ${theme.blob3} rounded-full blur-3xl animate-blob animation-delay-4000`}></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md p-8 animate-drop-in border border-white/20">
        
        {/* Role Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
          <button
            type="button"
            onClick={() => switchMode('student')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              isStudent ? theme.tabActive : theme.tabInactive
            }`}
          >
            <GraduationCap size={18} /> Student
          </button>
          <button
            type="button"
            onClick={() => switchMode('teacher')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              !isStudent ? theme.tabActive : theme.tabInactive
            }`}
          >
            <BookOpen size={18} /> Teacher
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 ${theme.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-300`}>
            {isStudent ? <GraduationCap size={32} /> : <BookOpen size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isStudent ? 'Student Login' : 'Teacher Login'}
          </h1>
          <p className="text-gray-500 mt-2">
            {isStudent 
              ? 'Sign in to view your attendance' 
              : 'Sign in to manage your classes'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {isStudent ? 'Student Email' : 'Teacher Email'}
            </label>
            <input 
              type="email" id="email" name="email" 
              placeholder={isStudent ? 'student@university.edu' : 'teacher@university.edu'} 
              required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border border-gray-300 ${theme.inputFocus} transition-colors outline-none cursor-text`}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <Link to="/forgot-password" className={`text-sm ${theme.linkColor} font-medium`}>
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} id="password" name="password" placeholder="••••••••" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border border-gray-300 ${theme.inputFocus} transition-colors outline-none pr-10 cursor-text`}
              />
              <button 
                type="button" 
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full ${theme.btnBg} text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex justify-center items-center disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Processing...
              </>
            ) : (
              <>Sign In as {isStudent ? 'Student' : 'Teacher'}</>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className={`${theme.linkColor} font-semibold cursor-pointer`}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
