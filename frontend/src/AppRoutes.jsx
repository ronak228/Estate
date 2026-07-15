import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Auth pages
import LoginPage from './pages/Auth/LoginPage';
import ForbiddenPage from './pages/Auth/ForbiddenPage';

// App pages
import DashboardPage from './pages/Dashboard/DashboardPage';
import CompanyListPage from './pages/Company/CompanyListPage';
import CompanyDetailPage from './pages/Company/CompanyDetailPage';
import CompanySettingsPage from './pages/Company/CompanySettingsPage';
import EmployeePage from './pages/Employee/EmployeePage';
import EmployeeDetailPage from './pages/Employee/EmployeeDetailPage';
import ProfilePage from './pages/Profile/ProfilePage';

// Module 1 — Inquiry Management
import InquiryPage from './pages/Inquiry/InquiryPage';
import InquiryDetailPage from './pages/Inquiry/InquiryDetailPage';

// Module 2 — Lead Qualification & Contact Management
import ContactPage from './pages/Contact/ContactPage';
import ContactDetailPage from './pages/Contact/ContactDetailPage';
import SiteVisitPage from './pages/SiteVisit/SiteVisitPage';
import SiteVisitDetailPage from './pages/SiteVisit/SiteVisitDetailPage';

// Module 3 — Property Viewing & Proposal
import QuotationPage from './pages/Quotation/QuotationPage';
import QuotationDetailPage from './pages/Quotation/QuotationDetailPage';

// Module 4 — Sales Negotiation & Booking
import BookingPage from './pages/Booking/BookingPage';
import BookingDetailPage from './pages/Booking/BookingDetailPage';


// Project & Unit Inventory
import ProjectPage from './pages/Project/ProjectPage';
import ProjectDetailPage from './pages/Project/ProjectDetailPage';

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const CRM_ROLES = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* Authenticated */}
      <Route
        element={
          <ProtectedRoute roles={ALL_ROLES}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* SUPER_ADMIN */}
        <Route
          path="/companies"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <CompanyListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <CompanyDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ADMIN, MANAGER */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <EmployeePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <EmployeeDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ADMIN only */}
        <Route
          path="/settings/company"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <CompanySettingsPage />
            </ProtectedRoute>
          }
        />

        {/* ── Project & Unit Inventory ── */}
        <Route
          path="/projects"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <ProjectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ── Module 1: Inquiry Management ── */}        <Route
          path="/inquiries"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <InquiryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inquiries/:id"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <InquiryDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ── Module 2: Lead Qualification & Contact Management ── */}
        <Route
          path="/contacts"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <ContactPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts/:id"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <ContactDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/site-visits"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <SiteVisitPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/site-visits/:id"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <SiteVisitDetailPage />
            </ProtectedRoute>
          }
        />

        {/* CRM routes — pages to be built in Modules 3–4 */}
        <Route
          path="/quotations"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <QuotationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotations/:id"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <QuotationDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <ProtectedRoute roles={CRM_ROLES}>
              <BookingDetailPage />
            </ProtectedRoute>
          }
        />

      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
