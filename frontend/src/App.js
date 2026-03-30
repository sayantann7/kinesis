import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthCallback from './pages/AuthCallback';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import SourcesPage from './pages/SourcesPage';
import InsightsPage from './pages/InsightsPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import OpportunityDetailPage from './pages/OpportunityDetailPage';
import BriefsListPage from './pages/BriefsListPage';
import BriefEditorPage from './pages/BriefEditorPage';
import SpecsListPage from './pages/SpecsListPage';
import SpecDetailPage from './pages/SpecDetailPage';
import CursorActivityPage from './pages/CursorActivityPage';
import SettingsPage from './pages/SettingsPage';
import WorkspacePage from './pages/WorkspacePage';
import SharedSpecPage from './pages/SharedSpecPage';
import JoinPage from './pages/JoinPage';
import { Toaster } from './components/ui/sonner';
import '@/App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (location.state?.user) return children;
  if (loading) return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#002FA7] border-t-transparent animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) return <AuthCallback />;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/shared/:shareId" element={<SharedSpecPage />} />
      <Route path="/join" element={<ProtectedRoute><JoinPage /></ProtectedRoute>} />
      
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
        <Route path="/briefs" element={<BriefsListPage />} />
        <Route path="/briefs/:id" element={<BriefEditorPage />} />
        <Route path="/specs" element={<SpecsListPage />} />
        <Route path="/specs/:id" element={<SpecDetailPage />} />
        <Route path="/activity" element={<CursorActivityPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
