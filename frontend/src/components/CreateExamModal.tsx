import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { examsApi, ExamCreate, QuestionCreate } from "@/lib/api";
import { toast } from "sonner";

interface CreateExamModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateExamModal = ({ onClose, onSuccess }: CreateExamModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [examData, setExamData] = useState<ExamCreate>({
        title: "",
        subject: "",
        description: "",
        type: "MCQ",
        is_adaptive: true,
        duration_minutes: 60,
        total_marks: 100,
        passing_score: 40,
        questions: []
    });

    const [newQuestion, setNewQuestion] = useState<QuestionCreate>({
        question_text: "",
        question_type: "mcq",
        difficulty: 0.5,
        points: 1,
        options: { A: "", B: "", C: "", D: "" },
        correct_answer: "",
        model_answer: ""
    });

    const addQuestion = () => {
        if (!newQuestion.question_text.trim()) {
            toast.error("Please enter question text");
            return;
        }

        if (newQuestion.question_type === "mcq" && !newQuestion.correct_answer) {
            toast.error("Please select correct answer");
            return;
        }

        setExamData(prev => ({
            ...prev,
            questions: [...prev.questions, { ...newQuestion }]
        }));

        // Reset question form
        setNewQuestion({
            question_text: "",
            question_type: "mcq",
            difficulty: 0.5,
            points: 1,
            options: { A: "", B: "", C: "", D: "" },
            correct_answer: "",
            model_answer: ""
        });

        toast.success("Question added");
    };

    const removeQuestion = (index: number) => {
        setExamData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        if (!examData.title.trim()) {
            toast.error("Please enter exam title");
            return;
        }

        if (examData.questions.length === 0) {
            toast.error("Please add at least one question");
            return;
        }

        setIsLoading(true);
        try {
            await examsApi.createExam(examData);
            toast.success("Exam created successfully!");
            onSuccess();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Failed to create exam");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Create New Exam</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Exam Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Exam Title</Label>
                            <Input
                                id="title"
                                value={examData.title}
                                onChange={(e) => setExamData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g., JavaScript Fundamentals"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration (minutes)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={examData.duration_minutes}
                                onChange={(e) => setExamData(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={examData.description}
                                onChange={(e) => setExamData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe what this exam covers..."
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="adaptive"
                                    checked={examData.is_adaptive}
                                    onCheckedChange={(checked) => setExamData(prev => ({ ...prev, is_adaptive: checked }))}
                                />
                                <Label htmlFor="adaptive">Adaptive Testing</Label>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="passing">Passing Score (%)</Label>
                            <Input
                                id="passing"
                                type="number"
                                value={examData.passing_score}
                                onChange={(e) => setExamData(prev => ({ ...prev, passing_score: Number(e.target.value) }))}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                            />
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-4">
                        <h3 className="font-semibold">Questions ({examData.questions.length})</h3>
                        {examData.questions.map((q, idx) => (
                            <div key={idx} className="p-3 border rounded-lg flex items-start justify-between gap-2 bg-muted/30">
                                <div className="flex-1">
                                    <p className="font-medium text-sm">Q{idx + 1}: {q.question_text}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Type: {q.question_type} | Difficulty: {q.difficulty} | Points: {q.points}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeQuestion(idx)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Add Question Form */}
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                        <h3 className="font-semibold">Add New Question</h3>

                        <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Textarea
                                value={newQuestion.question_text}
                                onChange={(e) => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                                placeholder="Enter your question..."
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Question Type</Label>
                                <select
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                    value={newQuestion.question_type}
                                    onChange={(e) => setNewQuestion(prev => ({ ...prev, question_type: e.target.value }))}
                                >
                                    <option value="mcq">Multiple Choice</option>
                                    <option value="descriptive">Descriptive</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Difficulty (0-1)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="1"
                                    value={newQuestion.difficulty}
                                    onChange={(e) => setNewQuestion(prev => ({ ...prev, difficulty: Number(e.target.value) }))}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Marks / Points</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={newQuestion.points}
                                    onChange={(e) => setNewQuestion(prev => ({ ...prev, points: Number(e.target.value) }))}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                                />
                            </div>
                        </div>

                        {newQuestion.question_type === "mcq" && (
                            <div className="space-y-3">
                                <Label>Options</Label>
                                {["A", "B", "C", "D"].map((letter) => (
                                    <div key={letter} className="flex items-center gap-2">
                                        <span className="font-semibold w-6">{letter}.</span>
                                        <Input
                                            value={(newQuestion.options as Record<string, string>)?.[letter] || ""}
                                            onChange={(e) => setNewQuestion(prev => ({
                                                ...prev,
                                                options: { ...prev.options, [letter]: e.target.value }
                                            }))}
                                            placeholder={`Option ${letter}`}
                                        />
                                        <input
                                            type="radio"
                                            name="correct"
                                            checked={newQuestion.correct_answer === (newQuestion.options as Record<string, string>)?.[letter]}
                                            onChange={() => setNewQuestion(prev => ({
                                                ...prev,
                                                correct_answer: (prev.options as Record<string, string>)?.[letter]
                                            }))}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-xs text-muted-foreground">Correct</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {newQuestion.question_type === "descriptive" && (
                            <div className="space-y-2">
                                <Label>Model Answer (Key Points)</Label>
                                <Textarea
                                    value={newQuestion.model_answer}
                                    onChange={(e) => setNewQuestion(prev => ({ ...prev, model_answer: e.target.value }))}
                                    placeholder="Enter the expected answer... Be detailed as AI will match student response against these key points."
                                    className="min-h-[100px]"
                                />
                                <p className="text-[10px] text-muted-foreground italic">
                                    💡 AI will use semantic analysis to grade this question. Ensure the model answer contains all critical key points you expect from the student.
                                </p>
                            </div>
                        )}

                        <Button onClick={addQuestion} variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Question
                        </Button>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Exam"
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateExamModal;
