import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { LoginPage, RegisterPage } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import { JobsPage, JobFormPage, JobDetailPage } from './pages/Jobs';
import PipelinePage from './pages/Pipeline';
import { CandidatesPage, CandidateDetailPage } from './pages/Candidates';
import InterviewsPage from './pages/Interviews';
import { OffersPage, AnalyticsPage } from './pages/OffersAndAnalytics';
import { Spinner } from './components/ui';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"          element={<Dashboard />} />
            <Route path="jobs"               element={<JobsPage />} />
            <Route path="jobs/new"           element={<JobFormPage />} />
            <Route path="jobs/:id"           element={<JobDetailPage />} />
            <Route path="jobs/:id/edit"      element={<JobFormPage />} />
            <Route path="pipeline"           element={<PipelinePage />} />
            <Route path="candidates"         element={<CandidatesPage />} />
            <Route path="candidates/:id"     element={<CandidateDetailPage />} />
            <Route path="interviews"         element={<InterviewsPage />} />
            <Route path="offers"             element={<OffersPage />} />
            <Route path="analytics"          element={<AnalyticsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
