// src/routes/ProtectedRoutes.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust path
import { EngagementProvider } from '../contexts/EngagementContext';
import { ShiftProvider } from '../contexts/ShiftContext';
import { ShiftPlanningProvider } from '../contexts/ShiftPlanningContext';
import { InternalEventProvider } from '../contexts/InternalEventContext';
import { TeamProvider } from '../contexts/TeamContext';
import { EventProvider } from '../contexts/EventContext';
import { Loading } from '../components/Loading';

const ProtectedRoutes: React.FC = () => {
  const { currentUser, authUid, loading } = useAuth();

  let content: React.ReactNode;
  if (loading) {
    // Show a loading indicator while checking auth state
    content = <Loading />;
  } else if (!currentUser) {
    // If not loading and no user, redirect to login
    content = <Navigate to="/login" replace />; // 'replace' prevents going back to the protected route
  } else if (!currentUser.active) {
    content = <Navigate to="/deletedUser" replace />;
  } else {
    // If user is logged in, render the child route components
    content = <Outlet />;
  }

  if (!authUid && !currentUser) {
    return content;
  }

  // Mounted as soon as Firebase Auth knows who is signed in (or their cached profile
  // is showing), so the providers' listeners start alongside the users/{uid} fetch
  // instead of after it. Firestore holds their queries until Auth is ready.
  return <EventProvider>
    <EngagementProvider>
      <ShiftProvider>
        <ShiftPlanningProvider>
          <InternalEventProvider>
            <TeamProvider>
              {content}
            </TeamProvider>
          </InternalEventProvider>
        </ShiftPlanningProvider>
      </ShiftProvider>
    </EngagementProvider>
  </EventProvider>;
};

export default ProtectedRoutes;
