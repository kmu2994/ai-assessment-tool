import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft, MessageSquare, BrainCircuit, User,
    Award, CheckCircle2, XCircle, Image as ImageIcon,
    Loader2, GraduationCap, FileText, Target, Hash
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { examsApi, SubmissionDetail } from "@/lib/api";
import { toast } from "sonner";

/* ── Grade helper ── */
const getGrade = (pct: number) => {
    if (pct >= 90) return { label: 'O',  color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/60', border: 'border-violet-300 dark:border-violet-700', bar: 'bg-violet-500' };
    if (pct >= 80) return { label: 'A+', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/60',     border: 'border-blue-300 dark:border-blue-700',   bar: 'bg-blue-500' };
    if (pct >= 70) return { label: 'A',  color: 'text-sky-600',    bg: 'bg-sky-50 dark:bg-sky-950/60',       border: 'border-sky-300 dark:border-sky-700',     bar: 'bg-sky-500' };
    if (pct >= 60) return { label: 'B+', color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/60',   border: 'border-green-300 dark:border-green-700', bar: 'bg-green-500' };
    if (pct >= 50) return { label: 'B',  color: 'text-lime-600',   bg: 'bg-lime-50 dark:bg-lime-950/60',     border: 'border-lime-300 dark:border-lime-700',   bar: 'bg-lime-500' };
    if (pct >= 40) return { label: 'C',  color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/60', border: 'border-yellow-300 dark:border-yellow-700',bar: 'bg-yellow-500' };
    return           { label: 'F',  color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/60',       border: 'border-red-300 dark:border-red-700',     bar: 'bg-red-500' };
};

const ViewDetailedResult = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);

    useEffect(() => {
        if (submissionId) fetchSubmission();
    }, [submissionId]);

    const fetchSubmission = async () => {
        try {
            const data = await examsApi.getSubmission(submissionId!);
            setSubmission(data);
        } catch {
            toast.error("Failed to load result details");
            navigate("/results");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium">Loading feedback report...</p>
                </div>
            </div>
        );
    }

    if (!submission) return null;

    const pct    = Math.round(submission.percentage || 0);
    const passed = pct >= 40;
    const grade  = getGrade(pct);
    const submittedDate = submission.submitted_at
        ? new Date(submission.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="min-h-screen bg-muted/30 pb-16">
            <Navbar />

            <main className="container mx-auto px-4 py-6 max-w-4xl space-y-5 animate-fade-in">

                {/* ── Page Header Banner ── */}
                <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                    <div className={`px-6 py-5 relative overflow-hidden ${passed
                        ? 'bg-gradient-to-r from-primary/90 to-primary'
                        : 'bg-gradient-to-r from-destructive/80 to-destructive/70'}`}
                    >
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
                            <div className="w-28 h-28 rounded-full border-[10px] border-white" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                            <div>
                                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
                                    Examination Portal · Feedback Report
                                </p>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2 leading-tight">
                                    <GraduationCap className="h-5 w-5 flex-shrink-0" />
                                    {submission.exam_title}
                                </h1>
                                <p className="text-white/60 text-xs mt-1">
                                    Submitted on {submittedDate}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/results")}
                                className="text-white/80 hover:text-white hover:bg-white/10 gap-2 self-start md:self-auto"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Results
                            </Button>
                        </div>
                    </div>

                    {/* ── Score Summary Row ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
                        {/* Score */}
                        <div className="flex items-center gap-3 px-5 py-4">
                            <div className="p-2 rounded-lg bg-muted/60">
                                <Award className="h-4 w-4 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Final Score</p>
                                <p className="text-xl font-black leading-tight">
                                    {submission.total_score?.toFixed(1) ?? '—'}
                                    <span className="text-sm font-normal text-muted-foreground"> / {submission.max_score}</span>
                                </p>
                            </div>
                        </div>
                        {/* Percentage */}
                        <div className="flex items-center gap-3 px-5 py-4">
                            <div className="p-2 rounded-lg bg-muted/60">
                                <Target className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Percentage</p>
                                <p className="text-xl font-black leading-tight">{pct}%</p>
                            </div>
                        </div>
                        {/* Grade */}
                        <div className="flex items-center gap-3 px-5 py-4">
                            <div className="p-2 rounded-lg bg-muted/60">
                                <FileText className="h-4 w-4 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Grade</p>
                                <span className={`text-xl font-black ${grade.color}`}>{grade.label}</span>
                            </div>
                        </div>
                        {/* Result */}
                        <div className="flex items-center gap-3 px-5 py-4">
                            <div className="p-2 rounded-lg bg-muted/60">
                                {passed
                                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    : <XCircle className="h-4 w-4 text-red-600" />
                                }
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Result</p>
                                <span className={`text-sm font-black ${passed ? 'text-green-600' : 'text-red-600'}`}>
                                    {passed ? 'PASSED' : 'FAILED'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Score Progress Bar ── */}
                    <div className="px-5 py-3 border-t bg-muted/10">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mb-1.5">
                            <span>Score Progress</span>
                            <span>{pct}% · Passing threshold: 40%</span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden relative">
                            {/* Passing line */}
                            <div className="absolute top-0 bottom-0 w-px bg-foreground/20 z-10" style={{ left: '40%' }} />
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${grade.bar}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Teacher Remarks (if any) ── */}
                {submission.teacher_remarks && (
                    <div className="bg-card border rounded-2xl p-5 shadow-sm flex items-start gap-4">
                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                Teacher's Overall Remarks
                            </p>
                            <p className="text-sm text-foreground leading-relaxed italic">
                                "{submission.teacher_remarks}"
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Question-by-Question Breakdown ── */}
                <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                    {/* Section header */}
                    <div className="px-5 py-3 bg-muted/50 border-b flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Detailed Answer Breakdown · {submission.answers.length} Question{submission.answers.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="divide-y divide-border">
                        {submission.answers.map((ans, idx) => {
                            const qPct   = ans.max_points > 0 ? Math.round((ans.current_score / ans.max_points) * 100) : 0;
                            const qGrade = getGrade(qPct);
                            return (
                                <div key={ans.answer_id} className="p-5 space-y-4">

                                    {/* ── Q header ── */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center border border-primary/20">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                                    <Hash className="h-3 w-3" />
                                                    Question {idx + 1}
                                                </p>
                                                <p className="text-sm font-semibold text-foreground leading-snug mt-0.5">
                                                    {ans.question_text}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                            <span className={`text-sm font-black px-3 py-1 rounded-lg border ${qGrade.bg} ${qGrade.color} ${qGrade.border}`}>
                                                {ans.current_score} / {ans.max_points}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-semibold">{qPct}%</span>
                                        </div>
                                    </div>

                                    {/* Per-question progress bar */}
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${qGrade.bar}`}
                                            style={{ width: `${qPct}%` }}
                                        />
                                    </div>

                                    {/* ── Answer + Feedback grid ── */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* Student's answer */}
                                        <div className={`rounded-xl border p-4 space-y-2 ${qGrade.bg} ${qGrade.border}`}>
                                            <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
                                                <User className="h-3 w-3" />
                                                Your Response
                                            </p>
                                            <p className="text-sm text-foreground leading-relaxed">
                                                {ans.student_answer || (
                                                    <span className="italic text-muted-foreground">No answer submitted</span>
                                                )}
                                            </p>
                                            {/* Uploaded image */}
                                            {ans.image_url && (
                                                <div className="mt-3 pt-3 border-t border-current/10">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground mb-2">
                                                        <ImageIcon className="h-3 w-3" />
                                                        Uploaded Image
                                                    </p>
                                                    <div
                                                        className="rounded-lg overflow-hidden border bg-white group cursor-zoom-in"
                                                        onClick={() => window.open(ans.image_url!, '_blank')}
                                                    >
                                                        <img
                                                            src={ans.image_url}
                                                            alt="Handwritten answer"
                                                            className="w-full h-auto max-h-48 object-contain group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Feedback column */}
                                        <div className="space-y-3">
                                            {/* AI feedback */}
                                            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 p-4">
                                                <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-violet-600 dark:text-violet-400 mb-2">
                                                    <BrainCircuit className="h-3.5 w-3.5" />
                                                    AI Feedback
                                                </p>
                                                <p className="text-sm text-foreground/80 leading-relaxed italic">
                                                    "{ans.feedback || 'No AI feedback available for this answer.'}"
                                                </p>
                                            </div>

                                            {/* Teacher remark */}
                                            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4">
                                                <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-2">
                                                    <MessageSquare className="h-3.5 w-3.5" />
                                                    Teacher's Remark
                                                </p>
                                                <p className="text-sm text-foreground leading-relaxed">
                                                    {ans.teacher_remarks || 'No specific remarks for this question.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 bg-muted/20 border-t text-[10px] text-muted-foreground flex items-center gap-2">
                        <BrainCircuit className="h-3 w-3" />
                        AI feedback is generated automatically based on semantic similarity to model answers.
                    </div>
                </div>

            </main>
        </div>
    );
};

export default ViewDetailedResult;
