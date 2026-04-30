import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Brain, Volume2, Contrast, Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { authApi, RegisterData } from "@/lib/api";
import { useAccessibility } from "@/hooks/useAccessibility";

const Login = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get("mode");
    const { textToSpeech, highContrast, toggleTextToSpeech, toggleHighContrast } = useAccessibility();

    const [activeTab, setActiveTab] = useState<string>(mode === "signup" ? "signup" : "login");
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (authApi.isAuthenticated()) {
            navigate("/dashboard", { replace: true });
        }
    }, [navigate]);

    // Login form state
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    // Signup form state
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
    const [signupName, setSignupName] = useState("");
    const [signupUsername, setSignupUsername] = useState("");
    // Signup still needs a role — only for registration, not login
    const [signupRole, setSignupRole] = useState<"student" | "teacher">("student");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail || !loginPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            const response = await authApi.login(loginEmail, loginPassword);

            toast.success(`Welcome back, ${response.user.full_name || response.user.username}!`);

            // Backend role determines the correct dashboard — no client-side role selector
            navigate("/dashboard", { replace: true });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            const message = err.response?.data?.detail || "Login failed. Please check your credentials.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!signupEmail || !signupPassword || !signupConfirmPassword || !signupName || !signupUsername) {
            toast.error("Please fill in all fields");
            return;
        }

        if (signupPassword !== signupConfirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!passwordRegex.test(signupPassword)) {
            toast.error("Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one digit.");
            return;
        }

        setIsLoading(true);
        try {
            const data: RegisterData = {
                email: signupEmail,
                password: signupPassword,
                full_name: signupName,
                username: signupUsername,
                role: signupRole,
                accessibility_mode: textToSpeech || highContrast,
            };

            await authApi.register(data);
            toast.success("Account created successfully! Please login.");

            // Auto-fill login form
            setLoginEmail(signupEmail);
            setLoginPassword("");
            setActiveTab("login");
        } catch (error: unknown) {
            const err = error as {
                response?: {
                    data?: {
                        detail?: string | Array<{ msg: string }>
                    }
                }
            };
            let message = "Registration failed. Please try again.";

            if (err.response?.data?.detail) {
                if (Array.isArray(err.response.data.detail)) {
                    message = err.response.data.detail.map(d => d.msg).join(", ");
                } else {
                    message = err.response.data.detail;
                }
            }

            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const getPasswordRequirements = (password: string) => {
        return [
            { label: "At least 6 characters", met: password.length >= 6 },
            { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
            { label: "At least one lowercase letter", met: /[a-z]/.test(password) },
            { label: "At least one digit", met: /\d/.test(password) },
        ];
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            <div className="w-full max-w-6xl grid md:grid-cols-2 gap-12 items-center animate-fade-in relative z-10 pt-12 md:pt-0">

                {/* Left Side - Branding */}
                <div className="text-center md:text-left space-y-8">
                    <Link to="/" className="flex items-center justify-center md:justify-start gap-4 group inline-flex">
                        <div className="bg-primary rounded-2xl p-4 shadow-xl shadow-primary/20 group-hover:scale-105 transition-all duration-300">
                            <Brain className="h-10 w-10 text-primary-foreground" aria-hidden="true" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                                AI Assessment
                            </h1>
                            <p className="text-sm font-medium text-primary/60 tracking-widest uppercase">Inclusive Framework</p>
                        </div>
                    </Link>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground/80">
                            Empowering everyone with <span className="text-primary italic">fair</span> skill evaluation.
                        </h2>
                        <p className="text-muted-foreground text-lg max-w-md">
                            Revolutionizing assessments through adaptive AI and built-in accessibility for a truly inclusive experience.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-6">
                        <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm border p-3 rounded-2xl shadow-sm">
                            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">10k+</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Users</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm border p-3 rounded-2xl shadow-sm">
                            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">99.9%</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Uptime</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="relative group/card">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[2rem] blur-2xl opacity-50 group-hover/card:opacity-75 transition duration-500" />
                    <Card className="relative shadow-2xl border-primary/5 bg-background/80 backdrop-blur-xl animate-scale-in rounded-[1.5rem] overflow-hidden">
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl">Welcome</CardTitle>
                            <CardDescription>Sign in or create an account to continue</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Accessibility Options */}
                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    <h3 className="text-sm font-medium">Accessibility Options</h3>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="tts" className="flex items-center gap-2 cursor-pointer">
                                            <Volume2 className="h-4 w-4 text-primary" aria-hidden="true" />
                                            Text-to-Speech
                                        </Label>
                                        <Switch
                                            id="tts"
                                            checked={textToSpeech}
                                            onCheckedChange={toggleTextToSpeech}
                                            aria-describedby="tts-description"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="contrast" className="flex items-center gap-2 cursor-pointer">
                                            <Contrast className="h-4 w-4 text-primary" aria-hidden="true" />
                                            High Contrast
                                        </Label>
                                        <Switch
                                            id="contrast"
                                            checked={highContrast}
                                            onCheckedChange={toggleHighContrast}
                                            aria-describedby="contrast-description"
                                        />
                                    </div>
                                </div>

                                {/* Login/Signup Tabs */}
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="login">Login</TabsTrigger>
                                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                                    </TabsList>

                                    {/* ── Login Tab ── */}
                                    <TabsContent value="login">
                                        <form onSubmit={handleLogin} className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="login-email">Email or Username</Label>
                                                <Input
                                                    id="login-email"
                                                    type="text"
                                                    placeholder="name@example.com or username"
                                                    value={loginEmail}
                                                    onChange={(e) => setLoginEmail(e.target.value)}
                                                    required
                                                    autoComplete="username"
                                                    aria-required="true"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="login-password">Password</Label>
                                                <Input
                                                    id="login-password"
                                                    type="password"
                                                    placeholder="Enter your password"
                                                    value={loginPassword}
                                                    onChange={(e) => setLoginPassword(e.target.value)}
                                                    required
                                                    autoComplete="current-password"
                                                    aria-required="true"
                                                />
                                            </div>
                                            {/* FIX: Role selector removed from login — backend role determines the dashboard */}
                                            <p className="text-xs text-muted-foreground text-center pb-1">
                                                You will be redirected to your role-specific dashboard after login.
                                            </p>
                                            <Button type="submit" className="w-full" disabled={isLoading}>
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Signing in...
                                                    </>
                                                ) : (
                                                    "Sign In"
                                                )}
                                            </Button>
                                        </form>
                                    </TabsContent>

                                    {/* ── Signup Tab ── */}
                                    <TabsContent value="signup">
                                        <form onSubmit={handleSignup} className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="signup-name">Full Name</Label>
                                                <Input
                                                    id="signup-name"
                                                    type="text"
                                                    placeholder="John Doe"
                                                    value={signupName}
                                                    onChange={(e) => setSignupName(e.target.value)}
                                                    required
                                                    autoComplete="name"
                                                    aria-required="true"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="signup-username">Username</Label>
                                                <Input
                                                    id="signup-username"
                                                    type="text"
                                                    placeholder="johndoe"
                                                    value={signupUsername}
                                                    onChange={(e) => setSignupUsername(e.target.value)}
                                                    required
                                                    autoComplete="username"
                                                    aria-required="true"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="signup-email">Email</Label>
                                                <Input
                                                    id="signup-email"
                                                    type="email"
                                                    placeholder="name@example.com"
                                                    value={signupEmail}
                                                    onChange={(e) => setSignupEmail(e.target.value)}
                                                    required
                                                    autoComplete="email"
                                                    aria-required="true"
                                                />
                                            </div>

                                            {/* Role selection — only on signup, limited to student/teacher */}
                                            <div className="space-y-2">
                                                <Label>Account Type</Label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(["student", "teacher"] as const).map((r) => (
                                                        <Button
                                                            key={r}
                                                            type="button"
                                                            variant={signupRole === r ? "default" : "outline"}
                                                            onClick={() => setSignupRole(r)}
                                                            className="capitalize"
                                                            aria-pressed={signupRole === r}
                                                        >
                                                            {r}
                                                        </Button>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Admin accounts are created by existing administrators only.
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="signup-password">Password</Label>
                                                <Input
                                                    id="signup-password"
                                                    type="password"
                                                    placeholder="Create a password (min 6 characters)"
                                                    value={signupPassword}
                                                    onChange={(e) => setSignupPassword(e.target.value)}
                                                    required
                                                    autoComplete="new-password"
                                                    aria-required="true"
                                                />
                                                {signupPassword && (
                                                    <div className="mt-2 space-y-1 bg-muted/30 p-2 rounded-md">
                                                        {getPasswordRequirements(signupPassword).map((req, i) => (
                                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                                {req.met ? (
                                                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                                ) : (
                                                                    <XCircle className="h-3 w-3 text-muted-foreground" />
                                                                )}
                                                                <span className={req.met ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                                                    {req.label}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                                                <Input
                                                    id="signup-confirm-password"
                                                    type="password"
                                                    placeholder="Confirm your password"
                                                    value={signupConfirmPassword}
                                                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                                                    required
                                                    autoComplete="new-password"
                                                    aria-required="true"
                                                />
                                            </div>
                                            <Button type="submit" className="w-full" disabled={isLoading}>
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Creating account...
                                                    </>
                                                ) : (
                                                    "Create Account"
                                                )}
                                            </Button>
                                        </form>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Login;
