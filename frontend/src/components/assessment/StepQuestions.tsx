import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Pencil, Trash2, Sparkles, AlertCircle, ScrollText, Target, Library,
} from "lucide-react";
import { questionBankApi } from "@/lib/api";
import QuestionEditor from "./QuestionEditor";
import AIGenerationPanel from "./AIGenerationPanel";
import QuestionBankPanel from "./QuestionBankPanel";
import type { StepQuestionsProps } from "./types";

const StepQuestions = ({
    examData,
    editingIdx,
    setEditingIdx,
    newQuestion,
    setNewQuestion,
    activeTab,
    setActiveTab,
    onAddManualQuestion,
    onEditQuestion,
    onRemoveQuestion,
    onBalanceMarks,
    aiProps,
    bankProps,
}: StepQuestionsProps) => {

    const actualTotal = examData.is_adaptive
        ? examData.questions.length > 0
            ? (examData.questions.reduce((acc, q) => acc + (q.points || 0), 0) / examData.questions.length) *
              (examData.total_questions || examData.questions.length)
            : 0
        : examData.questions.reduce((acc, q) => acc + (q.points || 0), 0);

    const targetTotal = examData.total_marks || 0;
    const isMismatch = actualTotal.toFixed(1) !== targetTotal.toFixed(1);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Left Side: Question List Preview */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <h3 className="text-lg font-black flex items-center gap-2 leading-none">
                            <ScrollText className="h-5 w-5 text-primary" />
                            Question Pool
                            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {examData.questions.length} total
                            </span>
                        </h3>
                        {examData.is_adaptive && (
                            <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1 mt-0.5">
                                <Target className="h-3 w-3 text-primary" />
                                EACH STUDENT WILL BE ASKED {examData.total_questions || examData.questions.length} QUESTIONS
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col items-end">
                        <div className={`text-sm font-black ${isMismatch ? "text-destructive" : "text-success"}`}>
                            Actual Total: {actualTotal.toFixed(1)} / {targetTotal} Target
                        </div>
                        {examData.questions.length > 0 && (
                            <Button
                                variant="link"
                                className="h-auto p-0 text-[10px] text-primary flex items-center gap-1 hover:no-underline font-bold"
                                onClick={onBalanceMarks}
                                title="Redistribute question points evenly so they add up to the target total marks"
                            >
                                <Sparkles className="h-3 w-3" />
                                Auto-Balance (Each Q ={" "}
                                {(
                                    (examData.total_marks || 0) /
                                    (examData.is_adaptive
                                        ? examData.total_questions || examData.questions.length
                                        : examData.questions.length)
                                ).toFixed(1)}{" "}
                                pts)
                            </Button>
                        )}
                    </div>
                    {isMismatch && (
                        <span className="flex items-center gap-1 text-[10px] text-destructive font-bold" title="Use Auto-Balance to fix question points">
                            <AlertCircle className="h-3 w-3" />
                            Mismatch — use Auto-Balance ↑
                        </span>
                    )}
                </div>
                <div className="space-y-3 min-h-[300px] max-h-[500px] overflow-y-auto pr-2">
                    {examData.questions.map((q, idx) => (
                        <Card key={idx} className="relative group border-l-4 border-l-primary hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                Q{idx + 1}
                                            </span>
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    q.source === "AI" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                                                }`}
                                            >
                                                {q.source}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed">{q.question_text}</p>
                                        <div className="mt-2 flex gap-3 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                            <span>Difficulty: {q.difficulty <= 0.3 ? "Easy" : q.difficulty <= 0.6 ? "Medium" : "Hard"}</span>
                                            <span>Marks: {q.points}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => onEditQuestion(idx)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => onRemoveQuestion(idx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {examData.questions.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/10">
                            <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-2" />
                            <p className="text-muted-foreground text-sm">No questions added yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side: Addition Methods */}
            <div className="space-y-6">
                <div className="bg-muted/20 rounded-xl p-1 flex">
                    <Button
                        variant={activeTab === "manual" ? "default" : "ghost"}
                        className="flex-1 rounded-lg"
                        onClick={() => setActiveTab("manual")}
                    >
                        Manual Entry
                    </Button>
                    <Button
                        variant={activeTab === "ai" ? "default" : "ghost"}
                        className="flex-1 rounded-lg gap-2 shadow-sm"
                        onClick={() => setActiveTab("ai")}
                    >
                        <Sparkles className="h-4 w-4" />
                        AI Generation
                    </Button>
                    <Button
                        variant={activeTab === "bank" ? "default" : "ghost"}
                        className="flex-1 rounded-lg gap-2"
                        onClick={async () => {
                            setActiveTab("bank");
                            bankProps.setBankFilter({ subject: "", topic: "" });
                            bankProps.setSelectedTopics([]);
                            try {
                                const questions = await questionBankApi.list();
                                bankProps.setBankQuestions(questions);
                                const subjects = [...new Set(questions.map((q: any) => q.subject).filter(Boolean))] as string[];
                                const topics = [...new Set(questions.map((q: any) => q.topic).filter(Boolean))] as string[];
                                bankProps.setAvailableSubjects(subjects);
                                bankProps.setAvailableTopics(topics);
                            } catch (e) {
                                console.error("Error fetching question bank:", e);
                            }
                        }}
                    >
                        <Library className="h-4 w-4" />
                        Q Bank
                    </Button>
                </div>

                {activeTab === "manual" && (
                    <QuestionEditor
                        examType={examData.type}
                        newQuestion={newQuestion}
                        setNewQuestion={setNewQuestion}
                        editingIdx={editingIdx}
                        onAdd={onAddManualQuestion}
                        onCancelEdit={() => {
                            setEditingIdx(null);
                            setNewQuestion({
                                question_text: "",
                                question_type: "mcq",
                                difficulty: 0.5,
                                points: 1,
                                options: { A: "", B: "", C: "", D: "" },
                                correct_answer: "",
                                model_answer: "",
                                source: "MANUAL",
                            });
                        }}
                    />
                )}

                {activeTab === "ai" && <AIGenerationPanel {...aiProps} />}
                {activeTab === "bank" && <QuestionBankPanel {...bankProps} />}
            </div>
        </div>
    );
};

export default StepQuestions;
