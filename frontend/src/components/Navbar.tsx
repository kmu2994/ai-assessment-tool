import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Brain,
    LayoutDashboard,
    FileText,
    Award,
    LogOut,
    Sun,
    Moon,
    Volume2,
    Contrast,
    ShieldCheck,
    ClipboardList,
    UserCircle,
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { useAccessibility } from "@/hooks/useAccessibility";
import { toast } from "sonner";

interface NavbarProps {
    examLocked?: boolean;
}

const Navbar = ({ examLocked = false }: NavbarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const {
        textToSpeech,
        highContrast,
        toggleTextToSpeech,
        toggleHighContrast
    } = useAccessibility();

    const user = authApi.getStoredUser();
    const role = user?.role || 'student';

    const getNavItems = () => {
        const baseItems = [
            { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ];

        if (role === 'student') {
            return [
                { path: "/student-dashboard", label: "Dashboard", icon: LayoutDashboard },
                { path: "/exams", label: "Exams", icon: FileText },
                { path: "/results", label: "Results", icon: Award },
            ];
        }

        if (role === 'teacher') {
            return [
                { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
                { path: "/teacher", label: "Teacher Panel", icon: ClipboardList },
            ];
        }

        if (role === 'admin') {
            return [
                ...baseItems,
                { path: "/admin", label: "Admin Panel", icon: ShieldCheck },
            ];
        }

        return baseItems;
    };

    const navItems = getNavItems();
    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        if (examLocked) {
            toast.error("Complete the exam before logging out.", { duration: 2000 });
            return;
        }
        authApi.logout();
        navigate('/login');
    };

    const handleLockedClick = (e: React.MouseEvent) => {
        if (examLocked) {
            e.preventDefault();
            e.stopPropagation();
            toast.error("Navigation is locked during the exam. Complete the exam first.", {
                duration: 2000,
                style: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }
            });
        }
    };

    return (
        <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50" role="navigation" aria-label="Main navigation">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div
                        className={cn("flex items-center gap-2 group", examLocked ? "cursor-not-allowed" : "")}
                        onClick={examLocked ? handleLockedClick : undefined}
                    >
                        {examLocked ? (
                            <div className="flex items-center gap-2">
                                <div className="bg-primary rounded-xl p-2">
                                    <Brain className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
                                </div>
                                <span className="font-bold text-xl hidden sm:inline">AI Assessment</span>
                                <div className="flex items-center gap-1 ml-2 bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                                    <Lock className="h-3 w-3" />
                                    Exam Mode
                                </div>
                            </div>
                        ) : (
                            <Link to="/dashboard" className="flex items-center gap-2 group" aria-label="Home">
                                <div className="bg-primary rounded-xl p-2 group-hover:scale-110 transition-transform">
                                    <Brain className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
                                </div>
                                <span className="font-bold text-xl hidden sm:inline">AI Assessment</span>
                            </Link>
                        )}
                    </div>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Button
                                    key={item.path}
                                    variant={isActive(item.path) ? "default" : "ghost"}
                                    className={cn(
                                        "gap-2",
                                        isActive(item.path) && "shadow-md",
                                        examLocked && "opacity-40 pointer-events-none cursor-not-allowed"
                                    )}
                                    disabled={examLocked}
                                    onClick={examLocked ? handleLockedClick : () => navigate(item.path)}
                                >
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                    <span className="hidden md:inline">{item.label}</span>
                                </Button>
                            );
                        })}

                        {/* Accessibility Controls */}
                        <div className={cn("flex items-center gap-1 ml-2 border-l pl-2", examLocked && "opacity-40 pointer-events-none")}>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={examLocked ? handleLockedClick : toggleTextToSpeech}
                                className={cn(textToSpeech && "bg-primary/10")}
                                title="Toggle Text-to-Speech"
                                aria-label="Toggle text to speech"
                                aria-pressed={textToSpeech}
                                disabled={examLocked}
                            >
                                <Volume2 className={cn("h-4 w-4", textToSpeech && "text-primary")} />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={examLocked ? handleLockedClick : toggleHighContrast}
                                className={cn(highContrast && "bg-primary/10")}
                                title="Toggle High Contrast"
                                aria-label="Toggle high contrast mode"
                                aria-pressed={highContrast}
                                disabled={examLocked}
                            >
                                <Contrast className={cn("h-4 w-4", highContrast && "text-primary")} />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={examLocked ? handleLockedClick : toggleTheme}
                                title="Toggle Theme"
                                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                                disabled={examLocked}
                            >
                                {theme === 'dark' ? (
                                    <Sun className="h-4 w-4" />
                                ) : (
                                    <Moon className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={examLocked ? handleLockedClick : () => navigate('/settings')}
                            title="My Settings"
                            aria-label="Settings"
                            className={cn(
                                isActive('/settings') ? "bg-primary/10 text-primary" : "",
                                examLocked && "opacity-40 pointer-events-none"
                            )}
                            disabled={examLocked}
                        >
                            <UserCircle className="h-5 w-5" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            title={examLocked ? "Locked during exam" : "Logout"}
                            aria-label="Logout"
                            className={cn(examLocked && "opacity-40 pointer-events-none")}
                            disabled={examLocked}
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
