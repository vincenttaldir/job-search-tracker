import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Pane, Spinner, Text } from 'evergreen-ui';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TaskProvider } from './context/TaskContext';
import './App.css';

// Lazy-loaded pages — each route becomes its own JS chunk
const CompaniesPage = lazy(() => import('./pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })));
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage').then((m) => ({ default: m.CompanyDetailPage })));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })));
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage').then((m) => ({ default: m.ApplicationDetailPage })));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage').then((m) => ({ default: m.StatisticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ScanReviewPage = lazy(() => import('./pages/ScanReviewPage').then((m) => ({ default: m.ScanReviewPage })));

function PageLoading() {
  return (
    <Pane
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={12}
      padding={48}
      minHeight="40vh"
    >
      <Spinner size={24} />
      <Text color="#999">Chargement...</Text>
    </Pane>
  );
}

function App() {
  return (
    <TaskProvider>
      <Router>
        <Layout>
          <ErrorBoundary>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/companies/:id" element={<CompanyDetailPage />} />
                <Route path="/applications" element={<ApplicationsPage />} />
                <Route path="/applications/:id" element={<ApplicationDetailPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              <Route path="/scan-review" element={<ScanReviewPage />} />
                <Route path="/" element={<Navigate to="/applications" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Layout>
      </Router>
    </TaskProvider>
  );
}

export default App;
