// src/App.tsx
import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import {
  AntDesignOutlined,
  FacebookOutlined,
  InstagramOutlined,
  LinkedinOutlined,
  MenuOutlined,
} from '@ant-design/icons';


import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage'; // A 404 page
import ProtectedRoutes from './routes/ProtectedRoutes';
import TenderSite from './pages/TenderSite';
import { Col, Image, Layout, Row, Space } from 'antd';
import { Content, Footer, Header } from 'antd/es/layout/layout';
import Sider from 'antd/es/layout/Sider';
import HeaderBar from './components/HomePage/HeaderBar';

import { Typography } from "antd";
import FooterBar from './components/HomePage/FooterBar';
import TestPage from './pages/TestPage';
import Register from './pages/Register';







function App() {



  return (
    <BrowserRouter>
    
      <Layout style={{ minHeight: '100vh', minWidth: '100vw', flexDirection: 'column', height: 'auto'}}>
    
        <Layout>
          <Content><Routes>
        {/* --- Public Routes --- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/TestPage" element={<TestPage />} />
        <Route path="/register" element={<Register />} />

        {/* --- Protected Routes --- */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/tenders" element={<TenderSite />} />
        </Route>
        {/* --- Catch-all Route (404 Not Found) --- */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes></Content>
        </Layout>
        <Footer style={{ backgroundColor: '#FFE600' }}>
          <FooterBar/>
        </Footer>
      </Layout>

    </BrowserRouter>
  );
}

export default App;