import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { UnreadContentProvider } from "./context/UnreadContentContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import About from "./pages/About";
import Practicals from "./pages/Practicals";
import Assignments from "./pages/Assignments";
import Notices from "./pages/Notices";
import NoticeDetail from "./pages/NoticeDetail";
import Chat from "./pages/Chat";
import Home from "./pages/Home";
import PublicInfo from "./pages/PublicInfo";
import Help from "./pages/Help";
import SeoManager from "./components/SeoManager";

// Admin Components & Pages
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminDepartments from "./pages/admin/AdminDepartments";
import AdminFaculty from "./pages/admin/AdminFaculty";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminTimetable from "./pages/admin/AdminTimetable";
import AdminSyllabus from "./pages/admin/AdminSyllabus";
import AdminPracticals from "./pages/admin/AdminPracticals";
import AdminAssignments from "./pages/admin/AdminAssignments";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminFAQs from "./pages/admin/AdminFAQs";
import AdminKnowledge from "./pages/admin/AdminKnowledge";
import AdminSettings from "./pages/admin/AdminSettings";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/verify-email"
        element={<VerifyEmail />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/privacy-policy"
        element={<PrivacyPolicy />}
      />

      <Route
        path="/terms-and-conditions"
        element={<TermsAndConditions />}
      />

      <Route
        path="/about"
        element={<About />}
      />

      <Route path="/help" element={<Help />} />

      <Route path="/departments" element={<PublicInfo />} />
      <Route path="/departments/cse" element={<PublicInfo />} />
      <Route path="/departments/electronics" element={<PublicInfo />} />
      <Route path="/faculty" element={<Navigate to="/chatbot" replace />} />
      <Route path="/timetable" element={<Navigate to="/chatbot" replace />} />
      <Route path="/admissions" element={<Navigate to="/chatbot" replace />} />
      <Route path="/contact" element={<Navigate to="/about" replace />} />

      <Route
        path="/practicals"
        element={
          <ProtectedRoute>
            <Practicals />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assignments"
        element={
          <ProtectedRoute>
            <Assignments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={<Home />}
      />

      <Route path="/notices" element={<Notices />} />
      <Route path="/notices/:id" element={<NoticeDetail />} />

      <Route
        path="/chatbot"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="users" element={<AdminStudents />} />
        <Route path="departments" element={<AdminDepartments />} />
        <Route path="faculty" element={<AdminFaculty />} />
        <Route path="notices" element={<AdminNotices />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="syllabus" element={<AdminSyllabus />} />
        <Route path="practicals" element={<AdminPracticals />} />
        <Route path="assignments" element={<AdminAssignments />} />
        <Route path="documents" element={<AdminDocuments />} />
        <Route path="faqs" element={<AdminFAQs />} />
        <Route path="knowledge" element={<AdminKnowledge />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
};

const App = () => {
  return (
    <SettingsProvider>
      <AuthProvider>
        <UnreadContentProvider>
          <AppRoutes />
          <SeoManager />
        </UnreadContentProvider>
      </AuthProvider>
    </SettingsProvider>
  );
};

export default App;
