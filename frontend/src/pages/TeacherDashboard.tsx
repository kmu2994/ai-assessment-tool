import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    FileText,
    Users,
    PlusCircle,
    Trash2,
    Loader2,
    Search,
    ClipboardList,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import CreateAssessmentFlow from "@/components/CreateAssessmentFlow";
import { analyticsApi, examsApi, TeacherDashboard as TeacherDashboardData } from "@/lib/api";
import { useAccessibility } from "@/hooks/useAccessibility";
import { toast } from "sonner";

const TeacherDashboard = () => {
    const { highContrast } = useAccessibility();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [dashboard, setDashboard] = useState<TeacherDashboardData | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [assessmentSearch, setAssessmentSearch] = useState("");
    const [submissionSearch, setSubmissionSearch] = useState("");

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const data = await analyticsApi.getTeacherDashboard();
            setDashboard(data);
        } catch {
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (examId: string) => {
        try {
            await examsApi.toggleExamStatus(examId);
            toast.success("Assessment status updated");
            fetchDashboard();
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleDeleteExam = async (examId: string) => {
        if (!confirm("Are you sure you want to delete this assessment?")) return;

        try {
            await examsApi.deleteExam(examId);
            toast.success("Assessment deleted successfully");
            fetchDashboard();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Failed to delete assessment");
        }
    };


    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    const filteredAssessments = dashboard?.exams?.filter(e =>
        e.title.toLowerCase().includes(assessmentSearch.toLowerCase())
    ) || [];

    const filteredSubmissions = dashboard?.student_submissions?.filter(s =>
        s.student_name.toLowerCase().includes(submissionSearch.toLowerCase()) ||
        s.exam_title.toLowerCase().includes(submissionSearch.toLowerCase())
    ) || [];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="container mx-auto p-6 space-y-8 animate-fade-in">
                {/* Header — minimal, no big title */}
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        My Workspace
                    </p>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className={`gap-2 h-10 px-5 ${highContrast ? 'bg-primary text-primary-foreground border-2 border-foreground shadow-none hover:bg-primary/90' : 'shadow-lg shadow-primary/25 hover:scale-[1.02]'} transition-transform`}
                    >
                        <PlusCircle className="h-4 w-4" />
                        Create Assessment
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-10">
                    {/* Assessments Table */}
                    <Card className={`border-none ${highContrast ? 'shadow-none bg-card ring-2 ring-foreground' : 'shadow-2xl bg-card/50 backdrop-blur-md ring-1 ring-primary/5'} overflow-hidden`}>
                        <CardHeader className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-8 ${highContrast ? 'bg-muted' : 'bg-primary/5'}`}>
                            <div>
                                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                    <FileText className="h-6 w-6 text-primary" />
                                    My Assessments
                                </CardTitle>
                                <CardDescription className="text-base">Active and draft tests created by you</CardDescription>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by title..."
                                    className={`pl-11 h-11 ${highContrast ? 'bg-background border-2 border-foreground' : 'bg-background border-none ring-1 ring-primary/10 focus-visible:ring-primary/40'} rounded-xl`}
                                    value={assessmentSearch}
                                    onChange={(e) => setAssessmentSearch(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className={`${highContrast ? 'bg-muted border-b-2 border-foreground' : 'bg-muted/30 border-none hover:bg-muted/30'}`}>
                                            <TableHead className="px-8 py-5 font-bold uppercase text-xs tracking-wider">Title</TableHead>
                                            <TableHead className="py-5 font-bold uppercase text-xs tracking-wider">Status</TableHead>
                                            <TableHead className="py-5 font-bold uppercase text-xs tracking-wider text-center">Questions</TableHead>
                                            <TableHead className="py-5 font-bold uppercase text-xs tracking-wider text-center">Submissions</TableHead>
                                            <TableHead className="px-8 py-5 font-bold uppercase text-xs tracking-wider text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAssessments.map((exam) => (
                                            <TableRow key={exam.id} className={`group border-b ${highContrast ? 'border-foreground' : 'border-primary/5 hover:bg-primary/[0.02]'} transition-colors`}>
                                                <TableCell className="px-8 py-6 font-semibold text-lg">{exam.title}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Switch
                                                            checked={exam.is_active}
                                                            onCheckedChange={() => handleToggleStatus(exam.id)}
                                                            className={highContrast ? 'border-2 border-foreground data-[state=checked]:bg-primary' : 'data-[state=checked]:bg-success'}
                                                        />
                                                        <span className={`text-xs font-bold uppercase tracking-tight ${exam.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                                                            {exam.is_active ? 'Live' : 'Draft'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="font-bold text-lg text-primary">
                                                        {exam.total_questions || exam.questions_count || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center font-medium text-lg text-muted-foreground">
                                                    {exam.submissions_count || 0}
                                                </TableCell>
                                                <TableCell className="px-8 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                                        onClick={() => handleDeleteExam(exam.id)}
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredAssessments.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground text-lg italic">
                                                    {assessmentSearch ? "No assessments match your search" : "No assessments created yet"}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submissions Table */}
                    <Card className={`border-none ${highContrast ? 'shadow-none bg-card ring-2 ring-foreground' : 'shadow-2xl bg-card/50 backdrop-blur-md ring-1 ring-success/5'} overflow-hidden`}>
                        <CardHeader className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-8 ${highContrast ? 'bg-muted' : 'bg-success/5'}`}>
                            <div>
                                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                    <Users className="h-6 w-6 text-success" />
                                    Student Activity
                                </CardTitle>
                                <CardDescription className="text-base">Monitor and review student performance</CardDescription>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search student or assessment..."
                                    className={`pl-11 h-11 ${highContrast ? 'bg-background border-2 border-foreground' : 'bg-background border-none ring-1 ring-success/10 focus-visible:ring-success/40'} rounded-xl`}
                                    value={submissionSearch}
                                    onChange={(e) => setSubmissionSearch(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 border-none hover:bg-muted/30">
                                            <TableHead className="px-8 py-5 font-bold uppercase text-xs tracking-wider">Student Name</TableHead>
                                            <TableHead className="py-5 font-bold uppercase text-xs tracking-wider">Assessment</TableHead>
                                            <TableHead className="py-5 font-bold uppercase text-xs tracking-wider">Score</TableHead>
                                            <TableHead className="px-8 py-5 font-bold uppercase text-xs tracking-wider text-right">Result</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSubmissions.map((sub) => (
                                            <TableRow key={sub.id} className={`group border-b ${highContrast ? 'border-foreground' : 'border-primary/5 hover:bg-success/[0.01]'} transition-colors`}>
                                                <TableCell className="px-8 py-6">
                                                    <div>
                                                        <p className="font-semibold text-lg">{sub.student_name}</p>
                                                        <p className="text-sm text-muted-foreground">@{sub.student_username}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-muted-foreground">{sub.exam_title}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${sub.percentage >= 70 ? 'bg-success' : sub.percentage >= 40 ? 'bg-warning' : 'bg-destructive'}`}
                                                                style={{ width: `${sub.percentage}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-bold text-lg">{sub.percentage.toFixed(0)}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        className="text-primary font-bold hover:bg-primary/10 rounded-xl"
                                                        onClick={() => navigate(`/review/${sub.id}`)}
                                                    >
                                                        Review
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredSubmissions.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground text-lg italic">
                                                    {submissionSearch ? "No submissions match your search" : "No recent activity found"}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {showCreateModal && (
                <CreateAssessmentFlow
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchDashboard();
                    }}
                />
            )}
        </div>
    );
};

export default TeacherDashboard;
