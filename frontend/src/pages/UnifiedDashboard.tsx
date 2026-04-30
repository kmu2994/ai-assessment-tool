import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";

/**
 * UnifiedDashboard — Role-based redirect hub.
 *
 * Routes each authenticated user to their role-specific dashboard:
 *  - admin   → /admin
 *  - teacher → /teacher
 *  - student → /exams
 *
 * If the user is somehow unauthenticated at this point (should be caught
 * by ProtectedRoute first), redirects to /login as a fallback.
 */
export default function UnifiedDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = authApi.getStoredUser();

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    switch (user.role) {
      case "admin":
        navigate("/admin", { replace: true });
        break;
      case "teacher":
        navigate("/teacher", { replace: true });
        break;
      case "student":
      default:
        navigate("/student-dashboard", { replace: true });
        break;
    }
  }, [navigate]);

  // Brief loading state while the redirect runs
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Redirecting to your dashboard…</p>
      </div>
    </div>
  );
}
