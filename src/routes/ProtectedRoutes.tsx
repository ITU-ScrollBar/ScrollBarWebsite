// src/routes/ProtectedRoutes.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust path
import { Spin } from 'antd'; // For loading state

const ProtectedRoutes: React.FC = () => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        // Show a loading indicator while checking auth state
        // You might want a full-page spinner here
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
    }

    // If not loading and no user, redirect to login
    if (!currentUser) {
        return <Navigate to="/login" replace />; // 'replace' prevents going back to the protected route
    }

    // If user is logged in, render the child route components
    return <Outlet />;
};

export default ProtectedRoutes;