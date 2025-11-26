// TypeScript types for the Study Tracker App

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed';
export type AssignmentPriority = 'low' | 'medium' | 'high';
export type StudyMaterialType = 'notes' | 'study_guide' | 'practice_test' | 'flashcards';
export type WorklogType = 'classwork' | 'homework' | 'notes' | 'quiz' | 'test' | 'project' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  settings: {
    notifications: boolean;
    theme: 'light' | 'dark';
    defaultView: 'list' | 'calendar';
  };
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  name: string;
  color: string;
  instructor: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  estimated_duration: number;
  raw_input_text: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  course?: Course;
  images?: AssignmentImage[];
  study_materials?: StudyMaterial[];
}

export interface AssignmentImage {
  id: string;
  assignment_id: string;
  user_id: string;
  image_url: string;
  storage_path: string;
  extracted_text: string | null;
  created_at: string;
}

export interface StudyMaterial {
  id: string;
  assignment_id: string;
  user_id: string;
  type: StudyMaterialType;
  title: string;
  content: NotesContent | StudyGuideContent | PracticeTestContent | FlashcardsContent;
  created_at: string;
  updated_at: string;
}

export interface NotesContent {
  summary: string;
  keyPoints: string[];
  importantTerms: { term: string; definition: string }[];
}

export interface StudyGuideContent {
  sections: {
    title: string;
    content: string;
    keyTakeaways: string[];
  }[];
  reviewQuestions: string[];
}

export interface PracticeTestContent {
  questions: {
    id: string;
    question: string;
    type: 'multiple_choice' | 'short_answer' | 'true_false';
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }[];
}

export interface FlashcardsContent {
  cards: {
    id: string;
    front: string;
    back: string;
  }[];
}

export interface UserSchedule {
  id: string;
  user_id: string;
  day_of_week: number; // 0-6
  available_start: string; // HH:MM format
  available_end: string;
  label: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlannedTask {
  id: string;
  user_id: string;
  assignment_id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assignment?: Assignment;
}

export interface Transcription {
  id: string;
  user_id: string;
  assignment_id: string | null;
  audio_url: string | null;
  storage_path: string | null;
  transcribed_text: string;
  processed: boolean;
  created_at: string;
}

export interface Worklog {
  id: string;
  user_id: string;
  assignment_id: string | null;
  course_id: string | null;
  title: string;
  description: string | null;
  content: string | null;
  topic: string | null;
  worklog_type: WorklogType;
  date_completed: string;
  image_url: string | null;
  storage_path: string | null;
  raw_extracted_text: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assignment?: Assignment;
  course?: Course;
}

// Form types
export interface CreateAssignmentInput {
  title: string;
  description?: string;
  course_id?: string;
  due_date?: string;
  priority?: AssignmentPriority;
  estimated_duration?: number;
}

export interface UpdateAssignmentInput extends Partial<CreateAssignmentInput> {
  status?: AssignmentStatus;
}

export interface CreateCourseInput {
  name: string;
  color?: string;
  instructor?: string;
}

export interface ScheduleBlockInput {
  day_of_week: number;
  available_start: string;
  available_end: string;
  label?: string;
}

export interface CreateWorklogInput {
  title: string;
  description?: string;
  content?: string;
  topic?: string;
  worklog_type?: WorklogType;
  date_completed?: string;
  assignment_id?: string;
  course_id?: string;
  image_url?: string;
  storage_path?: string;
  raw_extracted_text?: string;
}

export interface UpdateWorklogInput extends Partial<CreateWorklogInput> {}

// Study Session types for "Help Me Study" feature
export interface StudySessionConfig {
  topic: string;
  unit?: string;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
  courseId?: string;
  includeWorklogs: boolean;
  includeAssignments: boolean;
  materialTypes: StudyMaterialType[];
}

export interface StudySessionSource {
  type: 'worklog' | 'assignment';
  id: string;
  title: string;
  date: string;
  content: string;
  topic?: string;
}

export interface StudySession {
  id: string;
  config: StudySessionConfig;
  sources: StudySessionSource[];
  combinedContent: string;
  generatedMaterials: {
    type: StudyMaterialType;
    content: NotesContent | StudyGuideContent | PracticeTestContent | FlashcardsContent;
    generatedAt: string;
  }[];
  createdAt: string;
}

export interface StudyPlanOverview {
  topic: string;
  unit?: string;
  totalSources: number;
  worklogCount: number;
  assignmentCount: number;
  dateRange: {
    from: string;
    to: string;
  };
  keyTopics: string[];
  recommendedFocus: string[];
  estimatedStudyTime: number; // in minutes
}
