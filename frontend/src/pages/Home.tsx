import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { Brain, CheckCircle, Users, Zap, ArrowRight, Sparkles, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { authApi } from "@/lib/api";

const Home = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const isAuthed = authApi.isAuthenticated();

    useEffect(() => {
        if (isAuthed) {
            navigate("/dashboard", { replace: true });
        }
    }, [isAuthed, navigate]);

    const features = [
        {
            icon: Brain,
            title: "AI-Powered Assessment",
            description: "Adaptive questions that adjust to candidate skill level in real-time"
        },
        {
            icon: Users,
            title: "Inclusive Design",
            description: "Built-in accessibility features for persons with disabilities"
        },
        {
            icon: Zap,
            title: "Instant Feedback",
            description: "Get detailed performance reports and AI-generated insights immediately"
        },
        {
            icon: CheckCircle,
            title: "Fair Evaluation",
            description: "Unbiased skill assessment powered by advanced AI algorithms"
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Simple Header */}
            <header className="container mx-auto px-6 py-4 flex justify-between items-center">
                <Link
                    to={isAuthed ? "/dashboard" : "/"}
                    className="flex items-center gap-2 group"
                    aria-label="Go to Dashboard"
                >
                    <div className="bg-primary rounded-xl p-2 group-hover:scale-110 transition-transform">
                        <Brain className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-xl">AI Assessment</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                    {!isAuthed && (
                        <Button variant="outline" onClick={() => navigate("/login")}>
                            Login
                        </Button>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
                <div className="container mx-auto px-6 py-20 relative">
                    <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 text-sm font-medium text-primary">
                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                            AI-Driven • Inclusive • Fair
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                            Inclusive Assessment
                            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                Powered by AI
                            </span>
                        </h1>

                        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                            Evaluate skills fairly with adaptive AI technology.
                            Designed for accessibility, built for everyone.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                size="lg"
                                onClick={() => navigate(isAuthed ? "/dashboard" : "/login?mode=signup")}
                                className="text-lg gap-2 shadow-lg hover:shadow-xl transition-shadow"
                            >
                                {isAuthed ? "Go to Dashboard" : "Get Started"}
                                <ArrowRight className="h-5 w-5" aria-hidden="true" />
                            </Button>

                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-4xl font-bold">Why Choose Our Platform?</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Fair skill assessment with cutting-edge AI and accessibility at its core
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, idx) => (
                            <Card
                                key={idx}
                                className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-scale-in border-0 card-hover"
                                style={{ animationDelay: `${idx * 0.1}s` }}
                            >
                                <CardContent className="p-6 space-y-4">
                                    <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center">
                                        <feature.icon className="h-7 w-7 text-primary" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                                    <p className="text-muted-foreground">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Inclusive Design Section */}
            <section className="py-20">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6 animate-fade-in-up">
                                <h2 className="text-4xl font-bold">
                                    Built for
                                    <span className="block text-accent">Everyone</span>
                                </h2>

                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    Our platform includes comprehensive accessibility features:
                                </p>

                                <ul className="space-y-4">
                                    {[
                                        "Text-to-speech for all content",
                                        "High contrast mode for visual accessibility",
                                        "Keyboard navigation support",
                                        "Screen reader compatible",
                                        "Voice input for answers"
                                    ].map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                                            <span className="text-lg">{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    size="lg"
                                    onClick={() => navigate(isAuthed ? "/dashboard" : "/login")}
                                    className="gap-2 mt-6"
                                >
                                    {isAuthed ? "Go to Dashboard" : "Start Your Assessment"}
                                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                                </Button>
                            </div>

                            <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
                                <div className="absolute -inset-4 bg-gradient-to-r from-primary to-accent rounded-3xl opacity-20 blur-2xl" />
                                <div className="relative bg-card rounded-3xl shadow-2xl p-8 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                            <Brain className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">AI-Powered Grading</h4>
                                            <p className="text-sm text-muted-foreground">Instant, fair evaluation</p>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full w-4/5 bg-gradient-to-r from-primary to-accent rounded-full" />
                                    </div>
                                    <div className="text-center pt-4">
                                        <span className="text-5xl font-bold text-primary">88%</span>
                                        <p className="text-muted-foreground">Average Score</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-primary to-accent text-primary-foreground">
                <div className="container mx-auto px-6 text-center space-y-8">
                    <h2 className="text-4xl md:text-5xl font-bold">
                        Ready to Experience Fair Assessment?
                    </h2>
                    <p className="text-xl opacity-90 max-w-2xl mx-auto">
                        Join organizations using AI-driven inclusive assessment
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t">
                <div className="container mx-auto px-6 text-center text-muted-foreground">
                    <p>© 2026 AI Assessment Tool. Built for inclusive education.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
