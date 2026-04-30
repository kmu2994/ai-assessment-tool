import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    CheckCircle2,
    ChevronLeft,
    Save,
    Loader2,
    MessageSquare,
    BrainCircuit,
    User,
    Image as ImageIcon
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { examsApi, SubmissionDetail, SubmissionReview as ReviewData } from "@/lib/api";
import { toast } from "sonner";

const ReviewSubmission = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [review, setReview] = useState<ReviewData>({
        submission_id: submissionId!,
        teacher_remarks: "",
        answer_reviews: [],
        is_finalized: true
    });

    useEffect(() => {
        fetchSubmission();
    }, [submissionId]);

    const fetchSubmission = async () => {
        try {
            const data = await examsApi.getSubmission(submissionId!);
            setSubmission(data);
            // Initialize review data from submission
            setReview({
                submission_id: submissionId!,
                teacher_remarks: data.teacher_remarks || "",
                answer_reviews: data.answers.map(a => ({
                    answer_id: a.answer_id,
                    modified_score: a.current_score,
                    teacher_remarks: a.teacher_remarks || ""
                })),
                is_finalized: data.is_finalized
            });
        } catch {
            toast.error("Failed to load submission");
            navigate("/teacher");
        } finally {
            setIsLoading(false);
        }
    };

    const handleScoreChange = (answerId: string, score: number) => {
        setReview((prev) => ({
            ...prev,
            answer_reviews: prev.answer_reviews.map((ar) =>
                ar.answer_id === answerId ? { ...ar, modified_score: score } : ar
            ),
        }));
    };

    const handleRemarkChange = (answerId: string, remark: string) => {
        setReview((prev) => ({
            ...prev,
            answer_reviews: prev.answer_reviews.map((ar) =>
                ar.answer_id === answerId ? { ...ar, teacher_remarks: remark } : ar
            ),
        }));
    };

    const handleSubmitReview = async (finalize: boolean) => {
        setIsSaving(true);
        try {
            await examsApi.reviewSubmission({
                ...review,
                is_finalized: finalize
            });
            toast.success(finalize ? "Result finalized and published!" : "Review saved as draft.");
            if (finalize) navigate("/teacher");
            else fetchSubmission();
        } catch {
            toast.error("Failed to save review");
        } finally {
            setIsSaving(false);
        }
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

    if (!submission) return null;

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <main className="container mx-auto p-6 max-w-5xl space-y-8 animate-fade-in">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/teacher")}
                            className="gap-2 -ml-2 text-muted-foreground"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Button>
                        <h1 className="text-3xl font-bold">Review Submission</h1>
                        <p className="text-muted-foreground">
                            {submission.exam_title} • Student ID: {submission.student_id.slice(-8)}
                        </p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button
                            variant="outline"
                            className="flex-1 md:flex-none"
                            onClick={() => handleSubmitReview(false)}
                            disabled={isSaving}
                        >
                            Save Draft
                        </Button>
                        <Button
                            className="flex-1 md:flex-none gap-2"
                            onClick={() => handleSubmitReview(true)}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Finalize Result
                        </Button>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-primary" />
                                Overall Feedback
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <Textarea
                                placeholder="Add overall remarks for the student..."
                                className="min-h-[100px] bg-muted/30 border-none"
                                value={review.teacher_remarks}
                                onChange={(e) => setReview(prev => ({ ...prev, teacher_remarks: e.target.value }))}
                            />
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">AI Score Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-muted-foreground">Original AI Score</p>
                                    <h2 className="text-4xl font-black">{submission.percentage.toFixed(1)}%</h2>
                                </div>
                                <Badge variant={submission.percentage >= 40 ? "secondary" : "destructive"}>
                                    {submission.percentage >= 40 ? "PASSED" : "FAILED"}
                                </Badge>
                            </div>
                            <div className="pt-4 border-t border-primary/10">
                                <div className="flex justify-between text-xs mb-1">
                                    <span>Total Points</span>
                                    <span className="font-bold">{submission.total_score} / {submission.max_score}</span>
                                </div>
                                <div className="w-full bg-primary/20 h-1.5 rounded-full">
                                    <div
                                        className="bg-primary h-full rounded-full transition-all duration-500"
                                        style={{ width: `${submission.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Answers Breakdown */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 px-1">
                        <BrainCircuit className="h-6 w-6 text-accent" />
                        Answer-by-Answer AI Analysis
                    </h3>

                    {submission.answers.map((ans, idx) => (
                        <Card key={ans.answer_id} className={`overflow-hidden border-2 rounded-xl transition-all ${ans.plagiarism_detected ? 'border-destructive/30 shadow-destructive/5' : ''}`}>
                            <div className={`p-4 border-b flex justify-between items-center ${ans.plagiarism_detected ? 'bg-destructive/5' : 'bg-muted/30'}`}>
                                <div className="flex items-center gap-3">
                                    <span className="bg-background text-foreground font-bold h-7 w-7 rounded-md flex items-center justify-center border text-sm">
                                        Q{idx + 1}
                                    </span>
                                    <span className="text-sm font-semibold opacity-70">Descriptive Question</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {ans.plagiarism_detected && (
                                        <Badge variant="destructive" className="animate-pulse">Plagiarism Possible</Badge>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground">Points:</Label>
                                        <Input
                                            type="number"
                                            className="w-20 h-8 text-center font-bold"
                                            value={review.answer_reviews.find(r => r.answer_id === ans.answer_id)?.modified_score}
                                            onChange={(e) => handleScoreChange(ans.answer_id, Number(e.target.value))}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                                            max={ans.max_points}
                                            min={0}
                                        />
                                        <span className="text-sm font-bold text-muted-foreground">/ {ans.max_points}</span>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Side: Question & Answers */}
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground uppercase font-bold">Question</Label>
                                            <p className="font-semibold text-lg">{ans.question_text}</p>
                                        </div>
                                        <div className="p-4 bg-muted/20 border-2 border-dashed rounded-xl">
                                            <Label className="text-xs text-muted-foreground uppercase font-bold">Model Answer (Reference)</Label>
                                            <p className="text-sm mt-1 whitespace-pre-wrap italic">{ans.model_answer}</p>
                                        </div>
                                        <div className="p-5 bg-primary/5 rounded-2xl border-2 border-primary/20">
                                            <Label className="text-xs text-primary uppercase font-bold flex items-center gap-2 mb-2">
                                                <User className="h-3 w-3" />
                                                Student's Response
                                            </Label>
                                            <p className="text-foreground leading-relaxed">
                                                {ans.student_answer || <span className="text-muted-foreground italic">No answer submitted</span>}
                                            </p>
                                            {ans.extracted_text && ans.extracted_text !== ans.student_answer && (
                                                <div className="mt-4 pt-4 border-t border-primary/10">
                                                    <Badge variant="outline" className="text-[10px] mb-2">OCR Extracted Text</Badge>
                                                    <p className="text-xs text-muted-foreground italic font-mono">{ans.extracted_text}</p>
                                                </div>
                                            )}
                                            {ans.image_url && (
                                                <div className="mt-4 pt-4 border-t border-primary/10">
                                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1 mb-2">
                                                        <ImageIcon className="h-3 w-3" />
                                                        Original Submission Image
                                                    </Label>
                                                    <div className="rounded-lg overflow-hidden border bg-white">
                                                        <img
                                                            src={ans.image_url}
                                                            alt="Student Submission"
                                                            className="w-full h-auto max-h-[300px] object-contain hover:scale-105 transition-transform cursor-zoom-in"
                                                            onClick={() => window.open(ans.image_url!, '_blank')}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side: AI Feedback & Teacher Remarks */}
                                    <div className="space-y-6 flex flex-col justify-between">
                                        <div className="p-5 rounded-2xl bg-accent/5 border border-accent/20">
                                            <Label className="text-xs text-accent uppercase font-bold flex items-center gap-2 mb-3">
                                                <BrainCircuit className="h-4 w-4" />
                                                AI Cognitive Analysis
                                            </Label>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span>AI Calculated Score:</span>
                                                    <span className="font-black text-accent">{ans.ai_score} / {ans.max_points}</span>
                                                </div>
                                                <div className="p-3 bg-white/50 rounded-lg text-sm italic border border-accent/10">
                                                    "{ans.feedback}"
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-primary" />
                                                Teacher Remarks for this Answer
                                            </Label>
                                            <Textarea
                                                placeholder="Add specific comments about this answer..."
                                                className="min-h-[100px] border-none bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary"
                                                value={review.answer_reviews.find(r => r.answer_id === ans.answer_id)?.teacher_remarks}
                                                onChange={(e) => handleRemarkChange(ans.answer_id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>

            {/* Sticky Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t z-50">
                <div className="container mx-auto flex justify-between items-center max-w-5xl">
                    <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">Drafts are saved automatically to your browser</p>
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <Button
                            variant="secondary"
                            className="flex-1 sm:px-8 h-12"
                            onClick={() => handleSubmitReview(false)}
                            disabled={isSaving}
                        >
                            Save Progress
                        </Button>
                        <Button
                            className="flex-1 sm:px-10 h-12 font-bold shadow-lg shadow-primary/20"
                            onClick={() => handleSubmitReview(true)}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Publish Result
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewSubmission;
