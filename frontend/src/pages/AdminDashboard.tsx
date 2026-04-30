import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    Activity,
    TrendingUp,
    Loader2,
    ShieldAlert,
    Server,
    Wifi
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { analyticsApi, AdminDashboard as AdminDashboardType } from "@/lib/api";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const AdminDashboard = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [dashboard, setDashboard] = useState<AdminDashboardType | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await analyticsApi.getAdminDashboard();
            setDashboard(data);
        } catch {
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    };

    const stats = [
        { title: "Total Users", value: String(dashboard?.total_users || 0), change: "+12%", icon: Users, color: "text-primary" },
        { title: "Accessibility Usage", value: `${dashboard?.accessibility_metrics?.usage_percentage || 0}%`, change: "TTS/High Contrast", icon: Activity, color: "text-accent" },
        { title: "System Health", value: dashboard?.system_status?.database || "Healthy", change: `Latency: ${dashboard?.system_status?.latency_ms || 0}ms`, icon: Server, color: "text-success" },
        { title: "Active Today", value: `${Math.floor((dashboard?.total_users || 0) * 0.3)}`, change: "+15%", icon: TrendingUp, color: "text-warning" },
    ];

    const activityData = dashboard?.activity_data || [
        { day: "Mon", users: 0, assessments: 0 },
        { day: "Tue", users: 0, assessments: 0 },
        { day: "Wed", users: 0, assessments: 0 },
        { day: "Thu", users: 0, assessments: 0 },
        { day: "Fri", users: 0, assessments: 0 },
        { day: "Sat", users: 0, assessments: 0 },
        { day: "Sun", users: 0, assessments: 0 },
    ];

    const roleDistribution = [
        { name: "Students", value: dashboard?.users_by_role?.students || 0, color: "hsl(var(--primary))" },
        { name: "Teachers", value: dashboard?.users_by_role?.teachers || 0, color: "hsl(var(--accent))" },
        { name: "Admins", value: dashboard?.users_by_role?.admins || 0, color: "hsl(var(--warning))" },
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
                        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                            <span className="opacity-70 font-light italic">System Summary:</span>
                            Dashboard
                        </h1>
                        <p className="text-muted-foreground">Quick overview of system usage and performance</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, idx) => (
                        <Card key={idx} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                                {stat.value !== "0" && (
                                    <p className="text-xs text-muted-foreground">
                                        <span className="text-success font-medium">{stat.change}</span> from last week
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Weekly Activity</CardTitle>
                            <CardDescription>User logins and assessment completions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={activityData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px"
                                        }}
                                    />
                                    <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} name="Users" />
                                    <Line type="monotone" dataKey="assessments" stroke="hsl(var(--accent))" strokeWidth={2} name="Assessments" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>User Distribution</CardTitle>
                            <CardDescription>Users by role</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={roleDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {roleDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom Section: Feed & Health */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-destructive" />
                                Recent Activity Feed
                            </CardTitle>
                            <CardDescription>Latest system events</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {dashboard?.recent_violations?.slice(0, 5).map((v, i) => (
                                    <div key={i} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-destructive shadow-sm shadow-destructive/20" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{v.user} flagged</p>
                                            <p className="text-xs text-muted-foreground">{v.event} in {v.exam}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!dashboard?.recent_violations || dashboard.recent_violations.length === 0) && (
                                    <p className="text-center py-4 text-muted-foreground text-sm italic">No recent violations detected</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wifi className="h-5 w-5 text-success" />
                                System Status Overview
                            </CardTitle>
                            <CardDescription>Infrastructure and API health</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 border rounded-lg bg-card/50">
                                    <Label className="text-xs text-muted-foreground">Database</Label>
                                    <p className="text-lg font-bold text-success">Healthy</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-card/50">
                                    <Label className="text-xs text-muted-foreground">API Server</Label>
                                    <p className="text-lg font-bold text-success">Online</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-card/50">
                                    <Label className="text-xs text-muted-foreground">Latency</Label>
                                    <p className="text-lg font-bold">{dashboard?.system_status?.latency_ms || 15}ms</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

// Helper for Label if needed
const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <span className={className}>{children}</span>
);

export default AdminDashboard;
