import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/hooks/useTheme";
import { AccessibilityProvider } from "@/hooks/useAccessibility";
import { authApi } from "@/lib/api";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import ExamsList from "@/pages/ExamsList";
import Exam from "@/pages/Exam";
import Results from "@/pages/Results";
import ViewDetailedResult from "@/pages/ViewDetailedResult";
import TeacherDashboard from "@/pages/TeacherDashboard";
import ReviewSubmission from "@/pages/ReviewSubmission";
import AdminPanel from "@/pages/AdminPanel";
import ProfileSettings from "@/pages/ProfileSettings";
import UnifiedDashboard from "@/pages/UnifiedDashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import NotFound from "@/pages/NotFound";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const isAuthenticated = authApi.isAuthenticated();
  const user = authApi.getStoredUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to unified dashboard for the user's actual role
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Student Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UnifiedDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ExamsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:examId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Exam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Results />
                </ProtectedRoute>
              }
            />
            <Route
              path="/detailed-result/:submissionId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ViewDetailedResult />
                </ProtectedRoute>
              }
            />

            {/* Teacher Routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/review/:submissionId"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <ReviewSubmission />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />

            {/* General Routes */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-right" richColors closeButton />
        </BrowserRouter>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}

export default App;
