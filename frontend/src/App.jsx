import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentScanner from './pages/StudentScanner';
import ManageSubjects from './pages/ManageSubjects';
import ViewAttendance from './pages/ViewAttendance';

function AppRoutes() {
  const { isAuthenticated, role } = useAuth();

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated 
          ? <Navigate to={role === 'Teacher' ? '/admin-dashboard' : '/dashboard'} replace /> 
          : <Navigate to="/login" replace />
      } />
      
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <UserDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admin-dashboard" element={
        <ProtectedRoute allowedRoles={['Teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />

      <Route path="/manage-subjects" element={
        <ProtectedRoute allowedRoles={['Teacher']}>
          <ManageSubjects />
        </ProtectedRoute>
      } />
      
      <Route path="/mark-attendance" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <StudentScanner />
        </ProtectedRoute>
      } />

      <Route path="/view-attendance" element={
        <ProtectedRoute allowedRoles={['Teacher']}>
          <ViewAttendance />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
