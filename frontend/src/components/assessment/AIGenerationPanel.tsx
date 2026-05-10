import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    BrainCircuit, FileUp, Loader2, Plus, Target, Check, PlusCircle, Library, Sliders, Cpu, Sparkles,
} from "lucide-react";
import { examsApi, questionBankApi } from "@/lib/api";
import { toast } from "sonner";
import type { AIGenerationPanelProps } from "./types";

const PROVIDER_META: Record<string, { label: string; icon: typeof Cpu; color: string; bgColor: string }> = {
    gemini: { label: "Google Gemini", icon: Sparkles, color: "text-blue-500", bgColor: "bg-blue-500" },
    nvidia: { label: "NVIDIA NIM", icon: Cpu, color: "text-green-500", bgColor: "bg-green-500" },
};

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

    // Provider state
    const [provider, setProvider] = useState<string>("gemini");
    const [availableProviders, setAvailableProviders] = useState<string[]>([]);

    // BOTH mode: MCQ/Descriptive split
    const [mcqCount, setMcqCount] = useState(Math.ceil(aiOptions.count / 2));
    const [descCount, setDescCount] = useState(Math.floor(aiOptions.count / 2));
    const isBothMode = examData.type === "BOTH";

    // Fetch available providers on mount
    useEffect(() => {
        examsApi.getAIProviders().then((res) => {
            setAvailableProviders(res.providers);
            if (res.providers.length > 0 && !res.providers.includes(provider)) {
                setProvider(res.providers[0]);
            }
        }).catch(() => {
            setAvailableProviders(["gemini", "nvidia"]);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCountChange = (newCount: number) => {
        setAiOptions({ ...aiOptions, count: newCount });
        if (isBothMode) {
            setMcqCount(Math.ceil(newCount / 2));
            setDescCount(Math.floor(newCount / 2));
        }
    };

    const handleMcqCountChange = (val: number) => {
        const mc = Math.max(0, val);
        setMcqCount(mc);
        setDescCount(Math.max(0, aiOptions.count - mc));
    };

    const handleDescCountChange = (val: number) => {
        const dc = Math.max(0, val);
        setDescCount(dc);
        setMcqCount(Math.max(0, aiOptions.count - dc));
    };

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
        if (isBothMode && mcqCount + descCount === 0) {
            toast.error("Set at least 1 MCQ or 1 Descriptive question");
            return;
        }
        setIsGenerating(true);
        try {
            const totalCount = isBothMode ? mcqCount + descCount : aiOptions.count;
            const questions = await examsApi.generateAIQuestions({
                text: extractedText,
                type: examData.type,
                count: totalCount,
                difficulty: aiOptions.difficulty,
                total_marks: examData.total_marks,
                provider,
                ...(isBothMode ? { mcq_count: mcqCount, desc_count: descCount } : {}),
            });
            setAiQuestions(questions);
            setSelectedAiIndices(questions.map((_, i) => i));
            toast.success(`Generated ${questions.length} questions via ${PROVIDER_META[provider]?.label || provider}!`);
        } catch (error) {
            toast.error("AI Generation failed — try switching provider");
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
            question_type: q.question_type || examData.type.toLowerCase(),
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

    const currentMeta = PROVIDER_META[provider] || PROVIDER_META.gemini;
    const ProviderIcon = currentMeta.icon;

    return (
        <div className="space-y-4 animate-scale-in">
            {/* ── AI Provider Selector ─────────────────────────────────────── */}
            <div className="p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl border border-primary/10">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                    <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                    AI Provider
                </Label>
                <div className="grid grid-cols-2 gap-2">
                    {(availableProviders.length > 0 ? availableProviders : ["gemini", "nvidia"]).map((p) => {
                        const meta = PROVIDER_META[p] || PROVIDER_META.gemini;
                        const Icon = meta.icon;
                        const isActive = provider === p;
                        return (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setProvider(p)}
                                className={`
                                    flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all
                                    ${isActive
                                        ? `${meta.bgColor}/10 ring-2 ring-offset-1 ${meta.color} shadow-sm`
                                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                    }
                                `}
                                style={undefined}
                            >
                                <div className={`p-1.5 rounded-lg ${isActive ? `${meta.bgColor}/20` : "bg-muted/50"}`}>
                                    <Icon className={`h-4 w-4 ${isActive ? meta.color : ""}`} />
                                </div>
                                <div className="text-left">
                                    <div className="text-[11px] font-bold">{meta.label}</div>
                                    <div className="text-[9px] opacity-60">
                                        {p === "gemini" ? "gemini-2.5-flash-lite" : "llama-3.1-70b"}
                                    </div>
                                </div>
                                {isActive && (
                                    <div className={`ml-auto w-2 h-2 rounded-full ${meta.bgColor} animate-pulse`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Source Content ────────────────────────────────────────────── */}
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

            {/* ── Count + Difficulty ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Plus className="h-3 w-3 text-accent" />
                        Total Questions
                    </Label>
                    <Input
                        type="number"
                        value={aiOptions.count || ""}
                        onChange={(e) => handleCountChange(e.target.value === "" ? 0 : Number(e.target.value))}
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

            {/* ── BOTH Mode: MCQ / Descriptive Split ───────────────────────── */}
            {isBothMode && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4 animate-scale-in">
                    <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-primary" />
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">
                            Question Type Split
                        </Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                                MCQ Questions
                            </Label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline" size="icon" type="button"
                                    className="h-8 w-8 text-sm font-bold"
                                    onClick={() => handleMcqCountChange(mcqCount - 1)}
                                    disabled={mcqCount <= 0}
                                >−</Button>
                                <div className="flex-1 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-lg font-black text-blue-600 dark:text-blue-400">
                                    {mcqCount}
                                </div>
                                <Button
                                    variant="outline" size="icon" type="button"
                                    className="h-8 w-8 text-sm font-bold"
                                    onClick={() => handleMcqCountChange(mcqCount + 1)}
                                    disabled={mcqCount >= aiOptions.count}
                                >+</Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                                Descriptive Questions
                            </Label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline" size="icon" type="button"
                                    className="h-8 w-8 text-sm font-bold"
                                    onClick={() => handleDescCountChange(descCount - 1)}
                                    disabled={descCount <= 0}
                                >−</Button>
                                <div className="flex-1 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center text-lg font-black text-emerald-600 dark:text-emerald-400">
                                    {descCount}
                                </div>
                                <Button
                                    variant="outline" size="icon" type="button"
                                    className="h-8 w-8 text-sm font-bold"
                                    onClick={() => handleDescCountChange(descCount + 1)}
                                    disabled={descCount >= aiOptions.count}
                                >+</Button>
                            </div>
                        </div>
                    </div>

                    {/* Visual bar */}
                    <div className="h-2 rounded-full overflow-hidden flex bg-muted/30">
                        {mcqCount > 0 && (
                            <div className="bg-blue-500 transition-all duration-300" style={{ width: `${(mcqCount / (mcqCount + descCount || 1)) * 100}%` }} />
                        )}
                        {descCount > 0 && (
                            <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${(descCount / (mcqCount + descCount || 1)) * 100}%` }} />
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                        {mcqCount} MCQ + {descCount} Descriptive = {mcqCount + descCount} total
                    </p>
                </div>
            )}

            {/* ── Generate Button ──────────────────────────────────────────── */}
            <Button
                className={`w-full h-12 gap-2 font-bold shadow-lg ${
                    provider === "nvidia"
                        ? "bg-green-600 hover:bg-green-700 shadow-green-600/20"
                        : "bg-accent hover:bg-accent/90 shadow-accent/20"
                }`}
                onClick={handleGenerateAI}
                disabled={isGenerating || !extractedText.trim()}
            >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ProviderIcon className="h-4 w-4" />}
                {isGenerating ? `${PROVIDER_META[provider]?.label || 'AI'} is thinking...` : `Generate with ${PROVIDER_META[provider]?.label || 'AI'}`}
            </Button>

            {/* ── AI Results Preview ───────────────────────────────────────── */}
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
                                <div className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                                    selectedAiIndices.includes(i)
                                        ? "bg-primary border-primary text-white"
                                        : "border-muted-foreground/30"
                                }`}>
                                    {selectedAiIndices.includes(i) && <Check className="h-3 w-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium leading-relaxed">{q.question_text}</p>
                                    {q.question_type && (
                                        <span className={`inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                                            q.question_type === 'mcq'
                                                ? 'bg-blue-500/10 text-blue-600'
                                                : 'bg-emerald-500/10 text-emerald-600'
                                        }`}>
                                            {q.question_type}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" className="flex-1 h-10 gap-2 font-bold" onClick={addSelectedAiQuestions}>
                            <PlusCircle className="h-4 w-4" />
                            Add to Exam ({selectedAiIndices.length})
                        </Button>
                    </div>

                    {/* Save to Bank */}
                    <div className="flex gap-2 mt-2">
                        <Input
                            placeholder="Unit/Topic (e.g., Unit 1, Chapter 3)"
                            className="h-9 text-xs flex-1"
                            value={saveBankTopic}
                            onChange={(e) => setSaveBankTopic(e.target.value)}
                        />
                        <Button
                            variant="outline" size="sm"
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
