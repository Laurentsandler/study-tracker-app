// TypeScript types for the Study Tracker App

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed';
export type AssignmentPriority = 'low' | 'medium' | 'high';
export type StudyMaterialType = 'notes' | 'study_guide' | 'practice_test' | 'flashcards';
export type WorklogType = 'classwork' | 'homework' | 'notes' | 'quiz' | 'test' | 'project' | 'other';
export type ScheduleBlockType = 'class' | 'study' | 'free' | 'work' | 'other';
export type TaskType = 'assignment' | 'study' | 'review' | 'break';
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed';

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
  block_type: ScheduleBlockType;
  location: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlannedTask {
  id: string;
  user_id: string;
  assignment_id: string | null;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  completed: boolean;
  notes: string | null;
  title: string | null;
  task_type: TaskType;
  ai_generated: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  // Joined data
  assignment?: Assignment;
}

export interface ScheduleSuggestion {
  id: string;
  user_id: string;
  assignment_id: string | null;
  suggested_date: string;
  suggested_start: string;
  suggested_end: string;
  reason: string | null;
  status: SuggestionStatus;
  created_at: string;
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
  block_type?: ScheduleBlockType;
  location?: string;
}

export interface CreatePlannedTaskInput {
  assignment_id?: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  title?: string;
  task_type?: TaskType;
  notes?: string;
  ai_generated?: boolean;
  priority?: number;
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

// Shared Courses Types
export type SharedCourseMemberRole = 'owner' | 'member';

export interface SharedCourse {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string | null;
  invite_code: string;
  created_at: string;
  updated_at: string;
  // Joined data
  member_count?: number;
  members?: SharedCourseMember[];
}

export interface SharedCourseMember {
  id: string;
  shared_course_id: string;
  user_id: string;
  role: SharedCourseMemberRole;
  joined_at: string;
  // Joined data
  profile?: Profile;
}

export interface SharedAssignment {
  id: string;
  shared_course_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: AssignmentPriority;
  estimated_duration: number;
  raw_input_text: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  shared_course?: SharedCourse;
  creator?: Profile;
  is_copied?: boolean;
  is_dismissed?: boolean;
}

export interface UserSharedAssignmentCopy {
  id: string;
  shared_assignment_id: string;
  user_id: string;
  local_assignment_id: string | null;
  copied_at: string;
}

export interface UserDismissedSharedAssignment {
  id: string;
  shared_assignment_id: string;
  user_id: string;
  dismissed_at: string;
}

// Form types for shared courses
export interface CreateSharedCourseInput {
  name: string;
  description?: string;
  color?: string;
}

export interface JoinSharedCourseInput {
  invite_code: string;
}

export interface CreateSharedAssignmentInput {
  shared_course_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: AssignmentPriority;
  estimated_duration?: number;
}
