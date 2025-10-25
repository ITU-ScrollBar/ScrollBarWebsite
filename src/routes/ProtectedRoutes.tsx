// src/routes/ProtectedRoutes.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust path
import { EngagementProvider } from '../contexts/EngagementContext';
import { ShiftProvider } from '../contexts/ShiftContext';
import { Loading } from '../components/Loading';

const ProtectedRoutes: React.FC = () => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        // Show a loading indicator while checking auth state
        return <Loading />;
    }

    // If not loading and no user, redirect to login
    if (!currentUser) {
        return <Navigate to="/login" replace />; // 'replace' prevents going back to the protected route
    }

    // If user is logged in, render the child route components
    return <EngagementProvider>
            <ShiftProvider>
                <Outlet />
            </ShiftProvider>
        </EngagementProvider>;
};

export default ProtectedRoutes;