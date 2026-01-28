
import { User, Proficiency, LearningStyle, SessionType } from './types.ts';

export const MOCK_CURRENT_USER: User = {
  id: 'u-1',
  name: 'Alex Rivera',
  avatar: 'https://picsum.photos/seed/alex/200',
  bio: 'Software Engineer passionate about teaching Python and learning UI design.',
  skillsOffered: [
    { name: 'Python', proficiency: Proficiency.EXPERT },
    { name: 'SQL', proficiency: Proficiency.INTERMEDIATE }
  ],
  skillsWanted: [
    { name: 'React', proficiency: Proficiency.BEGINNER },
    { name: 'Figma', proficiency: Proficiency.BEGINNER }
  ],
  availability: 'Weekdays after 6 PM',
  learningStyle: LearningStyle.PROJECT_BASED,
  credits: 12,
  reputation: 98,
  badges: ['Top Mentor', 'Fast Responder'],
  impactScore: 450,
  streak: 5
};

export const MOCK_USERS: User[] = [
  {
    id: 'u-2',
    name: 'Sarah Chen',
    avatar: 'https://picsum.photos/seed/sarah/200',
    bio: 'Product Designer looking to understand backend basics.',
    skillsOffered: [
      { name: 'Figma', proficiency: Proficiency.EXPERT },
      { name: 'UI Design', proficiency: Proficiency.EXPERT }
    ],
    skillsWanted: [
      { name: 'Python', proficiency: Proficiency.BEGINNER },
      { name: 'Node.js', proficiency: Proficiency.BEGINNER }
    ],
    availability: 'Flexible weekends',
    learningStyle: LearningStyle.HANDS_ON,
    credits: 8,
    reputation: 95,
    badges: ['Design Guru'],
    impactScore: 320,
    streak: 3
  },
  {
    id: 'u-3',
    name: 'James Wilson',
    avatar: 'https://picsum.photos/seed/james/200',
    bio: 'Fullstack dev. Happy to help with React/Next.js.',
    skillsOffered: [
      { name: 'React', proficiency: Proficiency.EXPERT },
      { name: 'Next.js', proficiency: Proficiency.EXPERT }
    ],
    skillsWanted: [
      { name: 'Public Speaking', proficiency: Proficiency.INTERMEDIATE }
    ],
    availability: 'Mon-Wed 8PM-10PM',
    learningStyle: LearningStyle.EXPLANATION,
    credits: 25,
    reputation: 99,
    badges: ['Code Master', 'Patient Teacher'],
    impactScore: 890,
    streak: 12
  }
];

// Added mock data for live skill bursts
export const MOCK_BURSTS = [
  {
    id: 'b-1',
    user: MOCK_USERS[0],
    skill: 'Figma',
    topic: 'Quick feedback on your mobile app wireframes'
  },
  {
    id: 'b-2',
    user: MOCK_USERS[1],
    skill: 'React',
    topic: 'Debugging useEffect dependency issues'
  }
];

export const SKILL_CREDIT_VALUES = {
  [SessionType.SKILL_BURST]: 1,
  [SessionType.DEBUG]: 2,
  [SessionType.MOCK_INTERVIEW]: 3,
  [SessionType.RESUME_REVIEW]: 2,
  [SessionType.PROJECT_SPRINT]: 5
};
