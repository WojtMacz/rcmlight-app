import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute, AdminRoute } from '@/components/auth/ProtectedRoute';

// Public pages — eager loaded
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Protected pages — lazy loaded
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const MachinePage = lazy(() => import('@/pages/machines/MachinePage'));
const NewMachinePage = lazy(() => import('@/pages/machines/NewMachinePage'));
const BomPage = lazy(() => import('@/pages/machines/BomPage'));
const FunctionsPage = lazy(() => import('@/pages/machines/FunctionsPage'));
const PhysicalFailuresPage = lazy(() => import('@/pages/machines/PhysicalFailuresPage'));
const CriticalityPage = lazy(() => import('@/pages/machines/CriticalityPage'));
const PmTasksPage = lazy(() => import('@/pages/machines/PmTasksPage'));
const SummaryPage = lazy(() => import('@/pages/machines/SummaryPage'));
const SettingsLayout = lazy(() => import('@/pages/settings/SettingsLayout'));
const ProfilePage = lazy(() => import('@/pages/settings/ProfilePage'));
const UsersPage = lazy(() => import('@/pages/settings/UsersPage'));
const CompanyPage = lazy(() => import('@/pages/settings/CompanyPage'));
const CriteriaCriteriaPage = lazy(() => import('@/pages/settings/CriteriaCriteriaPage'));
const MaterialGroupsDictionaryPage = lazy(() => import('@/pages/settings/MaterialGroupsDictionaryPage'));
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminCompaniesPage = lazy(() => import('@/pages/admin/AdminCompaniesPage'));
const AdminCompanyDetailPage = lazy(() => import('@/pages/admin/AdminCompanyDetailPage'));
const AdminNewCompanyPage = lazy(() => import('@/pages/admin/AdminNewCompanyPage'));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />

              <Route
                path="/app/dashboard"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DashboardPage />
                  </Suspense>
                }
              />

              {/* New machine */}
              <Route
                path="/app/machines/new"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NewMachinePage />
                  </Suspense>
                }
              />

              {/* Machine analysis routes */}
              <Route
                path="/app/machines/:machineId"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <MachinePage />
                  </Suspense>
                }
              >
                <Route index element={<Navigate to="bom" replace />} />
                <Route path="bom" element={<Suspense fallback={<PageLoader />}><BomPage /></Suspense>} />
                <Route path="functions" element={<Suspense fallback={<PageLoader />}><FunctionsPage /></Suspense>} />
                <Route path="physical-failures" element={<Suspense fallback={<PageLoader />}><PhysicalFailuresPage /></Suspense>} />
                <Route path="criticality" element={<Suspense fallback={<PageLoader />}><CriticalityPage /></Suspense>} />
                <Route path="pm-tasks" element={<Suspense fallback={<PageLoader />}><PmTasksPage /></Suspense>} />
                <Route path="summary" element={<Suspense fallback={<PageLoader />}><SummaryPage /></Suspense>} />
              </Route>

              {/* Settings */}
              <Route
                path="/app/settings"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SettingsLayout />
                  </Suspense>
                }
              >
                <Route index element={<Navigate to="profile" replace />} />
                <Route path="profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
                <Route element={<AdminRoute />}>
                  <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
                  <Route path="company" element={<Suspense fallback={<PageLoader />}><CompanyPage /></Suspense>} />
                  <Route path="criticality-criteria" element={<Suspense fallback={<PageLoader />}><CriteriaCriteriaPage /></Suspense>} />
                  <Route path="material-groups-dictionary" element={<Suspense fallback={<PageLoader />}><MaterialGroupsDictionaryPage /></Suspense>} />
                </Route>
              </Route>
            </Route>
          </Route>

          {/* Super Admin */}
          <Route path="/admin/login" element={<Suspense fallback={<PageLoader />}><AdminLoginPage /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminLayout /></Suspense>}>
            <Route index element={<Navigate to="/admin/companies" replace />} />
            <Route path="companies" element={<Suspense fallback={<PageLoader />}><AdminCompaniesPage /></Suspense>} />
            <Route path="companies/new" element={<Suspense fallback={<PageLoader />}><AdminNewCompanyPage /></Suspense>} />
            <Route path="companies/:id" element={<Suspense fallback={<PageLoader />}><AdminCompanyDetailPage /></Suspense>} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
