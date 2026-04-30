import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Mic, MicOff, Loader2, AlertCircle, Volume2, FileUp, Paperclip, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { examsApi, ExamSession, Question, GradingResult } from "@/lib/api";
import { useAccessibility } from "@/hooks/useAccessibility";

const Exam = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const { speak, textToSpeech } = useAccessibility();

    const [session, setSession] = useState<ExamSession | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string>("");
    const [descriptiveAnswer, setDescriptiveAnswer] = useState<string>("");
    const [timeLeft, setTimeLeft] = useState(0);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isFinishing = useRef(false);

    // FIX: Store recognition instance in a ref to prevent multiple active instances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    // Start exam on mount
    useEffect(() => {
        if (examId) {
            startExam();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId]);

    // Cleanup speech recognition on unmount to prevent resource leaks
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
        };
    }, []);

    // Proctoring Logic
    useEffect(() => {
        if (!session) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                const details = `Tab switched or window minimized at ${new Date().toLocaleTimeString()}`;
                toast.warning("AI PROCTOR ALERT: Tab switch detected! This activity is being logged.", {
                    duration: 5000,
                    style: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }
                });
                examsApi.logProctorEvent(session.submission_id, "tab_switch", details);
            }
        };

        const handleCopyPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const type = e.type === 'copy' ? 'Copy' : 'Paste';
            const details = `${type} attempt blocked at ${new Date().toLocaleTimeString()}`;
            toast.error(`AI PROCTOR ALERT: ${type} is disabled during the exam.`, { duration: 3000 });
            examsApi.logProctorEvent(session.submission_id, "copy_paste", details);
        };

        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull) {
                const details = `User exited full screen mode at ${new Date().toLocaleTimeString()}`;
                toast.error("AI PROCTOR ALERT: Full screen mode disabled! This activity is being logged.", {
                    duration: 5000,
                    style: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }
                });
                examsApi.logProctorEvent(session.submission_id, "fullscreen_exit", details);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("copy", handleCopyPaste);
        document.addEventListener("paste", handleCopyPaste);
        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("copy", handleCopyPaste);
            document.removeEventListener("paste", handleCopyPaste);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, [session]);

    // Timer
    useEffect(() => {
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (!isFinishing.current) handleFinishExam();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft]);

    // Speak question when it changes
    useEffect(() => {
        if (currentQuestion && textToSpeech) {
            speak(currentQuestion.question_text);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuestion, textToSpeech]);

    const startExam = async () => {
        try {
            const sessionData = await examsApi.startExam(examId!);
            setSession(sessionData);
            setCurrentQuestion(sessionData.first_question);
            setTimeLeft(sessionData.duration_minutes * 60);

            if (sessionData.resumed) {
                toast.info("Resuming your previous session.");
            } else {
                toast.success("Exam started! Good luck!");
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Failed to start exam");
            navigate("/exams");
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // FIX: progress should not add +1 (caused 100% on first question display)
    const progress = session ? (questionsAnswered / session.total_questions) * 100 : 0;

    const handleSubmitAnswer = async () => {
        if (!session || !currentQuestion) return;

        const answer = currentQuestion.question_type === 'mcq' ? selectedAnswer : descriptiveAnswer;

        if (!selectedFile && !answer.trim()) {
            toast.error("Please provide an answer");
            return;
        }

        setIsSubmitting(true);
        try {
            let result: GradingResult;
            if (selectedFile) {
                result = await examsApi.uploadAnswer(
                    session.submission_id,
                    currentQuestion!.id as string,
                    selectedFile
                );
            } else {
                result = await examsApi.submitAnswer(
                    session.submission_id,
                    currentQuestion!.id as string,
                    answer
                );
            }

            setQuestionsAnswered(prev => prev + 1);

            if (result.exam_complete) {
                handleFinishExam();
            } else if (result.next_question) {
                setCurrentQuestion(result.next_question);
                setSelectedAnswer("");
                setDescriptiveAnswer("");
                setSelectedFile(null);
                setFilePreview(null);
            }

        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Failed to submit answer");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinishExam = async () => {
        if (!session) return;
        if (isFinishing.current) return;
        isFinishing.current = true;
        setTimeLeft(0);

        // Stop speech recognition if active
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        // Persist result to sessionStorage in case /results page is refreshed
        try {
            const result = await examsApi.finishExam(session.submission_id);
            sessionStorage.setItem("lastExamResult", JSON.stringify(result));
            toast.success("Exam completed!");
            navigate("/results", { state: { result } });
        } catch {
            toast.error("Failed to finish exam");
            isFinishing.current = false;
        }
    };

    const handleSkipQuestion = async () => {
        if (!session || !currentQuestion) return;

        setIsSubmitting(true);
        try {
            const result = await examsApi.submitAnswer(
                session.submission_id,
                currentQuestion!.id as string,
                ""
            );

            setQuestionsAnswered(prev => prev + 1);

            if (result.exam_complete) {
                handleFinishExam();
            } else if (result.next_question) {
                setCurrentQuestion(result.next_question);
                setSelectedAnswer("");
                setDescriptiveAnswer("");
                setSelectedFile(null);
                setFilePreview(null);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Failed to skip question");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size should be less than 10MB");
                return;
            }
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(file));
            } else {
                setFilePreview(null);
            }
            toast.success("File attached! AI will analyze it upon submission.");
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
    };

    // FIX: Store recognition in ref and properly call .stop() when toggling off
    const toggleRecording = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in (window as any))) {
            toast.error("Voice input is not supported in your browser");
            return;
        }

        if (isRecording) {
            // Stop the existing recognition instance
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setIsRecording(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setDescriptiveAnswer(prev => prev + ' ' + transcript);
        };

        recognition.onerror = () => {
            setIsRecording(false);
            recognitionRef.current = null;
            toast.error("Voice recognition error");
        };

        recognition.onend = () => {
            setIsRecording(false);
            recognitionRef.current = null;
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
        toast.success("Listening... Speak your answer");
    };

    const getDifficultyColor = (difficulty: number) => {
        if (difficulty < 0.33) return "text-success";
        if (difficulty < 0.66) return "text-warning";
        return "text-destructive";
    };

    const getDifficultyLabel = (difficulty: number) => {
        if (difficulty < 0.33) return "Easy";
        if (difficulty < 0.66) return "Medium";
        return "Hard";
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground">Starting exam...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container mx-auto p-4 lg:p-6 max-w-7xl animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar - Question Navigation */}
                    <aside className="lg:col-span-1 order-2 lg:order-1">
                        <Card className="sticky top-24 shadow-md bg-muted/20 border-none">
                            <CardHeader className="pb-3 text-center border-b">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                    Exam Progress
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-5 gap-3">
                                    {[...Array(session?.total_questions || 0)].map((_, idx) => {
                                        const isCurrent = idx === questionsAnswered;
                                        const isAnswered = idx < questionsAnswered;

                                        return (
                                            <div
                                                key={idx}
                                                className={`
                                                    aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all
                                                    ${isCurrent ? 'bg-primary text-primary-foreground shadow-lg scale-110 ring-2 ring-primary ring-offset-2' :
                                                        isAnswered ? 'bg-success/20 text-success border border-success/40' :
                                                            'bg-muted text-muted-foreground border'}
                                                `}
                                                title={`Question ${idx + 1}`}
                                            >
                                                {idx + 1}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-8 space-y-3">
                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="w-3 h-3 rounded bg-primary"></div>
                                        <span>Current Question</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="w-3 h-3 rounded bg-success/20 border border-success/40"></div>
                                        <span>Completed</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="w-3 h-3 rounded bg-muted border"></div>
                                        <span>Remaining</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>

                    {/* Main Content */}
                    <div className="lg:col-span-3 order-1 lg:order-2 space-y-6">
                        {/* Header */}
                        <div className="bg-card rounded-xl p-5 shadow-sm border">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                        {session?.exam.title || "Assessment"}
                                    </h1>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        AI-Powered Adaptive Assessment Session
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant={isFullscreen ? "secondary" : "destructive"}
                                        size="sm"
                                        onClick={() => {
                                            if (!document.fullscreenElement) {
                                                document.documentElement.requestFullscreen();
                                            } else {
                                                document.exitFullscreen();
                                            }
                                        }}
                                        className="gap-2 font-bold animate-pulse"
                                    >
                                        <div className={`w-2 h-2 rounded-full ${isFullscreen ? 'bg-success animate-ping' : 'bg-white'}`}></div>
                                        {isFullscreen ? "AI Monitoring Active" : "Enable Secure Mode"}
                                    </Button>
                                    <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-full">
                                        <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                                        <span
                                            className={`font-mono text-lg font-bold ${timeLeft < 300 ? "text-destructive animate-pulse" : "text-foreground"}`}
                                            aria-live="polite"
                                        >
                                            {formatTime(timeLeft)}
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate("/dashboard")}
                                        className="hidden md:flex"
                                    >
                                        Exit
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-semibold uppercase text-muted-foreground">
                                    <span>Overall Completion</span>
                                    <span>{questionsAnswered} / {session?.total_questions || 0}</span>
                                </div>
                                {/* FIX: progress = answered / total (no +1) */}
                                <Progress value={progress} className="h-2" aria-label={`Progress: ${questionsAnswered} of ${session?.total_questions} questions answered`} />
                            </div>
                        </div>

                        {/* Question Card */}
                        {currentQuestion && (
                            <Card className="shadow-lg border-none animate-scale-in">
                                <CardHeader className="bg-muted/30 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary text-primary-foreground text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center">
                                                {questionsAnswered + 1}
                                            </div>
                                            <CardTitle className="text-xl">Question</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-background border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                                                {getDifficultyLabel(currentQuestion.difficulty)}
                                            </span>
                                            {textToSpeech && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => speak(currentQuestion.question_text)}
                                                    className="h-8 w-8 text-primary"
                                                    title="Read question aloud"
                                                >
                                                    <Volume2 className="h-5 w-5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 lg:p-8 space-y-8">
                                    <p
                                        className="text-xl font-medium leading-relaxed text-card-foreground"
                                        id="question-text"
                                    >
                                        {currentQuestion.question_text}
                                    </p>

                                    {/* MCQ Options */}
                                    {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
                                        <RadioGroup
                                            value={selectedAnswer}
                                            onValueChange={setSelectedAnswer}
                                            className="grid grid-cols-1 gap-4"
                                            aria-labelledby="question-text"
                                        >
                                            {Object.entries(currentQuestion.options).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className={`
                                                        flex items-center space-x-3 p-5 border-2 rounded-xl transition-all cursor-pointer group
                                                        ${selectedAnswer === value ? 'border-primary bg-primary/5 shadow-md' : 'border-muted hover:border-primary/50'}
                                                    `}
                                                    onClick={() => setSelectedAnswer(value)}
                                                >
                                                    <RadioGroupItem value={value} id={`option-${key}`} className="sr-only" />
                                                    <div className={`
                                                        w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors
                                                        ${selectedAnswer === value ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 group-hover:border-primary/50'}
                                                    `}>
                                                        {key}
                                                    </div>
                                                    <Label
                                                        htmlFor={`option-${key}`}
                                                        className="flex-1 cursor-pointer text-lg font-medium"
                                                    >
                                                        {value}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    )}

                                    {/* Descriptive Answer */}
                                    {currentQuestion.question_type === 'descriptive' && (
                                        <div className="space-y-6">
                                            <div className="relative group">
                                                <Textarea
                                                    value={descriptiveAnswer}
                                                    onChange={(e) => setDescriptiveAnswer(e.target.value)}
                                                    placeholder="Focus on the key concepts... Describe clearly."
                                                    className="min-h-[220px] text-lg p-6 rounded-2xl border-2 transition-all focus:border-primary resize-none"
                                                    aria-labelledby="question-text"
                                                />
                                                <div className="absolute bottom-4 right-4 text-xs font-mono text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">
                                                    {descriptiveAnswer.length} chars
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <Button
                                                    variant="outline"
                                                    size="lg"
                                                    onClick={toggleRecording}
                                                    disabled={!!selectedFile}
                                                    className={`flex-1 rounded-xl h-14 ${isRecording ? "bg-destructive/10 border-destructive text-destructive font-bold animate-pulse" : "hover:bg-primary/5"}`}
                                                    aria-pressed={isRecording}
                                                >
                                                    {isRecording ? (
                                                        <>
                                                            <MicOff className="h-5 w-5 mr-3" />
                                                            Stop Listening
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Mic className="h-5 w-5 mr-3" />
                                                            Answer with Voice
                                                        </>
                                                    )}
                                                </Button>

                                                <div className="flex-1 relative">
                                                    <input
                                                        type="file"
                                                        id="file-upload"
                                                        className="hidden"
                                                        accept="image/*,application/pdf"
                                                        onChange={handleFileChange}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="lg"
                                                        asChild
                                                        className={`w-full rounded-xl h-14 cursor-pointer border-dashed border-2 ${selectedFile ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                                                    >
                                                        <label htmlFor="file-upload">
                                                            <FileUp className="h-5 w-5 mr-3 text-primary" />
                                                            {selectedFile ? 'Change Answer Sheet' : 'Upload Answer Sheet'}
                                                        </label>
                                                    </Button>
                                                </div>
                                            </div>

                                            {selectedFile && (
                                                <div className="p-4 bg-muted/40 rounded-xl border flex items-center justify-between">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="bg-primary/10 p-2 rounded">
                                                            <Paperclip className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1 truncate">
                                                            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                                                            <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                                        </div>
                                                        {filePreview && (
                                                            <img src={filePreview} alt="Preview" className="w-10 h-10 rounded object-cover border" />
                                                        )}
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={removeFile} className="text-muted-foreground hover:text-destructive">
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                                <div className="p-6 lg:p-8 bg-muted/20 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <Button
                                        variant="ghost"
                                        onClick={() => navigate("/dashboard")}
                                        className="text-muted-foreground hover:text-foreground order-3 sm:order-1"
                                    >
                                        Exit Exam
                                    </Button>

                                    <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            onClick={handleSkipQuestion}
                                            disabled={isSubmitting}
                                            className="flex-1 sm:flex-none px-6 h-12 rounded-xl font-semibold border-2"
                                        >
                                            Skip
                                        </Button>

                                        <Button
                                            size="lg"
                                            onClick={handleSubmitAnswer}
                                            disabled={isSubmitting || (!selectedAnswer && !descriptiveAnswer.trim() && !selectedFile)}
                                            className="flex-1 sm:flex-none px-10 h-12 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ...
                                                </>
                                            ) : (
                                                questionsAnswered === (session?.total_questions || 0) - 1 ? "Complete" : "Next"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Info Card */}
                        <div className="bg-primary/5 rounded-2xl p-6 border-2 border-primary/10 flex items-start gap-5">
                            <div className="bg-primary/20 p-3 rounded-full">
                                <AlertCircle className="h-6 w-6 text-primary" aria-hidden="true" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold uppercase tracking-tight text-primary">Assessment Support</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    Take your time. This adaptive assessment focuses on understanding rather than just speed.
                                    Use the <strong className="text-foreground">Answer with Voice</strong> feature if you prefer spoken responses.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Exam;
