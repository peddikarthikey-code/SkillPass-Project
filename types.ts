
export enum Proficiency {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  EXPERT = 'Expert'
}

export enum LearningStyle {
  HANDS_ON = 'Hands-on',
  EXPLANATION = 'Explanation',
  PROJECT_BASED = 'Project-based'
}

export enum SessionType {
  DEBUG = 'Debug Session',
  MOCK_INTERVIEW = 'Mock Interview',
  RESUME_REVIEW = 'Resume Review',
  PROJECT_SPRINT = 'Mini Project Sprint',
  SKILL_BURST = '15-Min Skill Burst',
  CLASS_DOUBT = 'Doubt Clarifying Class',
  CLASS_TEACH = 'Teaching Class',
  STUDY_GROUP = 'Combined Study'
}

export interface Skill {
  name: string;
  proficiency: Proficiency;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  phone?: string;
  skillsOffered: Skill[];
  skillsWanted: Skill[];
  availability: string;
  learningStyle: LearningStyle;
  credits: number;
  reputation: number;
  badges: string[];
  impactScore: number;
  streak: number;
  friends?: string[]; // IDs of friends
}

export interface Session {
  id: string;
  mentorId: string;
  learnerId: string;
  type: SessionType;
  skill: string;
  duration: number; // minutes
  credits: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  goals: string[];
  output?: string;
  feedback?: string;
  createdAt: string;
  scheduledTime?: string;
  rescheduleRequests?: { from: string; note: string; timestamp: string }[];
}

export interface Meeting {
  id: string;
  topic: string;
  participants: string[]; // User IDs
  scheduledAt: string;
  link: string;
  type: 'study' | 'class';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'system' | 'email-sent';
  timestamp: string;
  read: boolean;
  eventId?: string;
}
