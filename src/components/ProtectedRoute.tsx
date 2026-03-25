import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  // Change 'role' to 'roles' and accept an array
  roles: ('patient' | 'doctor' | 'admin')[];
}

export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // FIX: Map the 'user' role to 'patient' for all logic in this component.
  // This resolves the TypeScript error and matches the AuthContext logic.
  const userAppRole = user.role === 'user' ? 'patient' : user.role;

  // Check if the user's *application role* is included in the allowed roles
  if (!roles.includes(userAppRole)) {
    // Use the mapped userAppRole for the redirect logic as well
    switch (userAppRole) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'doctor':
        return <Navigate to="/doctor/dashboard" replace />;
      case 'patient':
        return <Navigate to="/dashboard" replace />;
      default:
        // This will catch any other unhandled roles
        return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}