import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    TrendingUp,
    FileText,
    Activity,
    PlusCircle,
    Loader2,
    Calendar,
    Users
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "@/components/Navbar";
import { analyticsApi, TeacherDashboard as TeacherDashboardData } from "@/lib/api";
import { useAccessibility } from "@/hooks/useAccessibility";
import { toast } from "sonner";

const TeacherAnalytics = () => {
    const { highContrast } = useAccessibility();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [dashboard, setDashboard] = useState<TeacherDashboardData | null>(null);

    useEffect(() => {
        fetchDashboard();

        // Prevent backing out of dashboard
        window.history.pushState(null, "", window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, "", window.location.href);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const fetchDashboard = async () => {
        try {
            const data = await analyticsApi.getTeacherDashboard();
            setDashboard(data);
        } catch {
            toast.error("Failed to load analytics");
        } finally {
            setIsLoading(false);
        }
    };

    const stats = [
        { title: "Assessments Created", value: String(dashboard?.total_exams_created || 0), icon: FileText, color: "text-primary" },
        { title: "Total Submissions", value: String(dashboard?.total_submissions || 0), icon: Activity, color: "text-accent" },
        { title: "Active Assessments", value: String(dashboard?.exams?.filter(e => e.is_active).length || 0), icon: Calendar, color: "text-success" },
        {
            title: "Avg. Score", value: dashboard?.student_submissions?.length ?
                `${(dashboard.student_submissions.reduce((a, b) => a + (b.percentage || 0), 0) / dashboard.student_submissions.length).toFixed(0)}%` : "0%",
            icon: TrendingUp, color: "text-warning"
        },
    ];

    const activityData = dashboard?.activity_data || [
        { day: "Mon", submissions: 0 },
        { day: "Tue", submissions: 0 },
        { day: "Wed", submissions: 0 },
        { day: "Thu", submissions: 0 },
        { day: "Fri", submissions: 0 },
        { day: "Sat", submissions: 0 },
        { day: "Sun", submissions: 0 },
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto p-6 space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
                        <p className="text-muted-foreground italic text-lg opacity-80">"Intelligence is the ability to adapt to change." — Stephen Hawking</p>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, idx) => (
                        <Card key={idx} className={`hover:shadow-lg transition-all duration-300 ${highContrast ? 'bg-card border-2 border-foreground shadow-none' : 'border-primary/5 bg-card/50 backdrop-blur-sm'}`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stat.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Charts Section */}
                    <Card className={`lg:col-span-2 ${highContrast ? 'bg-card border-2 border-foreground shadow-none' : 'shadow-xl border-primary/5'}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-accent" />
                                Submission Trends
                            </CardTitle>
                            <CardDescription>Student activity over the last 7 days</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar
                                        dataKey="submissions"
                                        fill="hsl(var(--primary))"
                                        radius={[6, 6, 0, 0]}
                                        animationDuration={1500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Quick Insights / Recent Activity */}
                    <div className="space-y-8">
                        {/* Quick Action Card */}
                        <Card className={`${highContrast ? 'bg-background border-2 border-foreground text-foreground' : 'bg-primary text-primary-foreground'} shadow-xl border-none overflow-hidden relative group`}>
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500">
                                <PlusCircle className="h-32 w-32" />
                            </div>
                            <CardHeader>
                                <CardTitle>Action Center</CardTitle>
                                <CardDescription className="text-primary-foreground/70">Create and deploy new assessments</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 relative z-10">
                                <Button
                                    className={`w-full ${highContrast ? 'bg-primary text-primary-foreground border-2 border-foreground hover:bg-primary/90' : 'bg-background text-primary hover:bg-background/90'} font-bold py-6 rounded-xl`}
                                    onClick={() => navigate("/teacher")}
                                >
                                    Launch Management Panel
                                </Button>
                                <p className="text-[10px] text-center opacity-70 tracking-widest uppercase">Manage Students, Exams & Results</p>
                            </CardContent>
                        </Card>

                        {/* Recent Submissions Feed */}
                        <Card className={`${highContrast ? 'bg-card border-2 border-foreground shadow-none' : 'shadow-lg border-primary/5'}`}>
                            <CardHeader>
                                <CardTitle className="text-lg">Recent Submissions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {dashboard?.student_submissions?.slice(0, 5).map((sub, idx) => (
                                        <div key={idx} className="flex items-center gap-4 group">
                                            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                                                <Users className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate">{sub.student_name}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{sub.exam_title}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-primary">{sub.percentage.toFixed(0)}%</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!dashboard?.student_submissions || dashboard.student_submissions.length === 0) && (
                                        <div className="text-center py-4 text-muted-foreground italic text-sm">
                                            No recent activity
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeacherAnalytics;
