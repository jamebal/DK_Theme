import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/app-shell';
import { AuthLayout } from '@/components/auth-layout';
import { useAuth } from '@/features/auth/auth-context';

const ClientsPage = lazy(() => import('@/pages/clients-page').then((module) => ({ default: module.ClientsPage })));
const DashboardPage = lazy(() => import('@/pages/dashboard-page').then((module) => ({ default: module.DashboardPage })));
const LoginPage = lazy(() => import('@/pages/login-page').then((module) => ({ default: module.LoginPage })));
const NodeStatusPage = lazy(() => import('@/pages/node-status-page').then((module) => ({ default: module.NodeStatusPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/forgot-password-page').then((module) => ({ default: module.ForgotPasswordPage })));
const SettingsPage = lazy(() => import('@/pages/settings-page').then((module) => ({ default: module.SettingsPage })));

function ProtectedLayout() {
  const { token, hydrated } = useAuth();
  if (!hydrated) {
    return <div className='flex min-h-screen items-center justify-center text-sm text-muted-foreground'>正在初始化用户中心…</div>;
  }
  if (!token) {
    return <Navigate to='/login' replace />;
  }
  return <AppShell />;
}

export function AppRouter() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path='/login' element={<LoginPage />} />
        <Route path='/forgot-password' element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<ProtectedLayout />}>
        <Route path='/dashboard' element={<DashboardPage />} />
        <Route path='/clients' element={<ClientsPage />} />
        <Route path='/node-status' element={<NodeStatusPage />} />
        <Route path='/settings' element={<SettingsPage />} />
      </Route>
      <Route path='*' element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
