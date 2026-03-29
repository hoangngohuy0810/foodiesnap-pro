import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import LandingPage from './pages/LandingPage';
import AppPage from './pages/AppPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import RefundPolicyPage from './pages/RefundPolicyPage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <ToastContainer />
    </>
  );
}

function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Main pages with Navbar */}
      <Route path="/" element={<Layout><LandingPage /></Layout>} />
      <Route path="/app" element={<Layout><AppPage /></Layout>} />
      <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
      <Route path="/admin" element={<Layout><AdminPage /></Layout>} />

      {/* Legal pages (no Navbar) */}
      <Route path="/privacy-policy" element={<LegalLayout><PrivacyPolicyPage /></LegalLayout>} />
      <Route path="/terms-of-service" element={<LegalLayout><TermsPage /></LegalLayout>} />
      <Route path="/refund-policy" element={<LegalLayout><RefundPolicyPage /></LegalLayout>} />

      {/* 404 fallback */}
      <Route path="*" element={<Layout><LandingPage /></Layout>} />
    </Routes>
  );
}
