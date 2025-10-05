// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage"; // A 404 page
import ProtectedRoutes from "./routes/ProtectedRoutes";
import TenderSite from "./pages/TenderSite";
import { Layout } from "antd";
import { Content, Footer } from "antd/es/layout/layout";

import FooterBar from "./components/HomePage/FooterBar";
import TestPage from "./pages/TestPage";
import Register from "./pages/Register";
import Shifts from "./pages/members/Shifts";
import { TenderMenu } from "./components/HomePage/TenderMenu";

function App() {
  return (
    <BrowserRouter>
    
      <Layout style={{ minHeight: '100vh', minWidth: '100%', flexDirection: 'column', height: 'auto'}}>
    
        <Layout>
          <Content>
            <Routes>
              {/* --- Public Routes --- */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/TestPage" element={<TestPage />} />
              <Route path="/register" element={<Register />} />

              {/* --- Protected Routes --- */}
              <Route element={<ProtectedRoutes />}>
                <Route element={<TenderMenu />}>
                  <Route path="/tenders" element={<TenderSite />} />
                  <Route path="/tenders/shifts" element={<Shifts />} />
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
  );
}

export default App;
