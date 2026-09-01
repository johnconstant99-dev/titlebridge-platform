import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { StaffRoute } from '../components/auth/StaffRoute';
import { PublicLayout } from '../layouts/PublicLayout';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { StaffLayout } from '../layouts/StaffLayout';

// Public pages
import { HomePage } from '../pages/public/HomePage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';
import { PrivacyPage } from '../pages/public/PrivacyPage';
import { TermsPage } from '../pages/public/TermsPage';

// Customer pages
import { DashboardPage } from '../pages/customer/DashboardPage';
import { VehiclesPage } from '../pages/customer/VehiclesPage';
import { VehicleDetailPage } from '../pages/customer/VehicleDetailPage';
import { CasesPage } from '../pages/customer/CasesPage';
import { CaseDetailPage } from '../pages/customer/CaseDetailPage';
import { DocumentsPage } from '../pages/customer/DocumentsPage';
import { NotificationsPage } from '../pages/customer/NotificationsPage';
import { ProfilePage } from '../pages/customer/ProfilePage';
import { SecurityPage } from '../pages/customer/SecurityPage';

// Staff pages
import { StaffDashboardPage } from '../pages/staff/StaffDashboardPage';
import { StaffCustomersPage } from '../pages/staff/StaffCustomersPage';
import { StaffVehiclesPage } from '../pages/staff/StaffVehiclesPage';
import { StaffCasesPage } from '../pages/staff/StaffCasesPage';
import { StaffIntegrationsPage } from '../pages/staff/StaffIntegrationsPage';
import { StaffStatesPage } from '../pages/staff/StaffStatesPage';
import { StaffAuditPage } from '../pages/staff/StaffAuditPage';
import { StaffSettingsPage } from '../pages/staff/StaffSettingsPage';

/**
 * TitleBridge application routes.
 *
 * Route groups:
 * - Public: /, /login, /register, /privacy, /terms
 * - Customer (authenticated): /dashboard/*
 * - Staff (role-protected): /staff/*
 *
 * Customer authentication and staff authorization are separate.
 * Authenticated customers cannot access /staff routes.
 */
export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Route>

        {/* Protected customer routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="vehicles/:vin" element={<VehicleDetailPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:caseId" element={<CaseDetailPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="security" element={<SecurityPage />} />
        </Route>

        {/* Role-protected staff routes – staff/admin only */}
        <Route
          path="/staff"
          element={
            <StaffRoute>
              <StaffLayout />
            </StaffRoute>
          }
        >
          <Route index element={<StaffDashboardPage />} />
          <Route path="customers" element={<StaffCustomersPage />} />
          <Route path="vehicles" element={<StaffVehiclesPage />} />
          <Route path="cases" element={<StaffCasesPage />} />
          <Route path="integrations" element={<StaffIntegrationsPage />} />
          <Route path="states" element={<StaffStatesPage />} />
          <Route path="audit" element={<StaffAuditPage />} />
          <Route path="settings" element={<StaffSettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
