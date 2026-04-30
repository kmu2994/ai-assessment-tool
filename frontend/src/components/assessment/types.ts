import { ExamCreate, QuestionCreate, Question } from "@/lib/api";

export interface CreateAssessmentFlowProps {
    onClose: () => void;
    onSuccess: () => void;
}

export interface StepDetailsProps {
    examData: ExamCreate;
    setExamData: React.Dispatch<React.SetStateAction<ExamCreate>>;
}

export interface QuestionEditorProps {
    examType: string;
    newQuestion: QuestionCreate;
    setNewQuestion: React.Dispatch<React.SetStateAction<QuestionCreate>>;
    editingIdx: number | null;
    onAdd: () => void;
    onCancelEdit: () => void;
}

export interface AIGenerationPanelProps {
    examData: ExamCreate;
    setExamData: React.Dispatch<React.SetStateAction<ExamCreate>>;
    extractedText: string;
    setExtractedText: React.Dispatch<React.SetStateAction<string>>;
    aiQuestions: Question[];
    setAiQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
    selectedAiIndices: number[];
    setSelectedAiIndices: React.Dispatch<React.SetStateAction<number[]>>;
    aiOptions: { count: number; difficulty: string };
    setAiOptions: React.Dispatch<React.SetStateAction<{ count: number; difficulty: string }>>;
    isExtracting: boolean;
    setIsExtracting: React.Dispatch<React.SetStateAction<boolean>>;
    isGenerating: boolean;
    setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
    saveBankTopic: string;
    setSaveBankTopic: React.Dispatch<React.SetStateAction<string>>;
}

export interface QuestionBankPanelProps {
    examData: ExamCreate;
    setExamData: React.Dispatch<React.SetStateAction<ExamCreate>>;
    bankQuestions: any[];
    setBankQuestions: React.Dispatch<React.SetStateAction<any[]>>;
    selectedBankIndices: number[];
    setSelectedBankIndices: React.Dispatch<React.SetStateAction<number[]>>;
    isLoadingBank: boolean;
    bankFilter: { subject: string; topic: string };
    setBankFilter: React.Dispatch<React.SetStateAction<{ subject: string; topic: string }>>;
    availableSubjects: string[];
    setAvailableSubjects: React.Dispatch<React.SetStateAction<string[]>>;
    availableTopics: string[];
    setAvailableTopics: React.Dispatch<React.SetStateAction<string[]>>;
    selectedTopics: string[];
    setSelectedTopics: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface StepQuestionsProps {
    examData: ExamCreate;
    setExamData: React.Dispatch<React.SetStateAction<ExamCreate>>;
    editingIdx: number | null;
    setEditingIdx: React.Dispatch<React.SetStateAction<number | null>>;
    newQuestion: QuestionCreate;
    setNewQuestion: React.Dispatch<React.SetStateAction<QuestionCreate>>;
    activeTab: 'manual' | 'ai' | 'bank';
    setActiveTab: React.Dispatch<React.SetStateAction<'manual' | 'ai' | 'bank'>>;
    // Manual question handlers
    onAddManualQuestion: () => void;
    onEditQuestion: (idx: number) => void;
    onRemoveQuestion: (idx: number) => void;
    onBalanceMarks: () => void;
    // AI Generation
    aiProps: AIGenerationPanelProps;
    // Question Bank
    bankProps: QuestionBankPanelProps;
}

export interface StepReviewProps {
    examData: ExamCreate;
}
