import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollText } from "lucide-react";
import type { StepReviewProps } from "./types";

const StepReview = ({ examData }: StepReviewProps) => {
    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center">
                <h1 className="text-3xl font-black mb-2">Final Review</h1>
                <p className="text-muted-foreground font-medium">Please verify the assessment details before publishing.</p>
            </div>

            <Card className="border-2 shadow-xl shadow-primary/5">
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Title</Label>
                        <p className="font-bold text-lg leading-tight">{examData.title}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Subject</Label>
                        <p className="font-bold text-lg leading-tight">{examData.subject}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Type</Label>
                        <p className="font-bold text-lg leading-tight">{examData.type}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                            {examData.is_adaptive ? "Questions per Student" : "Questions"}
                        </Label>
                        <div className="flex items-baseline gap-2">
                            <p className="font-bold text-2xl text-primary leading-tight">
                                {examData.is_adaptive ? (examData.total_questions || examData.questions.length) : examData.questions.length}
                            </p>
                            {examData.is_adaptive && (
                                <span className="text-xs font-bold text-muted-foreground">
                                    (of {examData.questions.length} pool)
                                </span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="font-black text-xl px-2 border-l-4 border-primary flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-primary" />
                    Question Overview
                </h3>
                <div className="space-y-3">
                    {examData.questions.map((q, idx) => (
                        <div key={idx} className="p-4 rounded-xl border bg-card flex items-center justify-between hover:border-primary/30 transition-colors shadow-sm">
                            <div className="flex items-center gap-4">
                                <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                    {idx + 1}
                                </span>
                                <div>
                                    <p className="font-bold text-sm line-clamp-1">{q.question_text}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted uppercase tracking-wider">{q.question_type}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground">•</span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{q.points} MARKS</span>
                                    </div>
                                </div>
                            </div>
                            <div
                                className={`text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest ${
                                    q.source === "AI"
                                        ? "bg-accent/10 text-accent border-accent/20"
                                        : "bg-muted/50 border-muted text-muted-foreground"
                                }`}
                            >
                                {q.source}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StepReview;
