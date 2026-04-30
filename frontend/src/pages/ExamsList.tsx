import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Loader2, Clock, Target, BookOpen, ChevronRight, ChevronLeft,
    Zap, Shield, CheckCircle2, AlertCircle, Search,
    GraduationCap, CalendarClock, LayoutList, CalendarDays
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { examsApi, Exam } from "@/lib/api";
import { toast } from "sonner";
import { useAccessibility } from "@/hooks/useAccessibility";

/* ── Helpers ── */
const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev  = new Date(year, month, 0).getDate();
    const cells: { day: number; current: boolean; date: Date }[] = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = daysInPrev - i;
        cells.push({ day: d, current: false, date: new Date(year, month - 1, d) });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, current: true, date: new Date(year, month, d) });
    }
    // Next month leading days
    const remaining = 42 - cells.length; // 6 rows × 7
    for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, current: false, date: new Date(year, month + 1, d) });
    }
    return cells;
};

/* ── Component ── */
const ExamsList = () => {
    const navigate = useNavigate();
    const { speak } = useAccessibility();
    const [isLoading, setIsLoading] = useState(true);
    const [exams, setExams] = useState<Exam[]>([]);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');

    // Calendar state
    const today = new Date();
    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => { fetchExams(); }, []);

    const fetchExams = async () => {
        try { setExams(await examsApi.listAvailable()); }
        catch { toast.error("Failed to load available exams"); }
        finally { setIsLoading(false); }
    };

    // Build a map: dateKey → Exam[]
    const examsByDate = useMemo(() => {
        const map: Record<string, Exam[]> = {};
        exams.forEach(e => {
            const d = e.scheduled_at || e.created_at;
            if (!d) return;
            const key = toDateKey(new Date(d));
            (map[key] ??= []).push(e);
        });
        return map;
    }, [exams]);

    const calendarDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);
    const todayKey = toDateKey(today);

    const filtered = exams.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.subject || "").toLowerCase().includes(search.toLowerCase())
    );

    const pending   = exams.filter(e => !e.has_submitted);
    const completed = exams.filter(e => e.has_submitted);

    // Exams for the selected calendar date
    const selectedExams = selectedDate ? (examsByDate[selectedDate] || []) : [];

    const prevMonth = () => {
        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
        else setCalMonth(m => m - 1);
        setSelectedDate(null);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
        else setCalMonth(m => m + 1);
        setSelectedDate(null);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium">Loading examinations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <Navbar />

            <main className="container mx-auto px-4 py-6 space-y-5 animate-fade-in max-w-5xl">

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
                                    Available Examinations
                                </h1>
                                <p className="text-white/60 text-xs mt-1">
                                    AI-adaptive assessments · Secure · Proctored
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center">
                                    <p className="text-white font-black text-xl leading-none">{pending.length}</p>
                                    <p className="text-white/60 text-[10px] uppercase tracking-wider mt-0.5">Pending</p>
                                </div>
                                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center">
                                    <p className="text-white font-black text-xl leading-none">{completed.length}</p>
                                    <p className="text-white/60 text-[10px] uppercase tracking-wider mt-0.5">Done</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search + View toggle */}
                    <div className="flex items-center justify-between gap-4 px-5 py-3 border-t bg-muted/20">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                            <LayoutList className="h-3.5 w-3.5" />
                            {exams.length} examination{exams.length !== 1 ? 's' : ''} total
                        </div>
                        <div className="flex items-center gap-2">
                            {/* View toggle */}
                            <div className="flex items-center bg-muted/40 rounded-lg p-0.5 border">
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                        viewMode === 'calendar'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <CalendarDays className="h-3 w-3" />
                                    Calendar
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                        viewMode === 'table'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <LayoutList className="h-3 w-3" />
                                    Table
                                </button>
                            </div>
                            {viewMode === 'table' && (
                                <div className="relative w-48">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══════════ CALENDAR VIEW ══════════ */}
                {viewMode === 'calendar' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* ── Calendar Grid ── */}
                        <div className="lg:col-span-2 bg-card border rounded-2xl shadow-sm overflow-hidden">
                            {/* Month header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                                    {MONTHS[calMonth]} {calYear}
                                </h2>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Day headers */}
                            <div className="grid grid-cols-7 border-b">
                                {DAYS.map(d => (
                                    <div key={d} className="text-center py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Day cells */}
                            <div className="grid grid-cols-7">
                                {calendarDays.map((cell, i) => {
                                    const key = toDateKey(cell.date);
                                    const dayExams = examsByDate[key] || [];
                                    const isToday  = key === todayKey;
                                    const isSelected = key === selectedDate;
                                    const hasPending = dayExams.some(e => !e.has_submitted);
                                    const hasDone    = dayExams.some(e => e.has_submitted);

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(key === selectedDate ? null : key)}
                                            className={`
                                                relative flex flex-col items-center justify-start py-2 min-h-[68px] border-b border-r transition-all
                                                ${!cell.current ? 'opacity-30' : ''}
                                                ${isSelected ? 'bg-primary/5 ring-2 ring-inset ring-primary/30' : 'hover:bg-muted/30'}
                                                ${isToday && !isSelected ? 'bg-amber-50 dark:bg-amber-950/30' : ''}
                                            `}
                                        >
                                            <span className={`
                                                text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                                                ${isToday ? 'bg-primary text-white' : ''}
                                                ${isSelected && !isToday ? 'bg-primary/20 text-primary' : ''}
                                            `}>
                                                {cell.day}
                                            </span>

                                            {/* Exam indicators */}
                                            {dayExams.length > 0 && (
                                                <div className="flex items-center gap-0.5 mt-1">
                                                    {hasPending && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Pending exam" />
                                                    )}
                                                    {hasDone && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Completed" />
                                                    )}
                                                </div>
                                            )}
                                            {dayExams.length > 0 && (
                                                <span className="text-[9px] font-bold text-primary mt-0.5">
                                                    {dayExams.length} exam{dayExams.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-5 px-5 py-3 border-t bg-muted/20 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Pending
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500" /> Completed
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                                        {today.getDate()}
                                    </span> Today
                                </span>
                            </div>
                        </div>

                        {/* ── Selected Date Panel ── */}
                        <div className="space-y-3">
                            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-muted/50 border-b">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        {selectedDate
                                            ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                            : 'Select a date'}
                                    </p>
                                </div>

                                {!selectedDate ? (
                                    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
                                        <CalendarDays className="h-10 w-10 text-muted-foreground/20" />
                                        <p className="text-xs text-muted-foreground">
                                            Click on a date to view scheduled exams
                                        </p>
                                    </div>
                                ) : selectedExams.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
                                        <BookOpen className="h-8 w-8 text-muted-foreground/20" />
                                        <p className="text-xs text-muted-foreground">No exams on this date</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {selectedExams.map((exam) => (
                                            <div key={exam.id} className="p-4 hover:bg-muted/20 transition-colors space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold truncate">{exam.title}</p>
                                                        <p className="text-[11px] text-muted-foreground">{exam.subject || 'General'}</p>
                                                    </div>
                                                    {exam.is_adaptive ? (
                                                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-full">
                                                            <Zap className="h-2.5 w-2.5" /> AI
                                                        </span>
                                                    ) : (
                                                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                                            <Shield className="h-2.5 w-2.5" /> Std
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Metadata */}
                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {exam.duration_minutes}m</span>
                                                    <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {exam.total_marks} marks</span>
                                                    <span>Pass: {exam.passing_score}%</span>
                                                </div>

                                                {/* Scheduled time */}
                                                {exam.scheduled_at && (
                                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <CalendarClock className="h-3 w-3" />
                                                        {new Date(exam.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                    </p>
                                                )}

                                                {/* Action */}
                                                {exam.has_submitted ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 dark:bg-green-950 px-3 py-1.5 rounded-full">
                                                        <CheckCircle2 className="h-3 w-3" /> Submitted
                                                    </span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="w-full h-8 text-xs font-bold gap-1"
                                                        onClick={() => navigate(`/exam/${exam.id}`)}
                                                    >
                                                        Attempt Exam <ChevronRight className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════ TABLE VIEW ══════════ */}
                {viewMode === 'table' && (
                    <>
                        {filtered.length > 0 ? (
                            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                                <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-muted/50 border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <div className="col-span-1">#</div>
                                    <div className="col-span-3">Examination / Subject</div>
                                    <div className="col-span-2 text-center">Scheduled</div>
                                    <div className="col-span-1 text-center">Duration</div>
                                    <div className="col-span-1 text-center">Marks</div>
                                    <div className="col-span-1 text-center">Pass</div>
                                    <div className="col-span-1 text-center">Mode</div>
                                    <div className="col-span-2 text-right">Status / Action</div>
                                </div>

                                <div className="divide-y divide-border">
                                    {filtered.map((exam, idx) => (
                                        <div
                                            key={exam.id}
                                            className={`grid grid-cols-12 gap-2 items-center px-5 py-4 transition-colors group
                                                ${exam.has_submitted ? 'bg-muted/10' : 'hover:bg-primary/[0.02]'}`}
                                            tabIndex={0}
                                            onFocus={() => speak(exam.title)}
                                        >
                                            <div className="col-span-1">
                                                <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                                            </div>
                                            <div className="col-span-3 min-w-0">
                                                <p className={`font-semibold text-sm leading-tight truncate ${exam.has_submitted ? 'text-muted-foreground' : ''}`}>
                                                    {exam.title}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{exam.subject || 'General'}</p>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <span className="text-[11px] font-medium text-muted-foreground">
                                                    {exam.scheduled_at
                                                        ? new Date(exam.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                                    <Clock className="h-3 w-3" />{exam.duration_minutes}m
                                                </span>
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <span className="text-xs font-bold">{exam.total_marks}</span>
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <span className="text-xs font-semibold text-muted-foreground">{exam.passing_score}%</span>
                                            </div>
                                            <div className="col-span-1 text-center">
                                                {exam.is_adaptive ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-full">
                                                        <Zap className="h-2.5 w-2.5" /> AI
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                                        <Shield className="h-2.5 w-2.5" /> Std
                                                    </span>
                                                )}
                                            </div>
                                            <div className="col-span-2 flex justify-end">
                                                {exam.has_submitted ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 dark:bg-green-950 px-3 py-1.5 rounded-full">
                                                        <CheckCircle2 className="h-3 w-3" /> Submitted
                                                    </span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-4 text-xs font-bold gap-1 shadow-sm"
                                                        onClick={() => navigate(`/exam/${exam.id}`)}
                                                    >
                                                        Attempt <ChevronRight className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-card border rounded-2xl shadow-sm">
                                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                                    {search ? (
                                        <>
                                            <Search className="h-8 w-8 text-muted-foreground/30" />
                                            <p className="text-sm font-semibold">No results for "{search}"</p>
                                            <Button variant="outline" size="sm" onClick={() => setSearch("")}>Clear Search</Button>
                                        </>
                                    ) : (
                                        <>
                                            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                                            <p className="text-sm font-semibold">No Examinations Scheduled</p>
                                            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/student-dashboard")}>
                                                <ChevronLeft className="h-3 w-3" /> Back to Dashboard
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── Info Notice ── */}
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                        <p className="font-bold">Instructions before you begin</p>
                        <p className="font-normal opacity-80">
                            Ensure a stable internet connection · Do not switch tabs or windows during the exam ·
                            Copy/paste is disabled · Keep the browser in full screen · Timer starts as soon as you begin.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ExamsList;
