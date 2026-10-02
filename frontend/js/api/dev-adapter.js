// In-memory / LocalStorage dev adapter serving ONLY the 5 mandatory test records

// Bump this version to force re-seed of localStorage with fresh seed data
const DEV_SEED_VERSION = '2';

const SEED_USERS = [
  {
    id: 'u-admin-1',
    name: 'UIU Portal Administrator',
    email: 'admin@uiu.test',
    password: 'Test@1234',
    role: 'admin',
    status: 'approved',
    studentId: 'ADM-001',
    department: 'CSE',
    program: 'BSc in CSE',
    verified: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'u-alumni-1',
    name: 'Anik Rahman',
    email: 'alumni@uiu.test',
    password: 'Test@1234',
    role: 'alumni',
    status: 'approved',
    studentId: '011171001',
    department: 'CSE',
    program: 'BSc in CSE',
    graduationYear: '2021',
    company: 'TechCorp Solutions',
    jobTitle: 'Software Engineer',
    city: 'Dhaka, Bangladesh',
    willingToMentor: true,
    mentorExpertise: ['Software Development', 'System Architecture', 'Interview Prep'],
    bio: 'Passionate software engineer building high-scale distributed systems. Happy to mentor UIU students!',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    portfolio: 'https://portfolio.dev',
    verified: true,
    createdAt: '2025-01-10',
    careerTimeline: [
      { id: 'ct-1', type: 'Work', title: 'Software Engineer', organization: 'TechCorp Solutions Inc.', startDate: '2021-06-01', endDate: 'Present', description: 'Working on large-scale distributed systems and cloud infrastructure.' },
      { id: 'ct-2', type: 'Work', title: 'Intern Developer', organization: 'DevHouse BD', startDate: '2020-01-01', endDate: '2021-05-31', description: 'Assisted in frontend development using React and client projects.' },
      { id: 'ct-3', type: 'Education', title: 'BSc in Computer Science & Engineering', organization: 'United International University', startDate: '2017-01-01', endDate: '2021-05-01', description: 'Graduated with Magna Cum Laude honors.' }
    ]
  },
  {
    id: 'u-student-1',
    name: 'Sadman Malik',
    email: 'student@uiu.test',
    password: 'Test@1234',
    role: 'student',
    status: 'approved',
    studentId: '011211050',
    department: 'CSE',
    program: 'BSc in CSE',
    currentSemester: '9th Trimester',
    expectedGraduation: '2026',
    city: 'Dhaka, Bangladesh',
    bio: 'Senior CSE student interested in Full-Stack development and Cloud Computing.',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    verified: false,
    createdAt: '2025-02-01'
  }
];

const SEED_EVENTS = [
  {
    id: 'ev-1',
    title: 'UIU Annual Alumni Gala & Networking 2026',
    description: 'Join us for the premier annual networking event connecting UIU alumni, top industry experts, and current students. Food, drinks, and career sessions included!',
    date: '2026-11-28',
    time: '06:00 PM',
    venue: 'Radisson Blu, Dhaka',
    type: 'In-Person',
    capacity: 200,
    registeredUserIds: [],
    createdBy: 'u-admin-1',
    createdAt: '2026-01-15'
  }
];

const SEED_JOBS = [
  {
    id: 'jb-1',
    title: 'Junior Frontend Developer',
    company: 'TechCorp Solutions',
    location: 'Dhaka (Hybrid)',
    type: 'Full-time',
    salary: '45,000 - 60,000 BDT',
    description: 'We are seeking a talented Junior Frontend Developer to join our UI/UX team. You will build high-quality web interfaces.',
    requirements: 'HTML, CSS, JavaScript, ES6+, REST APIs, Git. Strong problem-solving skills.',
    deadline: '2026-12-31',
    recruiterEmail: 'recruiter@techcorp.com',
    postedBy: 'u-alumni-1',
    postedByName: 'Anik Rahman',
    postedByCompany: 'TechCorp Solutions',
    status: 'approved',
    applicantsCount: 0,
    createdAt: '2026-02-01'
  }
];

function initializeStorage() {
  const storedVersion = localStorage.getItem('uiu_dev_seed_version');
  if (storedVersion !== DEV_SEED_VERSION) {
    localStorage.setItem('uiu_users', JSON.stringify(SEED_USERS));
    localStorage.setItem('uiu_events', JSON.stringify(SEED_EVENTS));
    localStorage.setItem('uiu_jobs', JSON.stringify(SEED_JOBS));
    localStorage.setItem('uiu_mentorship_requests', JSON.stringify([]));
    localStorage.setItem('uiu_messages', JSON.stringify([]));
    localStorage.setItem('uiu_cleared_chats', JSON.stringify({}));
    localStorage.setItem('uiu_donations', JSON.stringify([]));
    localStorage.setItem('uiu_job_applications', JSON.stringify([]));
    localStorage.setItem('uiu_dev_seed_version', DEV_SEED_VERSION);
    return;
  }
  if (!localStorage.getItem('uiu_users')) localStorage.setItem('uiu_users', JSON.stringify(SEED_USERS));
  if (!localStorage.getItem('uiu_events')) localStorage.setItem('uiu_events', JSON.stringify(SEED_EVENTS));
  if (!localStorage.getItem('uiu_jobs')) localStorage.setItem('uiu_jobs', JSON.stringify(SEED_JOBS));
  if (!localStorage.getItem('uiu_mentorship_requests')) localStorage.setItem('uiu_mentorship_requests', JSON.stringify([]));
  if (!localStorage.getItem('uiu_messages')) localStorage.setItem('uiu_messages', JSON.stringify([]));
  if (!localStorage.getItem('uiu_cleared_chats')) localStorage.setItem('uiu_cleared_chats', JSON.stringify({}));
  if (!localStorage.getItem('uiu_donations')) localStorage.setItem('uiu_donations', JSON.stringify([]));
  if (!localStorage.getItem('uiu_job_applications')) localStorage.setItem('uiu_job_applications', JSON.stringify([]));
}

initializeStorage();

export const DevAdapter = {
  getUsers: () => JSON.parse(localStorage.getItem('uiu_users') || '[]'),
  saveUsers: (users) => localStorage.setItem('uiu_users', JSON.stringify(users)),

  getEvents: () => JSON.parse(localStorage.getItem('uiu_events') || '[]'),
  saveEvents: (events) => localStorage.setItem('uiu_events', JSON.stringify(events)),

  getJobs: () => JSON.parse(localStorage.getItem('uiu_jobs') || '[]'),
  saveJobs: (jobs) => localStorage.setItem('uiu_jobs', JSON.stringify(jobs)),

  getMentorshipRequests: () => JSON.parse(localStorage.getItem('uiu_mentorship_requests') || '[]'),
  saveMentorshipRequests: (reqs) => localStorage.setItem('uiu_mentorship_requests', JSON.stringify(reqs)),

  getMessages: () => JSON.parse(localStorage.getItem('uiu_messages') || '[]'),
  saveMessages: (msgs) => localStorage.setItem('uiu_messages', JSON.stringify(msgs)),

  getClearedChats: () => JSON.parse(localStorage.getItem('uiu_cleared_chats') || '{}'),
  saveClearedChats: (map) => localStorage.setItem('uiu_cleared_chats', JSON.stringify(map)),

  getDonations: () => JSON.parse(localStorage.getItem('uiu_donations') || '[]'),
  saveDonations: (dons) => localStorage.setItem('uiu_donations', JSON.stringify(dons)),

  getJobApplications: () => JSON.parse(localStorage.getItem('uiu_job_applications') || '[]'),
  saveJobApplications: (apps) => localStorage.setItem('uiu_job_applications', JSON.stringify(apps))
};
