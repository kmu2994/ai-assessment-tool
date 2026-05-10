import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, Plus, PenTool } from "lucide-react";
import type { QuestionEditorProps } from "./types";

const QuestionEditor = ({
    examType,
    newQuestion,
    setNewQuestion,
    editingIdx,
    onAdd,
    onCancelEdit,
}: QuestionEditorProps) => {
    return (
        <div className="space-y-4 animate-scale-in">
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Question Text</Label>
                <Textarea
                    placeholder="Enter your question here..."
                    value={newQuestion.question_text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                    className="min-h-[100px] text-sm bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all p-4"
                />
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                    <div className="h-5 w-5 rounded-lg bg-primary/20 flex items-center justify-center">
                        <PenTool className="h-3 w-3" />
                    </div>
                    Current Question: {examType === 'BOTH' ? newQuestion.question_type.toUpperCase() : examType}
                </div>
                {examType === 'BOTH' && (
                    <div className="flex bg-muted/30 p-0.5 rounded-lg">
                        <Button
                            variant={newQuestion.question_type === 'mcq' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-6 text-[10px] font-bold px-3 rounded-md"
                            onClick={() => setNewQuestion({
                                ...newQuestion,
                                question_type: 'mcq',
                                options: { A: '', B: '', C: '', D: '' },
                                correct_answer: '',
                                model_answer: '',
                            })}
                            type="button"
                        >
                            MCQ
                        </Button>
                        <Button
                            variant={newQuestion.question_type === 'descriptive' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-6 text-[10px] font-bold px-3 rounded-md"
                            onClick={() => setNewQuestion({
                                ...newQuestion,
                                question_type: 'descriptive',
                                options: null,
                                correct_answer: '',
                                model_answer: '',
                            })}
                            type="button"
                        >
                            Descriptive
                        </Button>
                    </div>
                )}
                {editingIdx !== null && (
                    <div className="text-[10px] bg-warning/20 text-warning px-2 py-0.5 rounded-full font-bold uppercase">
                        Editing Q{editingIdx + 1}
                    </div>
                )}
            </div>

            {(examType === "MCQ" || (examType === "BOTH" && newQuestion.question_type === "mcq")) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {["A", "B", "C", "D"].map((opt) => (
                        <div key={opt} className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider">Option {opt}</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder={`Option ${opt}`}
                                    value={newQuestion.options?.[opt] || ""}
                                    onChange={(e) =>
                                        setNewQuestion({
                                            ...newQuestion,
                                            options: { ...newQuestion.options, [opt]: e.target.value },
                                        })
                                    }
                                    className="h-10 text-sm bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all"
                                />
                                <Button
                                    variant={
                                        newQuestion.correct_answer === newQuestion.options?.[opt] &&
                                        newQuestion.options?.[opt] !== ""
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    className={`h-10 w-10 p-0 ${
                                        newQuestion.correct_answer === newQuestion.options?.[opt] &&
                                        newQuestion.options?.[opt] !== ""
                                            ? "bg-success hover:bg-success/90"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        setNewQuestion({ ...newQuestion, correct_answer: newQuestion.options?.[opt] })
                                    }
                                    type="button"
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(examType === "DESCRIPTIVE" || (examType === "BOTH" && newQuestion.question_type === "descriptive")) && (
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider">Model Answer</Label>
                    <Textarea
                        placeholder="Enter the ideal answer for grading reference..."
                        value={newQuestion.model_answer}
                        onChange={(e) => setNewQuestion({ ...newQuestion, model_answer: e.target.value })}
                        className="h-24 text-sm bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all p-4"
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider">Points</Label>
                    <Input
                        type="number"
                        value={newQuestion.points || ""}
                        onChange={(e) =>
                            setNewQuestion({ ...newQuestion, points: e.target.value === "" ? 0 : Number(e.target.value) })
                        }
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                        className="h-10 text-sm bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider">Difficulty</Label>
                    <select
                        className="w-full h-10 px-2 rounded-md border-none ring-1 ring-primary/10 bg-muted/5 text-xs focus:ring-primary focus:ring-2 outline-none transition-all"
                        value={newQuestion.difficulty <= 0.3 ? "Easy" : newQuestion.difficulty <= 0.6 ? "Medium" : "Hard"}
                        onChange={(e) => {
                            const val = e.target.value === "Easy" ? 0.3 : e.target.value === "Medium" ? 0.6 : 0.9;
                            setNewQuestion({ ...newQuestion, difficulty: val });
                        }}
                    >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                    </select>
                </div>
            </div>

            <Button className="w-full h-11 gap-2 font-bold shadow-lg shadow-primary/20" onClick={onAdd}>
                {editingIdx !== null ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingIdx !== null ? "Update Question" : "Add Question to List"}
            </Button>
            {editingIdx !== null && (
                <Button variant="ghost" className="w-full text-xs" onClick={onCancelEdit}>
                    Cancel Edit
                </Button>
            )}
        </div>
    );
};

export default QuestionEditor;
