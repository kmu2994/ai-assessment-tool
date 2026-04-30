import axios, { AxiosError, AxiosInstance } from 'axios';

// API Base URL - uses Vite proxy in development
const API_BASE_URL = '/api';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Only redirect to login if the error is 401 and it's NOT a login request
        const isLoginRequest = error.config?.url?.includes('auth/login');

        if (error.response?.status === 401 && !isLoginRequest) {
            // Token expired or invalid - clear storage and redirect
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Types - Updated for MongoDB (string IDs instead of numbers)
export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    role: 'student' | 'teacher' | 'admin';
    accessibility_mode: boolean;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    role?: 'student' | 'teacher' | 'admin';
    accessibility_mode?: boolean;
}

export interface Exam {
    id: string;
    title: string;
    subject: string;
    description: string | null;
    type: 'MCQ' | 'DESCRIPTIVE';
    is_adaptive: boolean;
    duration_minutes: number;
    total_questions: number;
    total_marks: number;
    passing_score: number;
    is_active: boolean;
    has_submitted: boolean;
    created_at: string;
    scheduled_at?: string | null;
}

export interface Question {
    id?: string;
    question_text: string;
    question_type: 'mcq' | 'descriptive';
    difficulty: number;
    points: number;
    options: Record<string, string> | null;
    correct_answer?: string;
    model_answer?: string;
    source?: 'MANUAL' | 'AI';
}

export interface ExamSession {
    submission_id: string;
    exam: Exam;
    first_question: Question | null;
    total_questions: number;
    duration_minutes: number;
    resumed?: boolean;   // true when an in-progress session was resumed
}


export interface GradingResult {
    success: boolean;
    is_correct: boolean;
    score: number;
    feedback: string;
    similarity?: number;
    next_question: Question | null;
    exam_complete: boolean;
}

export interface ExamResult {
    total_score: number;
    percentage: number;
    passed: boolean;
    summary: string;
    question_results: Array<{
        score: number;
        max_points: number;
        is_correct: boolean;
    }>;
}

export interface StudentAnalytics {
    user: string;
    analytics: {
        total_exams: number;
        average_score: number;
        best_score: number;
        worst_score: number;
    };
    history: Array<{
        id: string;
        exam_title: string;
        percentage: number;
        total_score: number;
        max_score: number;
        submitted_at: string;
    }>;
}

export interface TeacherDashboard {
    total_exams_created: number;
    total_submissions: number;
    exams: Array<{
        id: string;
        title: string;
        is_active: boolean;
        is_adaptive: boolean;
        questions_count: number;
        total_questions: number;
        submissions_count: number;
    }>;
    student_submissions: Array<{
        id: string;
        student_name: string;
        student_username: string;
        exam_title: string;
        percentage: number;
        submitted_at: string | null;
    }>;
    activity_data: Array<{
        day: string;
        users: number;
        assessments: number;
        submissions: number;
    }>;
}

export interface SubmissionDetail {
    submission_id: string;
    exam_title: string;
    student_id: string;
    status: string;
    total_score: number;
    max_score: number;
    percentage: number;
    is_finalized: boolean;
    submitted_at?: string;
    teacher_remarks: string | null;
    answers: Array<{
        answer_id: string;
        question_text: string;
        student_answer: string;
        extracted_text: string | null;
        model_answer: string | null;
        ai_score: number;
        current_score: number;
        max_points: number;
        feedback: string;
        teacher_remarks: string | null;
        plagiarism_detected: boolean;
        image_url: string | null;
    }>;
}

export interface SubmissionReview {
    submission_id: string;
    teacher_remarks?: string;
    answer_reviews: Array<{
        answer_id: string;
        modified_score: number;
        teacher_remarks?: string;
    }>;
    is_finalized: boolean;
}

export interface AdminDashboard {
    total_users: number;
    total_exams: number;
    total_submissions: number;
    users_by_role: {
        students: number;
        teachers: number;
        admins: number;
    };
    accessibility_metrics: {
        enabled_count: number;
        total_users: number;
        usage_percentage: number;
    };
    system_status: {
        database: string;
        api_server: string;
        latency_ms: number;
        uptime: string;
    };
    recent_violations: Array<{
        user: string;
        exam: string;
        event: string;
        timestamp: string;
    }>;
    activity_data: Array<{
        day: string;
        users: number;
        assessments: number;
        submissions: number;
    }>;
}

export interface QuestionCreate {
    question_text: string;
    question_type: string;
    difficulty: number;
    points: number;
    options: Record<string, string> | null;
    correct_answer?: string;
    model_answer?: string;
    source?: string;
}

export interface ExamCreate {
    title: string;
    subject: string;
    description?: string;
    type: string;
    is_active?: boolean;
    is_adaptive?: boolean;
    duration_minutes?: number;
    total_questions?: number;
    total_marks?: number;
    passing_score?: number;
    scheduled_at?: string;
    questions: QuestionCreate[];
}

// Auth API
export const authApi = {
    login: async (username: string, password: string): Promise<LoginResponse> => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await apiClient.post<LoginResponse>('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        // Store token and user
        localStorage.setItem('accessToken', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        return response.data;
    },

    register: async (data: RegisterData): Promise<User> => {
        const response = await apiClient.post<User>('/auth/register', data);
        return response.data;
    },

    getMe: async (): Promise<User> => {
        const response = await apiClient.get<User>('/auth/me');
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },

    getStoredUser: (): User | null => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('accessToken') && !!localStorage.getItem('user');
    },

    // Admin only
    listUsers: async (): Promise<User[]> => {
        const response = await apiClient.get<User[]>('/auth/users');
        return response.data;
    },

    updateUserRole: async (userId: string, newRole: string): Promise<User> => {
        const response = await apiClient.patch<User>(`/auth/users/${userId}/role`, null, {
            params: { new_role: newRole },
        });
        return response.data;
    },

    deleteUser: async (userId: string): Promise<void> => {
        await apiClient.delete(`/auth/users/${userId}`);
    },
};

// Exams API - Updated for MongoDB string IDs
export const examsApi = {
    createExam: async (data: ExamCreate): Promise<Exam> => {
        const response = await apiClient.post<Exam>('/exams/create', data);
        return response.data;
    },

    listAvailable: async (): Promise<Exam[]> => {
        const response = await apiClient.get<Exam[]>('/exams/available');
        return response.data;
    },

    getExam: async (examId: string): Promise<Exam> => {
        const response = await apiClient.get<Exam>(`/exams/${examId}`);
        return response.data;
    },

    startExam: async (examId: string): Promise<ExamSession> => {
        const response = await apiClient.post<ExamSession>(`/exams/${examId}/start`);
        return response.data;
    },

    submitAnswer: async (
        submissionId: string,
        questionId: string,
        answer: string
    ): Promise<GradingResult> => {
        const response = await apiClient.post<GradingResult>(`/exams/${submissionId}/answer`, {
            question_id: questionId,
            answer,
        });
        return response.data;
    },

    finishExam: async (submissionId: string): Promise<ExamResult> => {
        const response = await apiClient.post<ExamResult>(`/exams/${submissionId}/finish`);
        return response.data;
    },

    deleteExam: async (examId: string): Promise<void> => {
        await apiClient.delete(`/exams/${examId}`);
    },

    uploadAnswer: async (
        submissionId: string,
        questionId: string,
        file: File
    ): Promise<GradingResult> => {
        const formData = new FormData();
        formData.append('question_id', questionId);
        formData.append('file', file);

        const response = await apiClient.post<GradingResult>(
            `/exams/${submissionId}/upload-answer`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    getSubmission: async (submissionId: string): Promise<SubmissionDetail> => {
        const response = await apiClient.get<SubmissionDetail>(`/exams/submission/${submissionId}`);
        return response.data;
    },

    reviewSubmission: async (data: SubmissionReview): Promise<void> => {
        await apiClient.post('/exams/review', data);
    },

    extractText: async (file: File): Promise<{ text: string, filename: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/exams/extract-text', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    generateAIQuestions: async (data: { text: string, type: string, count: number, difficulty: string, total_marks?: number }): Promise<Question[]> => {
        const response = await apiClient.post<Question[]>('/exams/generate-questions', data);
        return response.data;
    },

    logProctorEvent: async (submissionId: string, eventType: string, details: string): Promise<void> => {
        await apiClient.post(`/exams/${submissionId}/proctor/event`, {
            event_type: eventType,
            details: details,
            timestamp: new Date().toISOString()
        });
    },

    toggleExamStatus: async (examId: string): Promise<{ id: string, is_active: boolean }> => {
        const response = await apiClient.post(`exams/${examId}/toggle-status`);
        return response.data;
    }
};

// Analytics API
export const analyticsApi = {
    getStudentAnalytics: async (): Promise<StudentAnalytics> => {
        const response = await apiClient.get<StudentAnalytics>('/analytics/student/me');
        return response.data;
    },

    getExamAnalytics: async (examId: string) => {
        const response = await apiClient.get(`/analytics/exam/${examId}`);
        return response.data;
    },

    getTeacherDashboard: async (): Promise<TeacherDashboard> => {
        const response = await apiClient.get<TeacherDashboard>('/analytics/dashboard/teacher');
        return response.data;
    },

    getAdminDashboard: async (): Promise<AdminDashboard> => {
        const response = await apiClient.get<AdminDashboard>('/analytics/dashboard/admin');
        return response.data;
    },
};

// Question Bank API
export const questionBankApi = {
    save: async (questionData: {
        question_text: string;
        question_type: string;
        subject?: string;
        topic?: string;
        difficulty?: string;
        points?: number;
        options?: Record<string, string> | null;
        correct_answer?: string;
        model_answer?: string;
    }) => {
        const response = await apiClient.post('/exams/question-bank/save', questionData);
        return response.data;
    },

    list: async (filters?: { subject?: string; difficulty?: string; question_type?: string }) => {
        const params = new URLSearchParams();
        if (filters?.subject) params.append('subject', filters.subject);
        if (filters?.difficulty) params.append('difficulty', filters.difficulty);
        if (filters?.question_type) params.append('question_type', filters.question_type);
        const response = await apiClient.get(`/exams/question-bank?${params.toString()}`);
        return response.data;
    },

    delete: async (questionId: string) => {
        const response = await apiClient.delete(`/exams/question-bank/${questionId}`);
        return response.data;
    }
};

export default apiClient;
