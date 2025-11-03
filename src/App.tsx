// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage"; // A 404 page
import ProtectedRoutes from "./routes/ProtectedRoutes";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";
import { Layout } from "antd";
import { Content, Footer } from "antd/es/layout/layout";

import FooterBar from "./components/HomePage/FooterBar";
import Register from "./pages/Register";
import Shifts from "./pages/members/Shifts";
import Profile from "./pages/members/Profile";
import { TenderMenu } from "./components/HomePage/TenderMenu";
import { ShiftFiltering } from "./types/types-file";
import EventManagement from "./pages/admin/EventManagement/EventManagement";
import GlobalSettingsPage from "./pages/admin/GlobalSettingsPage";
import UserManagerPage from "./pages/admin/UserManagerPage";
import { setTwoToneColor } from '@ant-design/icons';
import { App as AntdApp } from "antd"
import { InternalEventsPage } from "./pages/admin/InternalEventsPage";

function App() {
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
              <Routes>
                {/* --- Public Routes --- */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<Register />} />

                {/* --- Protected Routes --- */}
                <Route element={<ProtectedRoutes />}>
                  <Route element={<TenderMenu />}>
                    <Route
                      path="/members/profile"
                      element={
                        <Profile />
                      }
                    />
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
                    <Route path="/members/profile" element={<Profile />} />
                    {/* --- Admin Routes --- */}
                    <Route element={<RoleProtectedRoute />}>
                      <Route path="admin/settings" element={<GlobalSettingsPage />} />
                    </Route>
                    <Route element={<RoleProtectedRoute requiredRole={'event_manager'} />}>
                      <Route path="admin/events" element={<EventManagement />} />
                    </Route>
                    <Route element={<RoleProtectedRoute requiredRole={'board_member'} />}>
                      <Route path="admin/internalEvents" element={<InternalEventsPage />} />
                    </Route>
                    <Route element={<RoleProtectedRoute requiredRole={'shifts_manager'} />}>
                      <Route path="admin/shifts" element={<div>Manage Shifts Page (to be implemented)</div>} />
                    </Route>
                    <Route element={<RoleProtectedRoute requiredRole={'user_manager'} />}>
                      <Route path="admin/users" element={<UserManagerPage />} />
                    </Route>
                  </Route>
                </Route>

                {/* --- Catch-all Route (404 Not Found) --- */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Content>
          </Layout>
          <Footer style={{ backgroundColor: "#FFE600" }}>
            <FooterBar />
          </Footer>
        </Layout>
      </BrowserRouter>
    </AntdApp>
  );
}

export default App;
