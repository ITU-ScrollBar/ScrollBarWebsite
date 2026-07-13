// src/routes/RoleProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Result } from 'antd';
import { Loading } from '../components/Loading';

interface RoleProtectedRouteProps {
  requiredRole?: string;
  fallbackPath?: string; // Where to redirect if access denied
  allowAdminBypass?: boolean;
  children?: React.ReactNode;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  requiredRole,
  fallbackPath = '/members/profile', // Default fallback to main dashboard
  allowAdminBypass = true,
  children
}) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  // If not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const hasRequiredRole = requiredRole
    ? Boolean(currentUser.roles?.includes(requiredRole))
    : false;

  const hasAccess = requiredRole
    ? hasRequiredRole || (allowAdminBypass && currentUser.isAdmin)
    : currentUser.isAdmin;

  if (!hasAccess) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Sorry, you are not authorized to access this page."
        extra={<a href={fallbackPath}>Go Back to Dashboard</a>}
      />
    );
  }

  // Render if user has required access
  return children ? <>{children}</> : <Outlet />;
};

export default RoleProtectedRoute;