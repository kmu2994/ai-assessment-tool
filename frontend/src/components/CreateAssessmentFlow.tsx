import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    X, PlusCircle, Loader2, Check, ChevronRight, ChevronLeft,
} from "lucide-react";
import { examsApi, ExamCreate, QuestionCreate, Question } from "@/lib/api";
import { toast } from "sonner";

import StepDetails from "./assessment/StepDetails";
import StepQuestions from "./assessment/StepQuestions";
import StepReview from "./assessment/StepReview";
import type { CreateAssessmentFlowProps } from "./assessment/types";

const CreateAssessmentFlow = ({ onClose, onSuccess }: CreateAssessmentFlowProps) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Basic Details
    const [examData, setExamData] = useState<ExamCreate>({
        title: "",
        subject: "",
        description: "1. Read all questions carefully before answering.\n2. The timer starts as soon as you begin the assessment.\n3. Ensure a stable internet connection throughout the session.\n4. No electronic devices or external resources are permitted.\n5. For Descriptive answers, focus on clarity and relevant examples.\n6. Academic integrity is mandatory; any violation will lead to disqualification.",
        type: "MCQ",
        is_adaptive: true,
        duration_minutes: 60,
        total_questions: 10,
        total_marks: 100,
        passing_score: 40,
        scheduled_at: new Date().toISOString().slice(0, 16),
        questions: [],
    });

    // Step 2: Question management state
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<"manual" | "ai" | "bank">("manual");
    const [newQuestion, setNewQuestion] = useState<QuestionCreate>({
        question_text: "",
        question_type: "mcq",
        difficulty: 0.5,
        points: 1,
        options: { A: "", B: "", C: "", D: "" },
        correct_answer: "",
        model_answer: "",
        source: "MANUAL",
    });

    // AI Generation State
    const [extractedText, setExtractedText] = useState("");
    const [aiQuestions, setAiQuestions] = useState<Question[]>([]);
    const [selectedAiIndices, setSelectedAiIndices] = useState<number[]>([]);
    const [aiOptions, setAiOptions] = useState({ count: 5, difficulty: "Medium" });
    const [isExtracting, setIsExtracting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [saveBankTopic, setSaveBankTopic] = useState("");

    // Question Bank State
    const [bankQuestions, setBankQuestions] = useState<any[]>([]);
    const [selectedBankIndices, setSelectedBankIndices] = useState<number[]>([]);
    const [isLoadingBank] = useState(false);
    const [bankFilter, setBankFilter] = useState({ subject: "", topic: "" });
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

    // Sync new question template when assessment type changes
    useEffect(() => {
        setNewQuestion((prev) => ({
            ...prev,
            question_type: examData.type.toLowerCase() as "mcq" | "descriptive",
            points: examData.type === "MCQ" ? 1 : 5,
            options: examData.type === "MCQ" ? { A: "", B: "", C: "", D: "" } : null,
            correct_answer: "",
            model_answer: "",
        }));
    }, [examData.type]);

    // ── Handlers ──────────────────────────────────────────────────────────

    const addManualQuestion = () => {
        if (!newQuestion.question_text.trim()) {
            toast.error("Please enter question text");
            return;
        }
        if (newQuestion.question_type === "mcq" && (!newQuestion.correct_answer || !newQuestion.options?.A)) {
            toast.error("Please provide options and select a correct answer");
            return;
        }
        if (newQuestion.question_type === "descriptive" && !newQuestion.model_answer) {
            toast.error("Please provide a model answer");
            return;
        }

        if (editingIdx !== null) {
            setExamData((prev) => {
                const updated = [...prev.questions];
                updated[editingIdx] = { ...newQuestion };
                return { ...prev, questions: updated };
            });
            setEditingIdx(null);
            toast.success("Question updated");
        } else {
            setExamData((prev) => ({
                ...prev,
                questions: [...prev.questions, { ...newQuestion }],
            }));
            toast.success("Question added");
        }

        setNewQuestion({
            question_text: "",
            question_type: newQuestion.question_type,
            difficulty: 0.5,
            points: newQuestion.points,
            options: newQuestion.question_type === "mcq" ? { A: "", B: "", C: "", D: "" } : null,
            correct_answer: "",
            model_answer: "",
            source: "MANUAL",
        });
    };

    const editQuestion = (idx: number) => {
        setEditingIdx(idx);
        const q = examData.questions[idx];
        setNewQuestion({
            question_text: q.question_text,
            question_type: q.question_type as "mcq" | "descriptive",
            difficulty: q.difficulty,
            points: q.points,
            options: q.options ? { ...q.options } : null,
            correct_answer: q.correct_answer,
            model_answer: q.model_answer,
            source: q.source || "MANUAL",
        });
        setActiveTab("manual");
    };

    const removeQuestion = (idx: number) => {
        setExamData((prev) => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== idx),
        }));
    };

    const balanceMarks = () => {
        const subsetSize = examData.is_adaptive
            ? examData.total_questions || examData.questions.length
            : examData.questions.length;
        if (subsetSize <= 0) return;

        const marksPerQuestion = Number(((examData.total_marks || 0) / subsetSize).toFixed(1));
        setExamData((prev) => ({
            ...prev,
            questions: prev.questions.map((q) => ({ ...q, points: marksPerQuestion })),
        }));
        toast.success(`Balanced marks: Each question is now ${marksPerQuestion} points`);
    };

    const handleSubmit = async () => {
        if (examData.questions.length === 0) {
            toast.error("Please add at least one question");
            return;
        }
        setIsLoading(true);
        try {
            await examsApi.createExam(examData);
            toast.success("Assessment created successfully!");
            onSuccess();
        } catch {
            toast.error("Failed to create assessment");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-scale-in">
                <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <PlusCircle className="h-6 w-6 text-primary" />
                                Create New Assessment
                            </CardTitle>
                            <CardDescription>Follow the steps to build your exam</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center justify-center mt-6 gap-2">
                        {[
                            { step: 1, label: "Details" },
                            { step: 2, label: "Questions" },
                            { step: 3, label: "Review" },
                        ].map((s) => (
                            <div key={s.step} className="flex items-center">
                                <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                                    <div
                                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                            step === s.step
                                                ? "bg-primary text-primary-foreground shadow-lg scale-110 ring-4 ring-primary/20"
                                                : step > s.step
                                                  ? "bg-success text-success-foreground"
                                                  : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {step > s.step ? <Check className="h-4 w-4" /> : s.step}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${step === s.step ? "text-primary" : "text-muted-foreground"}`}>
                                        {s.label}
                                    </span>
                                </div>
                                {s.step < 3 && (
                                    <div className={`h-[2px] w-12 mx-2 -mt-4 transition-colors duration-500 ${step > s.step ? "bg-success" : "bg-muted"}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-6">
                    {step === 1 && <StepDetails examData={examData} setExamData={setExamData} />}

                    {step === 2 && (
                        <StepQuestions
                            examData={examData}
                            setExamData={setExamData}
                            editingIdx={editingIdx}
                            setEditingIdx={setEditingIdx}
                            newQuestion={newQuestion}
                            setNewQuestion={setNewQuestion}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            onAddManualQuestion={addManualQuestion}
                            onEditQuestion={editQuestion}
                            onRemoveQuestion={removeQuestion}
                            onBalanceMarks={balanceMarks}
                            aiProps={{
                                examData,
                                setExamData,
                                extractedText,
                                setExtractedText,
                                aiQuestions,
                                setAiQuestions,
                                selectedAiIndices,
                                setSelectedAiIndices,
                                aiOptions,
                                setAiOptions,
                                isExtracting,
                                setIsExtracting,
                                isGenerating,
                                setIsGenerating,
                                saveBankTopic,
                                setSaveBankTopic,
                            }}
                            bankProps={{
                                examData,
                                setExamData,
                                bankQuestions,
                                setBankQuestions,
                                selectedBankIndices,
                                setSelectedBankIndices,
                                isLoadingBank,
                                bankFilter,
                                setBankFilter,
                                availableSubjects,
                                setAvailableSubjects,
                                availableTopics,
                                setAvailableTopics,
                                selectedTopics,
                                setSelectedTopics,
                            }}
                        />
                    )}

                    {step === 3 && <StepReview examData={examData} />}
                </CardContent>

                <CardHeader className="border-t bg-muted/30 py-4 mt-auto">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            className="gap-2 font-bold px-6"
                            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
                        >
                            {step === 1 ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                            {step === 1 ? "Cancel" : "Back"}
                        </Button>

                        <div className="flex gap-3">
                            {step < 3 ? (
                                <Button
                                    className="gap-2 font-bold px-8 shadow-lg shadow-primary/20"
                                    onClick={() => setStep(step + 1)}
                                    disabled={step === 1 && !examData.title.trim()}
                                >
                                    Next Step
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    className="gap-2 font-bold px-10 shadow-lg shadow-primary/40 bg-gradient-to-r from-primary to-primary/80"
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    {isLoading ? "Publishing..." : "Finalize & Publish"}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
};

export default CreateAssessmentFlow;
