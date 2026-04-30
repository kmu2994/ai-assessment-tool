import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Users,
    Activity,
    Search,
    TrendingUp,
    Loader2,
    Trash2,
    ShieldAlert,
    Server,
    Wifi,
    CheckSquare,
    Square
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { analyticsApi, authApi, AdminDashboard as AdminDashboardType, User } from "@/lib/api";
import { toast } from "sonner";


const AdminPanel = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [dashboard, setDashboard] = useState<AdminDashboardType | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const getCurrentUserId = (): string => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}').id || '';
        } catch {
            return '';
        }
    };

    const getAdminName = () => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}').full_name || 'Administrator';
        } catch {
            return 'Administrator';
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dashboardData, usersData] = await Promise.all([
                analyticsApi.getAdminDashboard(),
                authApi.listUsers()
            ]);
            setDashboard(dashboardData);
            setUsers(usersData);
        } catch {
            toast.error("Failed to load admin data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await authApi.updateUserRole(userId, newRole);
            toast.success("User role updated");
            fetchData();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Failed to update role");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            await authApi.deleteUser(userId);
            toast.success("User deleted");
            fetchData();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Failed to delete user");
        }
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const toggleAllSelection = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(u => u.id));
        }
    };

    const handleBulkDelete = async () => {
        const currentUserId = getCurrentUserId();
        // Safety: exclude the currently-logged-in admin from bulk deletion
        const safeToDelete = selectedUsers.filter(id => id !== currentUserId);

        if (safeToDelete.length === 0) {
            toast.error("Cannot delete yourself. No other users were selected.");
            return;
        }

        const usernames = safeToDelete
            .map(id => users.find(u => u.id === id)?.username || id)
            .join(", ");

        if (!confirm(`Permanently delete ${safeToDelete.length} user(s)?\n\nUsers: ${usernames}\n\nThis cannot be undone.`)) return;

        try {
            const results = await Promise.allSettled(safeToDelete.map(id => authApi.deleteUser(id)));
            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            if (succeeded > 0) toast.success(`${succeeded} user(s) deleted successfully.`);
            if (failed > 0) toast.error(`${failed} user(s) could not be deleted (last admin protection).`);

            setSelectedUsers([]);
            fetchData();
        } catch {
            toast.error("Failed to delete users.");
        }
    };

    const stats = [
        { title: "Total Users", value: String(dashboard?.total_users || 0), change: "All roles combined", icon: Users, color: "text-primary" },
        { title: "Accessibility Usage", value: `${dashboard?.accessibility_metrics?.usage_percentage || 0}%`, change: "TTS / High Contrast", icon: Activity, color: "text-accent" },
        { title: "System Health", value: dashboard?.system_status?.database || "Healthy", change: `Latency: ${dashboard?.system_status?.latency_ms || 0}ms`, icon: Server, color: "text-success" },
        // FIX: replaced fabricated `total_users × 0.3` with real total submissions count
        { title: "Total Submissions", value: String(dashboard?.total_submissions || 0), change: "All graded exams", icon: TrendingUp, color: "text-warning" },
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

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getRoleBadge = (role: string) => {
        const variants: Record<string, "default" | "secondary" | "outline"> = {
            admin: "default",
            teacher: "secondary",
            student: "outline"
        };
        return <Badge variant={variants[role] || "outline"}>{role}</Badge>;
    };

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
                            <span className="opacity-70 font-light italic">System Admin:</span>
                            {getAdminName()}
                        </h1>
                        <p className="text-muted-foreground">Manage users, monitor assessments, and view analytics</p>
                    </div>
                    <div className="flex gap-2">
                        {/* Settings moved to Navbar */}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, idx) => (
                        <Card key={idx} className="hover:shadow-lg transition-shadow animate-scale-in"
                            style={{ animationDelay: `${idx * 0.1}s` }}>
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

                {/* Main Charts & Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="animate-fade-in-up">
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

                    <Card className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
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

                {/* Enhanced Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Accessibility Usage Card */}
                    <Card className="animate-fade-in-up">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-accent" />
                                Accessibility Insights
                            </CardTitle>
                            <CardDescription>Usage of TTS and High Contrast modes</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: "Enabled", value: dashboard?.accessibility_metrics?.enabled_count || 0, color: "hsl(var(--accent))" },
                                            { name: "Standard", value: (dashboard?.accessibility_metrics?.total_users || 0) - (dashboard?.accessibility_metrics?.enabled_count || 0), color: "hsl(var(--muted))" }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell key="cell-0" fill="hsl(var(--accent))" />
                                        <Cell key="cell-1" fill="hsl(var(--muted))" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="text-center mt-2">
                                <div className="text-2xl font-bold">{dashboard?.accessibility_metrics?.usage_percentage || 0}%</div>
                                <p className="text-xs text-muted-foreground">Adoption rate among students</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Proctoring Violations Feed */}
                    <Card className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-destructive" />
                                    Recent Proctoring Violations
                                </CardTitle>
                                <CardDescription>Real-time security alerts from active exams</CardDescription>
                            </div>
                            <Badge variant="destructive" className="animate-pulse">Live Feed</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                                {dashboard?.recent_violations && dashboard.recent_violations.length > 0 ? (
                                    dashboard.recent_violations.map((v, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10 animate-fade-in">
                                            <div className="flex gap-3">
                                                <div className="p-2 rounded-full bg-destructive/10">
                                                    <ShieldAlert className="h-4 w-4 text-destructive" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{v.user} - <span className="opacity-70">{v.exam}</span></p>
                                                    <p className="text-xs text-muted-foreground">{v.event}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                {new Date(v.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground italic">
                                        No violations detected today. System secure. ✅
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* System Monitoring */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-success/5 border-success/20 animate-scale-in">
                        <CardContent className="pt-6 flex items-center gap-4">
                            <Server className="h-8 w-8 text-success" />
                            <div>
                                <p className="text-sm font-medium opacity-70">Database Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                                    <p className="text-xl font-bold text-success font-mono">{dashboard?.system_status?.database || "Healthy"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20 animate-scale-in" style={{ animationDelay: "0.1s" }}>
                        <CardContent className="pt-6 flex items-center gap-4">
                            <Wifi className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-sm font-medium opacity-70">API Server</p>
                                <p className="text-xl font-bold text-primary font-mono">Running</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-accent/5 border-accent/20 animate-scale-in" style={{ animationDelay: "0.2s" }}>
                        <CardContent className="pt-6 flex items-center gap-4">
                            <Activity className="h-8 w-8 text-accent" />
                            <div>
                                <p className="text-sm font-medium opacity-70">System Latency</p>
                                <p className="text-xl font-bold text-accent font-mono">{dashboard?.system_status?.latency_ms || 0}ms</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* User Management Table */}
                <Card className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>View and manage all platform users</CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedUsers.length > 0 && (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                        <Badge variant="secondary" className="px-3 py-1">
                                            {selectedUsers.length} Selected
                                        </Badge>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-8 gap-2"
                                            onClick={handleBulkDelete}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete Selected
                                        </Button>
                                    </div>
                                )}
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    <Input
                                        placeholder="Search users..."
                                        className="pl-10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        aria-label="Search users"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={toggleAllSelection}
                                            >
                                                {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? (
                                                    <CheckSquare className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <Square className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.id} className={`hover:bg-muted/50 transition-colors ${selectedUsers.includes(user.id) ? 'bg-primary/5' : ''}`}>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => toggleUserSelection(user.id)}
                                                >
                                                    {selectedUsers.includes(user.id) ? (
                                                        <CheckSquare className="h-4 w-4 text-primary" />
                                                    ) : (
                                                        <Square className="h-4 w-4 opacity-50" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {user.full_name || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <select
                                                        className="h-8 px-2 rounded border border-input bg-background text-sm"
                                                        value={user.role}
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                        aria-label="Change role"
                                                    >
                                                        <option value="student">Student</option>
                                                        <option value="teacher">Teacher</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default AdminPanel;
