import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    BrainCircuit, FileUp, Loader2, Plus, Target, Check, PlusCircle, Library,
} from "lucide-react";
import { examsApi, questionBankApi } from "@/lib/api";
import { toast } from "sonner";
import type { AIGenerationPanelProps } from "./types";

const AIGenerationPanel = ({
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
}: AIGenerationPanelProps) => {

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsExtracting(true);
        try {
            const result = await examsApi.extractText(file);
            setExtractedText(result.text);
            toast.success(`Text extracted from ${file.name}`);
        } catch (error) {
            toast.error("Failed to extract text from file");
            console.error(error);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!extractedText.trim()) {
            toast.error("Please provide some text or upload a file first");
            return;
        }
        setIsGenerating(true);
        try {
            const questions = await examsApi.generateAIQuestions({
                text: extractedText,
                type: examData.type,
                count: aiOptions.count,
                difficulty: aiOptions.difficulty,
                total_marks: examData.total_marks,
            });
            setAiQuestions(questions);
            setSelectedAiIndices(questions.map((_, i) => i));
            toast.success(`Generated ${questions.length} questions!`);
        } catch (error) {
            toast.error("AI Generation failed");
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const addSelectedAiQuestions = () => {
        const selected = aiQuestions.filter((_, i) => selectedAiIndices.includes(i));
        if (selected.length === 0) {
            toast.error("No AI questions selected");
            return;
        }
        const formatted = selected.map((q) => ({
            question_text: q.question_text,
            question_type: examData.type.toLowerCase(),
            difficulty: q.difficulty,
            points: q.points,
            options: q.options,
            correct_answer: q.correct_answer,
            model_answer: q.model_answer,
            source: "AI" as const,
        }));
        setExamData((prev) => ({
            ...prev,
            questions: [...prev.questions, ...formatted],
        }));
        setAiQuestions([]);
        setSelectedAiIndices([]);
        toast.success(`Added ${selected.length} AI questions`);
    };

    return (
        <div className="space-y-4 animate-scale-in">
            <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10 space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                        <BrainCircuit className="h-4 w-4" />
                        Source Content
                    </Label>
                    <div className="relative">
                        <Input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.docx,.txt,image/*"
                        />
                        <Label
                            htmlFor="file-upload"
                            className="flex items-center gap-2 text-xs font-medium text-primary cursor-pointer hover:underline"
                        >
                            <FileUp className="h-3 w-3" />
                            Upload Document
                        </Label>
                    </div>
                </div>
                <Textarea
                    placeholder="Paste your source text here or upload a document..."
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    className="h-32 text-sm bg-background/50 border-none ring-1 ring-accent/10 focus-visible:ring-accent focus-visible:ring-2 transition-all p-4 resize-none"
                />
                {isExtracting && (
                    <div className="flex items-center gap-2 text-xs text-accent animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing document...
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Plus className="h-3 w-3 text-accent" />
                        Count
                    </Label>
                    <Input
                        type="number"
                        value={aiOptions.count || ""}
                        onChange={(e) => setAiOptions({ ...aiOptions, count: e.target.value === "" ? 0 : Number(e.target.value) })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                        className="h-10 bg-accent/5 border-none ring-1 ring-accent/10 focus-visible:ring-accent focus-visible:ring-2 transition-all text-sm"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Target className="h-3 w-3 text-accent" />
                        Difficulty
                    </Label>
                    <select
                        className="w-full h-10 px-2 rounded-md border-none ring-1 ring-accent/10 bg-accent/5 text-xs focus:ring-accent focus:ring-2 transition-all outline-none"
                        value={aiOptions.difficulty}
                        onChange={(e) => setAiOptions({ ...aiOptions, difficulty: e.target.value })}
                    >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                        <option>Mixed</option>
                    </select>
                </div>
            </div>

            <Button
                className="w-full h-12 gap-2 font-bold bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20"
                onClick={handleGenerateAI}
                disabled={isGenerating || !extractedText.trim()}
            >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                {isGenerating ? "Gemini is thinking..." : "Generate with Gemini AI"}
            </Button>

            {/* AI Results Preview */}
            {aiQuestions.length > 0 && (
                <div className="space-y-3 pt-4 animate-fade-in">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preview Generated Questions</Label>
                    <div className="space-y-2 max-h-80 overflow-y-auto px-1">
                        {aiQuestions.map((q, i) => (
                            <div
                                key={i}
                                className={`p-3 border rounded-xl text-xs flex gap-3 cursor-pointer transition-all ${
                                    selectedAiIndices.includes(i)
                                        ? "bg-primary/5 border-primary shadow-sm scale-[1.01]"
                                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                                }`}
                                onClick={() => {
                                    if (selectedAiIndices.includes(i)) {
                                        setSelectedAiIndices(selectedAiIndices.filter((idx) => idx !== i));
                                    } else {
                                        setSelectedAiIndices([...selectedAiIndices, i]);
                                    }
                                }}
                            >
                                <div
                                    className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                                        selectedAiIndices.includes(i)
                                            ? "bg-primary border-primary text-white"
                                            : "border-muted-foreground/30"
                                    }`}
                                >
                                    {selectedAiIndices.includes(i) && <Check className="h-3 w-3" />}
                                </div>
                                <p className="font-medium leading-relaxed">{q.question_text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 h-10 gap-2 font-bold"
                            onClick={addSelectedAiQuestions}
                        >
                            <PlusCircle className="h-4 w-4" />
                            Add to Exam ({selectedAiIndices.length})
                        </Button>
                    </div>

                    {/* Save to Bank with Topic */}
                    <div className="flex gap-2 mt-2">
                        <Input
                            placeholder="Unit/Topic (e.g., Unit 1, Chapter 3)"
                            className="h-9 text-xs flex-1"
                            value={saveBankTopic}
                            onChange={(e) => setSaveBankTopic(e.target.value)}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2 font-bold whitespace-nowrap"
                            onClick={async () => {
                                const selectedQs = selectedAiIndices.map((i) => aiQuestions[i]);
                                for (const q of selectedQs) {
                                    await questionBankApi.save({
                                        question_text: q.question_text,
                                        question_type: q.question_type,
                                        subject: examData.subject,
                                        topic: saveBankTopic || undefined,
                                        difficulty: aiOptions.difficulty,
                                        points: q.points,
                                        options: q.options,
                                        correct_answer: q.correct_answer,
                                        model_answer: q.model_answer,
                                    });
                                }
                                toast.success(`${selectedQs.length} questions saved to bank!`);
                                setSaveBankTopic("");
                            }}
                            disabled={selectedAiIndices.length === 0}
                        >
                            <Library className="h-4 w-4" />
                            Save to Bank
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIGenerationPanel;
