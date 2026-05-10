import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
    TrendingUp, FileText, Award, PlayCircle, Clock,
    Loader2, ChevronRight, BookOpen, CheckCircle2,
    XCircle, AlertCircle, Calendar, BarChart3,
    GraduationCap, Shield, Zap, Target, ChevronLeft, CalendarDays
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { analyticsApi, examsApi, StudentAnalytics, Exam } from "@/lib/api";
import { toast } from "sonner";
import { useAccessibility } from "@/hooks/useAccessibility";

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { speak } = useAccessibility();
    const [isLoading, setIsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
    const [availableExams, setAvailableExams] = useState<Exam[]>([]);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const getUser = () => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); }
        catch { return {}; }
    };
    const user = getUser();
    const userName = user.full_name || user.username || 'Student';
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [analyticsData, examsData] = await Promise.all([
                analyticsApi.getStudentAnalytics(),
                examsApi.listAvailable()
            ]);
            setAnalytics(analyticsData);
            setAvailableExams(examsData);
        } catch {
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    };

    const avgScore = analytics?.analytics?.average_score || 0;
    const bestScore = analytics?.analytics?.best_score || 0;
    const totalExams = analytics?.analytics?.total_exams || 0;
    const pendingExams = availableExams.filter(e => !e.has_submitted).length;
    const passRate = analytics?.history?.length
        ? Math.round((analytics.history.filter(h => (h.percentage || 0) >= 40).length / analytics.history.length) * 100)
        : 0;

    // Performance trend data
    const trendData = (analytics?.history?.slice().reverse() || []).map((h, idx) => ({
        name: `T${idx + 1}`,
        score: Math.round(h.percentage || 0),
        label: h.exam_title
    }));

    // Radial gauge for avg score
    const gaugeData = [{ name: 'Score', value: Math.round(avgScore), fill: avgScore >= 60 ? '#22c55e' : avgScore >= 40 ? '#f59e0b' : '#ef4444' }];

    const getGrade = (pct: number) => {
        if (pct >= 90) return { label: 'O', full: 'Outstanding', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950' };
        if (pct >= 80) return { label: 'A+', full: 'Excellent', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' };
        if (pct >= 70) return { label: 'A', full: 'Very Good', color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950' };
        if (pct >= 60) return { label: 'B+', full: 'Good', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' };
        if (pct >= 50) return { label: 'B', full: 'Above Average', color: 'text-lime-600', bg: 'bg-lime-50 dark:bg-lime-950' };
        if (pct >= 40) return { label: 'C', full: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' };
        return { label: 'F', full: 'Fail', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' };
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium">Loading your portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <Navbar />

            <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in max-w-7xl">

                {/* ── TOP IDENTITY BANNER ── */}
                <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                    <div className="relative bg-gradient-to-r from-primary/90 via-primary to-primary/80 px-6 py-5">
                        {/* decorative rings */}
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
                            <div className="w-32 h-32 rounded-full border-[12px] border-white" />
                            <div className="w-20 h-20 rounded-full border-[8px] border-white absolute top-6 left-6" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-black text-white border-2 border-white/30 shadow-lg">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Student Portal</p>
                                    <h1
                                        className="text-2xl font-bold text-white leading-tight"
                                        onMouseEnter={() => speak(`Welcome, ${userName}`)}
                                    >
                                        {userName}
                                    </h1>
                                    <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {today}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {pendingExams > 0 && (
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2">
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-white text-sm font-semibold">{pendingExams} Exam{pendingExams > 1 ? 's' : ''} Available</span>
                                    </div>
                                )}
                                <Button
                                    onClick={() => navigate("/exams")}
                                    className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg gap-2 h-10 px-5"
                                    aria-label="Go to available exams"
                                >
                                    <PlayCircle className="h-4 w-4" />
                                    Take Exam
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ── QUICK STATS BAR ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
                        {[
                            { label: 'Exams Attempted', value: String(totalExams), icon: FileText, color: 'text-blue-600' },
                            { label: 'Average Score', value: `${avgScore.toFixed(1)}%`, icon: TrendingUp, color: 'text-green-600' },
                            { label: 'Best Score', value: `${bestScore.toFixed(1)}%`, icon: Award, color: 'text-amber-500' },
                            { label: 'Pass Rate', value: `${passRate}%`, icon: Target, color: 'text-violet-600' },
                        ].map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
                                tabIndex={0}
                                onFocus={() => speak(`${s.label}: ${s.value}`)}
                            >
                                <div className={`p-2 rounded-lg bg-muted/60`}>
                                    <s.icon className={`h-4 w-4 ${s.color}`} aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                                    <p className="text-xl font-black text-foreground leading-tight">{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── MAIN GRID ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── LEFT: Available Exams ── */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Active Examinations
                            </h2>
                            <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => navigate("/exams")}>
                                View all <ChevronRight className="h-3 w-3" />
                            </Button>
                        </div>

                        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-muted/50 border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                <div className="col-span-5">Examination</div>
                                <div className="col-span-2 text-center">Duration</div>
                                <div className="col-span-2 text-center">Marks</div>
                                <div className="col-span-1 text-center">Mode</div>
                                <div className="col-span-2 text-right">Action</div>
                            </div>

                            {availableExams.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                        <GraduationCap className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-semibold text-muted-foreground">No active examinations</p>
                                    <p className="text-xs text-muted-foreground/60">Your teacher hasn't published any exams yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {availableExams.map((exam, idx) => (
                                        <div
                                            key={exam.id}
                                            className="grid grid-cols-12 gap-2 items-center px-5 py-4 hover:bg-muted/20 transition-colors group"
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                            tabIndex={0}
                                            onFocus={() => speak(exam.title)}
                                        >
                                            <div className="col-span-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black
                                                        ${exam.has_submitted ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-primary/10 text-primary'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm truncate leading-tight">{exam.title}</p>
                                                        <p className="text-[11px] text-muted-foreground truncate">{exam.subject || 'General'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <span className="text-xs font-bold text-muted-foreground flex items-center justify-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {exam.duration_minutes}m
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <span className="text-xs font-bold">{exam.total_marks}</span>
                                            </div>
                                            <div className="col-span-1 text-center">
                                                {exam.is_adaptive ? (
                                                    <span title="Adaptive — difficulty adjusts to your performance">
                                                        <Zap className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                                                    </span>
                                                ) : (
                                                    <span title="Standard exam">
                                                        <Shield className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="col-span-2 flex justify-end">
                                                {exam.has_submitted ? (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-950 px-3 py-1.5 rounded-full">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Done
                                                    </span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-4 text-xs font-bold gap-1 opacity-90 group-hover:opacity-100 shadow-sm"
                                                        onClick={() => navigate(`/exam/${exam.id}`)}
                                                        aria-label={`Start ${exam.title}`}
                                                    >
                                                        Start
                                                        <ChevronRight className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Performance Trend Chart ── */}
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                                <BarChart3 className="h-4 w-4" />
                                Score Trend
                            </h2>
                            <div className="bg-card border rounded-2xl p-5 shadow-sm">
                                {trendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={180}>
                                        <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                                                formatter={(val: number, _name: string, props: { payload?: { label?: string } }) => [
                                                    `${val}%`,
                                                    props.payload?.label || 'Score'
                                                ]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                stroke="hsl(var(--primary))"
                                                strokeWidth={2.5}
                                                fill="url(#scoreGrad)"
                                                dot={{ fill: 'hsl(var(--primary))', r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[180px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <BarChart3 className="h-8 w-8 opacity-20" />
                                        <p className="text-xs">Complete exams to see your trend</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN ── */}
                    <div className="space-y-4">

                        {/* ── Exam Calendar ── */}
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Exam Calendar
                        </h2>
                        {(() => {
                            const year = calendarMonth.getFullYear();
                            const month = calendarMonth.getMonth();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const todayStr = new Date().toISOString().split('T')[0];
                            const examDates = new Set(
                                availableExams
                                    .filter(e => e.scheduled_at)
                                    .map(e => e.scheduled_at!.split('T')[0])
                            );
                            const days: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                            const examsOnSelected = selectedDate
                                ? availableExams.filter(e => e.scheduled_at?.startsWith(selectedDate))
                                : [];

                            return (
                                <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm font-bold">
                                            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center">
                                        {['S','M','T','W','T','F','S'].map((d, i) => (
                                            <div key={i} className="text-[9px] font-bold text-muted-foreground uppercase py-1">{d}</div>
                                        ))}
                                        {days.map((day, i) => {
                                            if (day === null) return <div key={`e-${i}`} />;
                                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const hasExam = examDates.has(dateStr);
                                            const isToday = dateStr === todayStr;
                                            const isSelected = dateStr === selectedDate;
                                            return (
                                                <button
                                                    key={dateStr}
                                                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                                    className={`relative aspect-square flex items-center justify-center text-xs font-semibold rounded-lg transition-all
                                                        ${isSelected ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 scale-110' :
                                                          isToday ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30' :
                                                          hasExam ? 'hover:bg-primary/5' : 'hover:bg-muted/50 text-muted-foreground'}`}
                                                >
                                                    {day}
                                                    {hasExam && !isSelected && (
                                                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedDate && examsOnSelected.length > 0 && (
                                        <div className="border-t pt-3 space-y-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Exams on {new Date(selectedDate + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                            {examsOnSelected.map(ex => (
                                                <div key={ex.id} className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
                                                    <div>
                                                        <p className="text-xs font-bold">{ex.title}</p>
                                                        <p className="text-[10px] text-muted-foreground">{ex.subject} · {ex.duration_minutes}min</p>
                                                    </div>
                                                    {!ex.has_submitted && (
                                                        <Button size="sm" className="h-7 text-[10px] font-bold" onClick={() => navigate(`/exam/${ex.id}`)}>
                                                            Start
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedDate && examsOnSelected.length === 0 && (
                                        <p className="text-[10px] text-muted-foreground text-center pt-2">No exams on this date</p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Performance Card */}
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Your Performance
                        </h2>
                        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-5">
                            {/* Radial gauge */}
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <ResponsiveContainer width={140} height={140}>
                                        <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" data={gaugeData} startAngle={90} endAngle={90 - 360 * (avgScore / 100)}>
                                            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(var(--muted))' }} />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-foreground">{avgScore.toFixed(0)}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Avg %</span>
                                    </div>
                                </div>

                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${getGrade(avgScore).bg} ${getGrade(avgScore).color} mt-2`}>
                                    <GraduationCap className="h-4 w-4" />
                                    Grade {getGrade(avgScore).label} — {getGrade(avgScore).full}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Highest', value: `${bestScore.toFixed(0)}%`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
                                    { label: 'Pass Rate', value: `${passRate}%`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
                                    { label: 'Completed', value: String(totalExams), color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950' },
                                    { label: 'Pending', value: String(pendingExams), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950' },
                                ].map((m, i) => (
                                    <div key={i} className={`${m.bg} rounded-xl p-3 text-center`}>
                                        <p className={`text-xl font-black ${m.color}`}>{m.value}</p>
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{m.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Results */}
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 pt-1">
                            <FileText className="h-4 w-4" />
                            Recent Results
                        </h2>
                        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                            {analytics?.history && analytics.history.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {analytics.history.slice(0, 6).map((h, i) => {
                                        const pct = Math.round(h.percentage || 0);
                                        const passed = pct >= 40;
                                        const grade = getGrade(pct);
                                        return (
                                            <div
                                                key={h.id}
                                                className="px-4 py-3 hover:bg-muted/20 transition-colors flex items-center gap-3"
                                                tabIndex={0}
                                                onFocus={() => speak(`${h.exam_title}: ${pct}%`)}
                                            >
                                                {/* Rank number */}
                                                <span className="flex-shrink-0 w-5 text-[11px] font-bold text-muted-foreground text-right">{i + 1}.</span>

                                                {/* Pass/fail icon */}
                                                {passed
                                                    ? <CheckCircle2 className="flex-shrink-0 h-4 w-4 text-green-500" />
                                                    : <XCircle className="flex-shrink-0 h-4 w-4 text-red-500" />
                                                }

                                                {/* Exam info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate">{h.exam_title}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {h.submitted_at ? new Date(h.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                                    </p>
                                                </div>

                                                {/* Score + grade */}
                                                <div className="flex-shrink-0 flex items-center gap-2">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-md ${grade.bg} ${grade.color}`}>
                                                        {grade.label}
                                                    </span>
                                                    <span className="text-sm font-bold w-10 text-right">{pct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                                    <AlertCircle className="h-6 w-6 text-muted-foreground/30" />
                                    <p className="text-xs text-muted-foreground">No results yet</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
