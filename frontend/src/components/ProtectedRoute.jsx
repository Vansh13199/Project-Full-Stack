import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    const redirectParams = new URLSearchParams();
    redirectParams.set('redirect', location.pathname + location.search);
    return <Navigate to={`/login?${redirectParams.toString()}`} replace />;
  }
  
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'Teacher' ? '/admin-dashboard' : '/dashboard'} replace />;
  }
  
  return children;
}
