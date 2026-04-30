import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    FileText, Calendar, ArrowLeft, Award, CheckCircle2,
    XCircle, Loader2, TrendingUp, BarChart3, Target,
    ChevronRight, GraduationCap, Medal
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";
import { analyticsApi, StudentAnalytics } from "@/lib/api";
import { toast } from "sonner";

/* ── Grade helper ── */
const getGrade = (pct: number) => {
    if (pct >= 90) return { label: 'O',  color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/60', border: 'border-violet-200 dark:border-violet-800', bar: 'bg-violet-500' };
    if (pct >= 80) return { label: 'A+', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/60',     border: 'border-blue-200 dark:border-blue-800',   bar: 'bg-blue-500' };
    if (pct >= 70) return { label: 'A',  color: 'text-sky-600',    bg: 'bg-sky-50 dark:bg-sky-950/60',       border: 'border-sky-200 dark:border-sky-800',     bar: 'bg-sky-500' };
    if (pct >= 60) return { label: 'B+', color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/60',   border: 'border-green-200 dark:border-green-800', bar: 'bg-green-500' };
    if (pct >= 50) return { label: 'B',  color: 'text-lime-600',   bg: 'bg-lime-50 dark:bg-lime-950/60',     border: 'border-lime-200 dark:border-lime-800',   bar: 'bg-lime-500' };
    if (pct >= 40) return { label: 'C',  color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/60', border: 'border-yellow-200 dark:border-yellow-800',bar: 'bg-yellow-500' };
    return           { label: 'F',  color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/60',       border: 'border-red-200 dark:border-red-800',     bar: 'bg-red-500' };
};

const Results = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);

    useEffect(() => { fetchResults(); }, []);

    const fetchResults = async () => {
        try {
            const data = await analyticsApi.getStudentAnalytics();
            setAnalytics(data);
        } catch {
            toast.error("Failed to load results");
        } finally {
            setIsLoading(false);
        }
    };

    const history = analytics?.history || [];
    const totalExams  = history.length;
    const avgScore    = totalExams ? history.reduce((s, h) => s + (h.percentage || 0), 0) / totalExams : 0;
    const bestScore   = totalExams ? Math.max(...history.map(h => h.percentage || 0)) : 0;
    const passCount   = history.filter(h => (h.percentage || 0) >= 40).length;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium">Loading your results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 pb-16">
            <Navbar />

            <main className="container mx-auto px-4 py-6 max-w-4xl space-y-5 animate-fade-in">

                {/* ── Page Header ── */}
                <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-primary/90 to-primary px-6 py-5 relative overflow-hidden">
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
                            <div className="w-28 h-28 rounded-full border-[10px] border-white" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                            <div>
                                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
                                    Examination Portal
                                </p>
                                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <GraduationCap className="h-6 w-6" />
                                    My Result Sheet
                                </h1>
                                <p className="text-white/60 text-xs mt-1">
                                    Complete history of all attempted examinations
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/student-dashboard")}
                                className="text-white/80 hover:text-white hover:bg-white/10 gap-2 self-start md:self-auto"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Dashboard
                            </Button>
                        </div>
                    </div>

                    {/* ── Summary Stats Bar ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
                        {[
                            { label: 'Total Attempted', value: String(totalExams),            icon: BarChart3,   color: 'text-blue-600' },
                            { label: 'Average Score',   value: `${avgScore.toFixed(1)}%`,    icon: TrendingUp,  color: 'text-green-600' },
                            { label: 'Best Score',      value: `${bestScore.toFixed(1)}%`,   icon: Medal,       color: 'text-amber-500' },
                            { label: 'Exams Passed',    value: `${passCount}/${totalExams}`, icon: Target,      color: 'text-violet-600' },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-4">
                                <div className="p-2 rounded-lg bg-muted/60">
                                    <s.icon className={`h-4 w-4 ${s.color}`} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                                    <p className="text-xl font-black text-foreground leading-tight">{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Results Table ── */}
                {history.length > 0 ? (
                    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                        {/* Table header */}
                        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-muted/50 border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <div className="col-span-1">#</div>
                            <div className="col-span-4">Examination</div>
                            <div className="col-span-2 text-center">Date</div>
                            <div className="col-span-1 text-center">Grade</div>
                            <div className="col-span-2 text-center">Score</div>
                            <div className="col-span-1 text-center">Result</div>
                            <div className="col-span-1 text-right">Action</div>
                        </div>

                        <div className="divide-y divide-border">
                            {history.map((h, idx) => {
                                const pct    = Math.round(h.percentage || 0);
                                const passed = pct >= 40;
                                const grade  = getGrade(pct);
                                return (
                                    <div
                                        key={h.id}
                                        className="grid grid-cols-12 gap-2 items-center px-5 py-4 hover:bg-muted/20 transition-colors group"
                                    >
                                        {/* # */}
                                        <div className="col-span-1">
                                            <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                                        </div>

                                        {/* Exam name + progress bar */}
                                        <div className="col-span-4 min-w-0">
                                            <p className="font-semibold text-sm truncate leading-tight">{h.exam_title}</p>
                                            {/* Score progress bar */}
                                            <div className="mt-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${grade.bar}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div className="col-span-2 text-center">
                                            <span className="text-[11px] font-medium text-muted-foreground flex items-center justify-center gap-1">
                                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                                {h.submitted_at
                                                    ? new Date(h.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
                                                    : '—'}
                                            </span>
                                        </div>

                                        {/* Grade badge */}
                                        <div className="col-span-1 text-center">
                                            <span className={`inline-block text-sm font-black px-2.5 py-0.5 rounded-md border ${grade.bg} ${grade.color} ${grade.border}`}>
                                                {grade.label}
                                            </span>
                                        </div>

                                        {/* Score fraction + % */}
                                        <div className="col-span-2 text-center">
                                            <p className="text-sm font-black text-foreground">
                                                {h.total_score?.toFixed(1) ?? '—'}
                                                <span className="text-muted-foreground font-normal text-xs"> / {h.max_score}</span>
                                            </p>
                                            <p className="text-[11px] font-semibold text-muted-foreground">{pct}%</p>
                                        </div>

                                        {/* Pass / Fail */}
                                        <div className="col-span-1 text-center">
                                            {passed ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full">
                                                    <CheckCircle2 className="h-3 w-3" /> Pass
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 dark:bg-red-950 px-2 py-1 rounded-full">
                                                    <XCircle className="h-3 w-3" /> Fail
                                                </span>
                                            )}
                                        </div>

                                        {/* Feedback button */}
                                        <div className="col-span-1 flex justify-end">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                                                onClick={() => navigate(`/detailed-result/${h.id}`)}
                                                title="View detailed feedback"
                                                aria-label={`View feedback for ${h.exam_title}`}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer note */}
                        <div className="px-5 py-3 bg-muted/20 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Award className="h-3 w-3" />
                                Passing score threshold: <strong className="ml-1 text-foreground">40%</strong>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <FileText className="h-3 w-3" />
                                Click <ChevronRight className="h-3 w-3 inline" /> to view AI-generated feedback
                            </span>
                        </div>
                    </div>
                ) : (
                    /* ── Empty State ── */
                    <div className="bg-card border rounded-2xl shadow-sm">
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <Award className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">No results yet</p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                    Attempt an examination to see your result sheet with grades, scores, and AI feedback.
                                </p>
                            </div>
                            <Button onClick={() => navigate("/exams")} size="sm" className="gap-2 font-bold">
                                View Available Exams
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Results;
