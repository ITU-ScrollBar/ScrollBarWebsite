// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { lazy, Suspense } from "react";
import HomePage from "./pages/HomePage";
import { Loading } from "./components/Loading";
import { EventProvider } from "./contexts/EventContext";
import { Layout } from "antd";
import { Content, Footer } from "antd/es/layout/layout";

import FooterBar from "./components/HomePage/FooterBar";
import { Role, ShiftFiltering } from "./types/types-file";
import { setTwoToneColor } from "@ant-design/icons";
import { App as AntdApp } from "antd";
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';


// Everything except the landing page is split out so "/" only downloads what it renders.
const ApplyPage = lazy(() => import("./pages/ApplyPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const loadProtectedRoutes = () => import("./routes/ProtectedRoutes");
const loadTenderMenu = () => import("./components/HomePage/TenderMenu");
const loadProfile = () => import("./pages/members/Profile");
const ProtectedRoutes = lazy(loadProtectedRoutes);
const RoleProtectedRoute = lazy(() => import("./routes/RoleProtectedRoute"));
const Register = lazy(() => import("./pages/Register"));
const Shifts = lazy(() => import("./pages/members/Shifts"));
const Profile = lazy(loadProfile);
const GetHelpPage = lazy(() => import("./pages/members/GetHelpPage"));
const ShiftAvailabilityPage = lazy(() => import("./pages/members/ShiftAvailabilityPage"));
const TenderMenu = lazy(() => loadTenderMenu().then((m) => ({ default: m.TenderMenu })));
const EventManagement = lazy(() => import("./pages/admin/EventManagement/EventManagement"));
const GlobalSettingsPage = lazy(() => import("./pages/admin/GlobalSettingsPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const UserManagerPage = lazy(() => import("./pages/admin/UserManagerPage"));
const InternalEventsPage = lazy(() => import("./pages/admin/InternalEventsPage").then((m) => ({ default: m.InternalEventsPage })));
const ShiftManagement = lazy(() => import("./pages/admin/ShiftManagement/ShiftManagement"));
const InactiveUserPage = lazy(() => import("./pages/InactiveUserPage").then((m) => ({ default: m.InactiveUserPage })));
const BoardManagementPage = lazy(() => import("./pages/admin/BoardManagement/BoardManagementPage"));
const ApplicationsReviewPage = lazy(() => import("./pages/admin/ApplicationsReviewPage"));
const DJPage = lazy(() => import("./pages/DJPage"));
const TicketsPage = lazy(() => import("./pages/members/TicketsPage"));
const TicketDashboardPage = lazy(() => import("./pages/admin/TicketDashboardPage"));
const FormsPage = lazy(() => import("./pages/members/FormsPage"));
const LendingRequestPage = lazy(() => import("./pages/members/LendingRequestPage"));
const AnonymousFeedbackPage = lazy(() => import("./pages/members/AnonymousFeedbackPage"));
const FormResponsesPage = lazy(() => import("./pages/admin/FormResponsesPage"));

// Nested lazy routes otherwise download one after another (ProtectedRoutes, then
// TenderMenu once auth resolves, then the page), so start the chunks for the page
// being opened right away. /login is included because it lands on the profile.
// Errors are ignored here; they surface when lazy() renders the route.
const preloadRouteChunks = (path: string) => {
  const opensProfile = /^\/(members\/profile|login)\/?$/.test(path);
  const isMemberArea = /^\/(tenders|members|admin)(\/|$)/.test(path);
  const ignore = () => {};
  if (opensProfile || isMemberArea) {
    loadProtectedRoutes().catch(ignore);
    loadTenderMenu().catch(ignore);
  }
  if (opensProfile) {
    loadProfile().catch(ignore);
  }
};
preloadRouteChunks(window.location.pathname);

function App() {
  dayjs.extend(updateLocale);
  dayjs.updateLocale('en', {
    weekStart: 1
  });

  setTwoToneColor("#FFE600");
  return (
    <AntdApp>
      <BrowserRouter>
        <Layout
          style={{
            minHeight: "100vh",
            minWidth: "100%",
            flexDirection: "column",
            height: "auto",
          }}
        >
          <Layout>
            <Content>
              <Suspense fallback={<Loading centerOverlay={true} />}>
                <Routes>
                  {/* --- Public Routes --- */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/apply" element={<ApplyPage />} />
                  <Route path="/events" element={<EventProvider><EventsPage /></EventProvider>} /> 
                  <Route path="/deletedUser" element={<InactiveUserPage />} /> 
                  <Route path="/dj" element={<DJPage />} /> 

                  {/* --- Protected Routes --- */}
                  <Route element={<ProtectedRoutes />}>
                    <Route element={<TenderMenu />}>
                      <Route
                        path="/tenders/allshifts"
                        element={
                          <Shifts
                            filter={ShiftFiltering.ALL_SHIFTS}
                            title="All Shifts"
                          />
                        }
                      />
                      <Route
                        path="/tenders/upforgrabs"
                        element={
                          <Shifts
                            filter={ShiftFiltering.UP_FOR_GRABS}
                            title="Up for Grabs"
                          />
                        }
                      />
                      <Route path="/tenders/gethelp" element={<GetHelpPage />} />
                      <Route path="/tenders/forms" element={<FormsPage />} />
                      <Route path="/tenders/forms/ticket" element={<TicketsPage />} />
                      <Route path="/tenders/forms/lending" element={<LendingRequestPage />} />
                      <Route path="/tenders/forms/feedback" element={<AnonymousFeedbackPage />} />
                      {/* The ticket form moved under /tenders/forms; keep old links working. */}
                      <Route
                        path="/tenders/tickets"
                        element={<Navigate to="/tenders/forms/ticket" replace />}
                      />
                      <Route path="/members/profile" element={<Profile />} />
                      <Route path="/members/availability" element={<ShiftAvailabilityPage />} />
                      {/* --- Admin Routes --- */}
                      <Route element={<RoleProtectedRoute />}>
                        <Route
                          path="admin/settings"
                          element={<GlobalSettingsPage />}
                        />
                      </Route>
                      <Route element={<RoleProtectedRoute />}>
                        <Route
                          path="admin/board"
                          element={<BoardManagementPage />}
                        />
                      </Route>
                      <Route
                        element={
                          <RoleProtectedRoute requiredRole={Role.EVENT_MANAGER} />
                        }
                      >
                        <Route
                          path="admin/events"
                          element={<EventManagement />}
                        />
                      </Route>
                      <Route
                        element={
                          <RoleProtectedRoute requiredRole={Role.BOARD} />
                        }
                      >
                        <Route
                          path="admin/internalEvents"
                          element={<InternalEventsPage />}
                        />
                      </Route>
                      <Route
                        element={
                          <RoleProtectedRoute requiredRole={Role.SHIFT_MANAGER} />
                        }
                      >
                        <Route
                          path="admin/shifts"
                          element={<ShiftManagement />}
                        />
                      </Route>
                      <Route
                        element={
                          <RoleProtectedRoute
                            requiredRole={Role.BOARD}
                            allowAdminBypass={false}
                          />
                        }
                      >
                        <Route
                          path="admin/dashboard"
                          element={<TicketDashboardPage />}
                        />
                      </Route>
                      <Route
                        element={
                          <RoleProtectedRoute requiredRole={Role.BOARD} />
                        }
                      >
                        <Route
                          path="admin/applications"
                          element={<ApplicationsReviewPage />}
                        />
                      </Route>
                      <Route
                        element={
                          <RoleProtectedRoute
                            requiredRole={Role.BOARD}
                            allowAdminBypass={false}
                          />
                        }
                      >
                        <Route path="admin/forms" element={<FormResponsesPage />} />
                      </Route>
                      <Route
                        element={
                          <RoleProtectedRoute requiredRole={Role.BOARD} />
                        }
                      >
                        <Route path="admin/users" element={<UserManagerPage />} />
                      </Route>
                    </Route>
                  </Route>

                  {/* --- Catch-all Route (404 Not Found) --- */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Content>
          </Layout>
          <Footer style={{ backgroundColor: "#202020" }}>
            <FooterBar />
          </Footer>
        </Layout>
      </BrowserRouter>
    </AntdApp>
  );
}

export default App;
