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
    UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { useAccessibility } from "@/hooks/useAccessibility";

const Navbar = () => {
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
        authApi.logout();
        navigate('/login');
    };

    return (
        <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50" role="navigation" aria-label="Main navigation">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center gap-2 group" aria-label="Home">
                        <div className="bg-primary rounded-xl p-2 group-hover:scale-110 transition-transform">
                            <Brain className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
                        </div>
                        <span className="font-bold text-xl hidden sm:inline">AI Assessment</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Button
                                    key={item.path}
                                    asChild
                                    variant={isActive(item.path) ? "default" : "ghost"}
                                    className={cn(
                                        "gap-2",
                                        isActive(item.path) && "shadow-md"
                                    )}
                                >
                                    <Link to={item.path}>
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        <span className="hidden md:inline">{item.label}</span>
                                    </Link>
                                </Button>
                            );
                        })}

                        {/* Accessibility Controls */}
                        <div className="flex items-center gap-1 ml-2 border-l pl-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleTextToSpeech}
                                className={cn(textToSpeech && "bg-primary/10")}
                                title="Toggle Text-to-Speech"
                                aria-label="Toggle text to speech"
                                aria-pressed={textToSpeech}
                            >
                                <Volume2 className={cn("h-4 w-4", textToSpeech && "text-primary")} />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleHighContrast}
                                className={cn(highContrast && "bg-primary/10")}
                                title="Toggle High Contrast"
                                aria-label="Toggle high contrast mode"
                                aria-pressed={highContrast}
                            >
                                <Contrast className={cn("h-4 w-4", highContrast && "text-primary")} />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleTheme}
                                title="Toggle Theme"
                                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
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
                            onClick={() => navigate('/settings')}
                            title="My Settings"
                            aria-label="Settings"
                            className={isActive('/settings') ? "bg-primary/10 text-primary" : ""}
                        >
                            <UserCircle className="h-5 w-5" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            title="Logout"
                            aria-label="Logout"
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
