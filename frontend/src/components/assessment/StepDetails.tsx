import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
    PenTool, Book, Target, Calendar, Info, ScrollText, Timer, Trophy,
    Sparkles, PlusCircle,
} from "lucide-react";
import type { StepDetailsProps } from "./types";

const StepDetails = ({ examData, setExamData }: StepDetailsProps) => {
    // Date/Time Selection State for AM/PM consistency
    const [selectionDate, setSelectionDate] = useState(
        examData.scheduled_at?.split("T")[0] || new Date().toISOString().split("T")[0]
    );
    const [selectionHour, setSelectionHour] = useState("10");
    const [selectionMinute, setSelectionMinute] = useState("00");
    const [selectionAMPM, setSelectionAMPM] = useState("AM");

    // Sync split state to examData.scheduled_at
    useEffect(() => {
        let hour = parseInt(selectionHour);
        if (selectionAMPM === "PM" && hour < 12) hour += 12;
        if (selectionAMPM === "AM" && hour === 12) hour = 0;

        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = selectionMinute.padStart(2, "0");
        const isoString = `${selectionDate}T${formattedHour}:${formattedMinute}`;
        setExamData((prev) => ({ ...prev, scheduled_at: isoString }));
    }, [selectionDate, selectionHour, selectionMinute, selectionAMPM]);

    const formatTo12Hr = (dateStr?: string) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            return date.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
        } catch {
            return "";
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto animate-fade-in py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <PenTool className="h-3 w-3 text-primary" />
                        Assessment Name
                    </Label>
                    <Input
                        value={examData.title}
                        onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                        placeholder="e.g. Midterm Physics 101"
                        className="h-11 bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Book className="h-3 w-3 text-primary" />
                        Subject
                    </Label>
                    <Input
                        value={examData.subject}
                        onChange={(e) => setExamData({ ...examData, subject: e.target.value })}
                        placeholder="e.g. Physics"
                        className="h-11 bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Target className="h-3 w-3 text-primary" />
                        Assessment Type
                    </Label>
                    <select
                        className="w-full h-11 px-3 rounded-md border-none ring-1 ring-primary/10 bg-muted/5 focus:ring-primary focus:ring-2 transition-all outline-none"
                        value={examData.type}
                        onChange={(e) => setExamData({ ...examData, type: e.target.value as "MCQ" | "DESCRIPTIVE" | "BOTH" })}
                    >
                        <option value="MCQ">Multiple Choice Questions (MCQ)</option>
                        <option value="DESCRIPTIVE">Descriptive (Long Answer)</option>
                        <option value="BOTH">Both (MCQ + Descriptive)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-primary" />
                        Date & Time
                    </Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full h-11 justify-start text-left font-bold bg-muted/5 border-none ring-1 ring-primary/10 hover:ring-primary/30 transition-all px-3"
                            >
                                <Calendar className="mr-2 h-4 w-4 text-primary" />
                                {formatTo12Hr(examData.scheduled_at)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4 space-y-4" align="start">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Select Date</Label>
                                    <Input
                                        type="date"
                                        value={selectionDate}
                                        onChange={(e) => setSelectionDate(e.target.value)}
                                        className="h-10 bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all cursor-pointer font-bold text-xs"
                                        onClick={(e) => e.currentTarget.showPicker()}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Hour</Label>
                                        <select
                                            className="w-full h-10 px-2 rounded-md border-none ring-1 ring-primary/10 bg-muted/5 text-xs font-bold focus:ring-primary focus:ring-2 outline-none transition-all appearance-none"
                                            value={selectionHour}
                                            onChange={(e) => setSelectionHour(e.target.value)}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                                <option key={h} value={h.toString()}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Min</Label>
                                        <select
                                            className="w-full h-10 px-2 rounded-md border-none ring-1 ring-primary/10 bg-muted/5 text-xs font-bold focus:ring-primary focus:ring-2 outline-none transition-all appearance-none"
                                            value={selectionMinute}
                                            onChange={(e) => setSelectionMinute(e.target.value)}
                                        >
                                            {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground text-center block">AM/PM</Label>
                                        <div className="flex bg-muted/30 p-1 rounded-lg h-10">
                                            <Button
                                                variant={selectionAMPM === "AM" ? "default" : "ghost"}
                                                size="sm"
                                                className={`flex-1 h-full text-[10px] font-black p-0 rounded-md transition-all ${selectionAMPM === "AM" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-primary/5"}`}
                                                onClick={() => setSelectionAMPM("AM")}
                                                type="button"
                                            >
                                                AM
                                            </Button>
                                            <Button
                                                variant={selectionAMPM === "PM" ? "default" : "ghost"}
                                                size="sm"
                                                className={`flex-1 h-full text-[10px] font-black p-0 rounded-md transition-all ${selectionAMPM === "PM" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-primary/5"}`}
                                                onClick={() => setSelectionAMPM("PM")}
                                                type="button"
                                            >
                                                PM
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Timer className="h-3 w-3 text-primary" />
                        Duration (Minutes)
                    </Label>
                    <Input
                        type="number"
                        value={examData.duration_minutes || ""}
                        onChange={(e) => setExamData({ ...examData, duration_minutes: e.target.value === "" ? 0 : Number(e.target.value) })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                        className="h-11 bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Trophy className="h-3 w-3 text-primary" />
                        Total Marks
                    </Label>
                    <Input
                        type="number"
                        value={examData.total_marks || ""}
                        onChange={(e) => setExamData({ ...examData, total_marks: e.target.value === "" ? 0 : Number(e.target.value) })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                        className="h-11 bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all"
                    />
                </div>
                <div className={`space-y-2 transition-all duration-500 ${examData.is_adaptive ? "opacity-100" : "opacity-40 grayscale pointer-events-none"}`}>
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Target className="h-3 w-3 text-primary" />
                        Questions per Student (Pool Subset)
                        {!examData.is_adaptive && <span className="text-[8px] normal-case text-muted-foreground/60">(Adaptive only)</span>}
                    </Label>
                    <Input
                        type="number"
                        value={examData.total_questions || ""}
                        onChange={(e) => setExamData({ ...examData, total_questions: e.target.value === "" ? 0 : Number(e.target.value) })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                        placeholder="Questions to ask each student"
                        className="h-11 bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all"
                    />
                    <p className="text-[9px] text-muted-foreground/60 px-1">How many questions to ask from the total pool</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl ring-1 ring-primary/10">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold">Adaptive Mode</span>
                            <span title="Questions vary based on student performance">
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Adjusts difficulty in real-time</p>
                    </div>
                    <Switch
                        checked={examData.is_adaptive}
                        onCheckedChange={(checked) => setExamData({ ...examData, is_adaptive: checked })}
                    />
                </div>
                <div className="flex items-center justify-between p-4 bg-success/5 rounded-2xl ring-1 ring-success/10">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-success">
                            <PlusCircle className="h-4 w-4" />
                            <span className="text-sm font-bold">Live Now</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Make assessment available immediately</p>
                    </div>
                    <Switch
                        checked={examData.is_active}
                        onCheckedChange={(checked) => setExamData({ ...examData, is_active: checked })}
                        className="data-[state=checked]:bg-success"
                    />
                </div>
            </div>
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ScrollText className="h-3 w-3 text-primary" />
                        Instructions for Students
                    </Label>
                    <div className="flex gap-2">
                        {[
                            { label: "Standard", text: "1. Read all questions carefully before answering.\n2. The timer starts as soon as you begin the assessment.\n3. Ensure a stable internet connection throughout the session.\n4. No electronic devices or external resources are permitted.\n5. For Descriptive answers, focus on clarity and relevant examples.\n6. Academic integrity is mandatory; any violation will lead to disqualification." },
                            { label: "Brief", text: "Answer all questions. No calculators allowed." },
                        ].map((preset) => (
                            <Button
                                key={preset.label}
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] font-bold px-2 rounded-full hover:bg-primary/5 hover:text-primary transition-all"
                                onClick={() => setExamData({ ...examData, description: preset.text })}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="relative">
                    <Textarea
                        value={examData.description || ""}
                        onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                        placeholder="Enter exam description and instructions..."
                        className="min-h-[120px] bg-muted/5 border-none ring-1 ring-primary/10 focus-visible:ring-primary focus-visible:ring-2 transition-all p-4 resize-none"
                    />
                    <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground bg-background/50 backdrop-blur px-2 py-1 rounded">
                        {examData.description?.length || 0} characters
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepDetails;
