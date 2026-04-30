import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Library, Loader2, Check, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import type { QuestionBankPanelProps } from "./types";

const QuestionBankPanel = ({
    setExamData,
    bankQuestions,
    selectedBankIndices,
    setSelectedBankIndices,
    isLoadingBank,
    bankFilter,
    setBankFilter,
    availableSubjects,
    availableTopics,
    selectedTopics,
    setSelectedTopics,
}: QuestionBankPanelProps) => {

    const filteredQuestions = bankQuestions.filter(
        (q) =>
            (!bankFilter.subject || q.subject === bankFilter.subject) &&
            (selectedTopics.length === 0 || (q.topic && selectedTopics.includes(q.topic)))
    );

    return (
        <div className="space-y-4 animate-scale-in">
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Library className="h-4 w-4" />
                        Your Saved Questions
                    </Label>
                    <span className="text-xs text-muted-foreground">
                        {filteredQuestions.length} of {bankQuestions.length}
                    </span>
                </div>

                {/* Filters */}
                <div className="space-y-3 mb-4">
                    <div className="flex gap-2">
                        <select
                            className="h-9 px-3 rounded-xl border-none ring-1 ring-primary/20 bg-background text-xs focus:ring-primary focus:ring-2 transition-all outline-none flex-1"
                            value={bankFilter.subject}
                            onChange={(e) => setBankFilter({ ...bankFilter, subject: e.target.value })}
                        >
                            <option value="">All Subjects</option>
                            {availableSubjects.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {availableTopics.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Filter by Unit / Topic</Label>
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
                                {availableTopics.map((topic) => (
                                    <div
                                        key={topic}
                                        onClick={() => {
                                            if (selectedTopics.includes(topic)) {
                                                setSelectedTopics(selectedTopics.filter((t) => t !== topic));
                                            } else {
                                                setSelectedTopics([...selectedTopics, topic]);
                                            }
                                        }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer border transition-all flex items-center gap-1.5 ${
                                            selectedTopics.includes(topic)
                                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                : "bg-background text-muted-foreground border-primary/10 hover:border-primary/30"
                                        }`}
                                    >
                                        <div
                                            className={`h-3 w-3 rounded-sm border flex items-center justify-center ${
                                                selectedTopics.includes(topic) ? "bg-white border-white" : "border-current"
                                            }`}
                                        >
                                            {selectedTopics.includes(topic) && <Check className="h-2 w-2 text-primary" />}
                                        </div>
                                        {topic}
                                    </div>
                                ))}
                            </div>
                            {selectedTopics.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 text-[10px] text-primary p-0 hover:bg-transparent"
                                    onClick={() => setSelectedTopics([])}
                                >
                                    Clear All Topics
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {isLoadingBank ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : bankQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                        <Library className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No saved questions yet</p>
                        <p className="text-xs text-muted-foreground/70">Generate questions with AI and save them to your bank</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto px-1">
                        {filteredQuestions.map((q, i) => (
                            <div
                                key={q.id}
                                className={`p-3 border rounded-xl text-xs flex gap-3 cursor-pointer transition-all ${
                                    selectedBankIndices.includes(i) ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent hover:bg-muted/50"
                                }`}
                                onClick={() => {
                                    if (selectedBankIndices.includes(i)) {
                                        setSelectedBankIndices(selectedBankIndices.filter((idx) => idx !== i));
                                    } else {
                                        setSelectedBankIndices([...selectedBankIndices, i]);
                                    }
                                }}
                            >
                                <div
                                    className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                                        selectedBankIndices.includes(i) ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                                    }`}
                                >
                                    {selectedBankIndices.includes(i) && <Check className="h-3 w-3" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium leading-relaxed">{q.question_text}</p>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{q.difficulty}</span>
                                        {q.subject && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded font-medium">{q.subject}</span>}
                                        {q.topic && <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-medium">📖 {q.topic}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                {filteredQuestions.length > 0 && (
                    <Button
                        variant="outline"
                        className="flex-1 h-10 gap-2 font-bold text-xs border-primary/20 hover:bg-primary/5"
                        onClick={() => {
                            const indicesToAdd = filteredQuestions
                                .map((q) => bankQuestions.findIndex((bq) => bq.id === q.id))
                                .filter((idx) => idx !== -1);
                            const uniqueIndices = [...new Set([...selectedBankIndices, ...indicesToAdd])];
                            setSelectedBankIndices(uniqueIndices);
                            toast.success(`Selected all ${filteredQuestions.length} matching questions`);
                        }}
                    >
                        <Check className="h-4 w-4" />
                        Select All Matching
                    </Button>
                )}

                {selectedBankIndices.length > 0 && (
                    <Button
                        className="flex-1 h-10 gap-2 font-bold"
                        onClick={() => {
                            const selectedQs = selectedBankIndices.map((i) => bankQuestions[i]);
                            const newQuestions = selectedQs.map((q) => ({
                                question_text: q.question_text,
                                question_type: q.question_type,
                                difficulty: 0.5,
                                points: q.points,
                                options: q.options,
                                correct_answer: q.correct_answer,
                                model_answer: q.model_answer,
                                source: "BANK" as const,
                            }));
                            setExamData((prev) => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
                            setSelectedBankIndices([]);
                            toast.success(`${selectedQs.length} questions added from bank!`);
                        }}
                    >
                        <PlusCircle className="h-4 w-4" />
                        Add Selected ({selectedBankIndices.length})
                    </Button>
                )}
            </div>
        </div>
    );
};

export default QuestionBankPanel;
