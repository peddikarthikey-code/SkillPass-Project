
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  User as UserIcon, 
  Zap, 
  TrendingUp, 
  BrainCircuit, 
  Flame, 
  Clock, 
  Rocket, 
  X, 
  Plus, 
  Trash2, 
  Video, 
  Calendar, 
  Edit2, 
  Check, 
  Link as LinkIcon, 
  MessageCircle, 
  Phone, 
  Database,
  Cpu,
  PhoneOff,
  Camera,
  Save,
  PlusCircle,
  Award,
  BookOpenCheck,
  Bell,
  Mail,
  ChevronRight,
  History,
  Archive,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { User, Session, SessionType, Proficiency, Skill, Meeting, AppNotification } from './types.ts';
import { MOCK_CURRENT_USER, MOCK_USERS, SKILL_CREDIT_VALUES, MOCK_BURSTS } from './constants.ts';
import SkillIdentityCard from './components/SkillIdentityCard.tsx';
import SessionManager from './components/SessionManager.tsx';
import { getSmartMatchAnalysis } from './services/geminiService.ts';

type CallState = 'idle' | 'prompting' | 'dialing' | 'ongoing' | 'no-answer' | 'ended';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('sf_user');
    return saved ? JSON.parse(saved) : MOCK_CURRENT_USER;
  });
  
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('sf_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    const saved = localStorage.getItem('sf_meetings');
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [activeInstantSession, setActiveInstantSession] = useState<any>(null);
  
  // Profile Editing States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingDashSkills, setIsEditingDashSkills] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    bio: currentUser.bio,
    avatar: currentUser.avatar,
    skillsOffered: [...currentUser.skillsOffered],
    skillsWanted: [...currentUser.skillsWanted]
  });

  // Dash Editing Form (Specific for Dashboard Quick Edit)
  const [dashSkillsForm, setDashSkillsForm] = useState({
    skillsOffered: [...currentUser.skillsOffered],
    skillsWanted: [...currentUser.skillsWanted]
  });

  // Temporary New Skill Inputs
  const [newOfferedSkill, setNewOfferedSkill] = useState({ name: '', prof: Proficiency.BEGINNER });
  const [newWantedSkill, setNewWantedSkill] = useState({ name: '', prof: Proficiency.BEGINNER });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bursts = MOCK_BURSTS;
  const [callState, setCallState] = useState<CallState>('idle');
  const [callPhoneNumber, setCallPhoneNumber] = useState('');
  const [deepQuery, setDeepQuery] = useState('');
  const [meetingTopic, setMeetingTopic] = useState('');
  const [classTime, setClassTime] = useState('');

  // Persistence Effects
  useEffect(() => localStorage.setItem('sf_user', JSON.stringify(currentUser)), [currentUser]);
  useEffect(() => localStorage.setItem('sf_sessions', JSON.stringify(sessions)), [sessions]);
  useEffect(() => localStorage.setItem('sf_meetings', JSON.stringify(meetings)), [meetings]);

  // Notification Engine: Checks every 30 seconds for upcoming events
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      
      const processEvent = (eventTime: string | undefined, id: string, topic: string) => {
        if (!eventTime || notifiedIds.has(id)) return;
        
        const scheduledDate = new Date(eventTime);
        const diffMs = scheduledDate.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);

        // Notify if within 15 minutes but not passed
        if (diffMins > 0 && diffMins <= 15.5) {
          const newNotif: AppNotification = {
            id: `notif-${Date.now()}-${id}`,
            title: 'Upcoming Session',
            message: `"${topic}" starts in ${Math.round(diffMins)} minutes! A reminder email has also been sent to your registered address.`,
            type: 'reminder',
            timestamp: new Date().toISOString(),
            read: false,
            eventId: id
          };
          
          setNotifications(prev => [newNotif, ...prev]);
          setNotifiedIds(prev => new Set(prev).add(id));
        }
      };

      sessions.forEach(s => processEvent(s.scheduledTime, s.id, s.skill));
      meetings.forEach(m => processEvent(m.scheduledAt, m.id, m.topic));
    };

    const interval = setInterval(checkSchedule, 30000);
    checkSchedule(); // Initial check
    return () => clearInterval(interval);
  }, [sessions, meetings, notifiedIds]);

  const handleSaveProfile = () => {
    setCurrentUser(prev => ({
      ...prev,
      name: profileForm.name,
      bio: profileForm.bio,
      avatar: profileForm.avatar,
      skillsOffered: profileForm.skillsOffered,
      skillsWanted: profileForm.skillsWanted
    }));
    setIsEditingProfile(false);
  };

  const handleSaveDashSkills = () => {
    setCurrentUser(prev => ({
      ...prev,
      skillsOffered: dashSkillsForm.skillsOffered,
      skillsWanted: dashSkillsForm.skillsWanted
    }));
    setIsEditingDashSkills(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addSkill = (type: 'offered' | 'wanted', source: 'profile' | 'dash') => {
    const skillData = type === 'offered' ? newOfferedSkill : newWantedSkill;
    if (!skillData.name.trim()) return;

    const newSkill: Skill = { name: skillData.name.trim(), proficiency: skillData.prof };
    
    if (source === 'profile') {
      setProfileForm(prev => ({
        ...prev,
        [type === 'offered' ? 'skillsOffered' : 'skillsWanted']: [
          ...prev[type === 'offered' ? 'skillsOffered' : 'skillsWanted'],
          newSkill
        ]
      }));
    } else {
      setDashSkillsForm(prev => ({
        ...prev,
        [type === 'offered' ? 'skillsOffered' : 'skillsWanted']: [
          ...prev[type === 'offered' ? 'skillsOffered' : 'skillsWanted'],
          newSkill
        ]
      }));
    }

    if (type === 'offered') setNewOfferedSkill({ name: '', prof: Proficiency.BEGINNER });
    else setNewWantedSkill({ name: '', prof: Proficiency.BEGINNER });
  };

  const removeSkill = (type: 'offered' | 'wanted', index: number, source: 'profile' | 'dash') => {
    if (source === 'profile') {
      setProfileForm(prev => ({
        ...prev,
        [type === 'offered' ? 'skillsOffered' : 'skillsWanted']: prev[type === 'offered' ? 'skillsOffered' : 'skillsWanted'].filter((_, i) => i !== index)
      }));
    } else {
      setDashSkillsForm(prev => ({
        ...prev,
        [type === 'offered' ? 'skillsOffered' : 'skillsWanted']: prev[type === 'offered' ? 'skillsOffered' : 'skillsWanted'].filter((_, i) => i !== index)
      }));
    }
  };

  const handleFindMatches = async () => {
    if (!deepQuery.trim()) return;
    setIsLoading(true);
    const analyzedMatches = await Promise.all(
      MOCK_USERS.map(async (u) => {
        const analysis = await getSmartMatchAnalysis(currentUser, u, deepQuery);
        return { user: u, ...analysis };
      })
    );
    setMatches(analyzedMatches.sort((a, b) => b.matchScore - a.matchScore));
    setIsLoading(false);
  };

  const createSession = (targetUser: User, type: SessionType, skill: string, scheduledTime?: string) => {
    const cost = SKILL_CREDIT_VALUES[type] || 2;
    if (currentUser.credits < cost) {
      alert("Insufficient Skill Credits!");
      return;
    }

    const newSession: Session = {
      id: `s-${Date.now()}`,
      mentorId: targetUser.id,
      learnerId: currentUser.id,
      type,
      skill,
      duration: type === SessionType.SKILL_BURST ? 15 : 60,
      credits: cost,
      status: scheduledTime ? 'pending' : 'active',
      goals: ['Outcome-driven learning', 'Micro-collaboration'],
      createdAt: new Date().toISOString(),
      scheduledTime,
      rescheduleRequests: []
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentUser(prev => ({ ...prev, credits: prev.credits - cost }));
    
    // Manual notification clear if rescheduling old session
    if (notifiedIds.has(newSession.id)) {
      setNotifiedIds(prev => {
        const next = new Set(prev);
        next.delete(newSession.id);
        return next;
      });
    }

    setActiveTab('sessions');
  };

  const createMeeting = () => {
    if (!meetingTopic.trim()) return;
    const shareLink = `https://skillflow.meet/${Math.random().toString(36).substring(2, 9)}`;
    const newMeeting: Meeting = {
      id: `m-${Date.now()}`,
      topic: meetingTopic,
      participants: [currentUser.id],
      scheduledAt: new Date().toISOString(),
      link: shareLink,
      type: 'study'
    };
    setMeetings(prev => [newMeeting, ...prev]);
    setIsMeetingModalOpen(false);
    setMeetingTopic('');
    setActiveTab('meetings');
  };

  const handleSendSessionMessage = (sessionId: string, text: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const msg = { from: 'You', note: text, timestamp: new Date().toISOString() };
        return { ...s, rescheduleRequests: [...(s.rescheduleRequests || []), msg] };
      }
      return s;
    }));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      {/* Toast Notifications Overlay */}
      <div className="fixed top-6 right-6 z-[1000] flex flex-col gap-4 pointer-events-none w-full max-w-sm">
         {notifications.slice(0, 3).filter(n => !n.read).map(n => (
           <div key={n.id} className="pointer-events-auto bg-white/80 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-3xl p-6 flex gap-4 animate-in slide-in-from-right-10 duration-500">
              <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-indigo-200">
                 <Bell size={24} className="animate-ring" />
              </div>
              <div className="flex-1">
                 <div className="flex items-center justify-between mb-1">
                   <h4 className="font-black text-slate-800 text-sm">Session Reminder</h4>
                   <span className="text-[9px] font-black text-slate-400 uppercase">Just now</span>
                 </div>
                 <p className="text-xs text-slate-600 font-medium mb-3">{n.message}</p>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-black text-indigo-500 uppercase bg-indigo-50 px-2 py-1 rounded-lg">
                       <Mail size={10} /> Email Sent
                    </div>
                    <button 
                      onClick={() => setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif))}
                      className="text-indigo-600 text-[10px] font-black hover:underline uppercase flex items-center gap-1"
                    >
                      Dismiss <ChevronRight size={10}/>
                    </button>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Notification Center Modal */}
      {isNotificationCenterOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsNotificationCenterOpen(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in duration-300">
             <div className="bg-slate-50 p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                   <h2 className="text-2xl font-black text-slate-800">Inbox</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alerts & Reminders</p>
                </div>
                <button onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))} className="text-xs font-black text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">Mark all as read</button>
             </div>
             <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 bg-white">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center text-slate-300">
                    <Bell size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-black uppercase tracking-widest">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-6 rounded-3xl border transition-all ${n.read ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-indigo-100 shadow-sm'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${n.read ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white'}`}>
                          {n.type === 'reminder' ? <Clock size={20}/> : <Mail size={20}/>}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-800 mb-1">{n.title}</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">{n.message}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-wider">{new Date(n.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
             </div>
             <button onClick={() => setIsNotificationCenterOpen(false)} className="w-full p-6 bg-slate-900 text-white font-black text-center text-sm uppercase tracking-[0.3em] hover:bg-slate-800">Close Center</button>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingSession(null)}></div>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 p-10 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><Edit2 className="text-indigo-600"/> Edit Session</h2>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-2">Topic</label>
                <input value={editingSession.skill} onChange={e => setEditingSession({...editingSession, skill: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-2">Reschedule</label>
                <input type="datetime-local" value={editingSession.scheduledTime || ''} onChange={e => setEditingSession({...editingSession, scheduledTime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" />
              </div>
              <button onClick={() => { 
                setSessions(prev => prev.map(s => s.id === editingSession.id ? editingSession : s)); 
                // Allow re-notification for the new time
                setNotifiedIds(prev => {
                  const next = new Set(prev);
                  next.delete(editingSession.id);
                  return next;
                });
                setEditingSession(null); 
              }} className="w-full py-4 rounded-2xl font-black bg-indigo-600 text-white shadow-xl shadow-indigo-100">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* InstantBurst Modal */}
      {activeInstantSession && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white md:m-10 md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
           {callState !== 'idle' && (
             <div className="absolute inset-0 z-[210] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center text-white p-8">
                {callState === 'prompting' ? (
                   <div className="max-w-md w-full text-center space-y-6">
                      <div className="bg-indigo-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl"><Phone size={32} /></div>
                      <h2 className="text-3xl font-black">Direct Connection</h2>
                      <input type="tel" value={callPhoneNumber} onChange={(e) => setCallPhoneNumber(e.target.value)} placeholder="+1 234 567 890" className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 text-xl font-bold text-center outline-none focus:ring-4 focus:ring-indigo-500/50" autoFocus />
                      <div className="flex gap-4">
                        <button onClick={() => setCallState('idle')} className="flex-1 py-4 rounded-2xl font-bold bg-white/5">Cancel</button>
                        <button onClick={() => {
                          setCallState('dialing');
                          setTimeout(() => setCallState('ongoing'), 2000);
                          setTimeout(() => setCallState('ended'), 6000);
                          setTimeout(() => { setCallState('idle'); setActiveInstantSession(null); }, 8000);
                        }} className="flex-1 py-4 rounded-2xl font-bold bg-indigo-600">Call Now</button>
                      </div>
                   </div>
                ) : (
                  <div className="text-center space-y-10">
                      <div className="relative">
                         <img src={activeInstantSession.user.avatar} className="w-32 h-32 rounded-full mx-auto border-4 border-white/20 shadow-2xl" />
                         <div className="absolute inset-0 rounded-full border-4 border-indigo-500 animate-ping opacity-20"></div>
                      </div>
                      <h3 className="text-4xl font-black">{activeInstantSession.user.name}</h3>
                      <p className="text-xl font-bold text-indigo-400 uppercase tracking-widest">{callState.replace('-', ' ')}...</p>
                      <button onClick={() => setCallState('idle')} className="bg-red-500 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl"><PhoneOff size={32} /></button>
                  </div>
                )}
             </div>
           )}
           <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <button onClick={() => setActiveInstantSession(null)} className="p-2 hover:bg-white/10 rounded-xl"><X size={24}/></button>
                 <div className="flex items-center gap-3">
                    <img src={activeInstantSession.user.avatar} className="w-10 h-10 rounded-full" />
                    <h3 className="font-black">{activeInstantSession.user.name}</h3>
                 </div>
              </div>
              <button onClick={() => setCallState('prompting')} className="bg-indigo-600 px-6 py-2.5 rounded-xl font-black text-sm"><Phone size={18} fill="currentColor" className="inline mr-2"/> Call Now</button>
           </div>
           <div className="flex-1 overflow-y-auto p-8 bg-slate-50 space-y-4">
              {activeInstantSession.messages.map((m: any, i: number) => (
                <div key={i} className={`flex ${m.sender === currentUser.name ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm border ${m.sender === currentUser.name ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border-slate-200'}`}>
                      <p className="text-sm font-medium">{m.text}</p>
                   </div>
                </div>
              ))}
           </div>
           <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
              <input placeholder="Ask about the doubt..." className="flex-1 bg-slate-50 rounded-xl px-6 py-4 outline-none font-medium" onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (!val) return;
                      setActiveInstantSession({ ...activeInstantSession, messages: [...activeInstantSession.messages, { sender: currentUser.name, text: val, time: 'Now' }] });
                      (e.target as HTMLInputElement).value = '';
                  }
              }} />
           </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-4 flex flex-col fixed h-full z-10 hidden md:flex">
        <div className="flex items-center space-x-2 px-2 mb-10">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">SF</div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">SkillFlow</span>
        </div>
        <div className="flex-1 space-y-2">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          <NavItem active={activeTab === 'matchmaker'} onClick={() => setActiveTab('matchmaker')} icon={<Users size={20}/>} label="AI Matchmaker" />
          <NavItem active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={<BookOpen size={20}/>} label="Sessions" />
          <NavItem active={activeTab === 'meetings'} onClick={() => setActiveTab('meetings')} icon={<Video size={20}/>} label="Combined Study" />
          <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20}/>} label="Session History" />
          <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={20}/>} label="My Profile" />
        </div>
        <div className="pt-8 border-t border-slate-100">
           <button 
             onClick={() => setIsNotificationCenterOpen(true)}
             className={`w-full flex items-center justify-between px-6 py-4 rounded-3xl transition-all ${isNotificationCenterOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
           >
              <div className="flex items-center gap-4">
                <Bell size={20}/>
                <span className="text-sm font-bold">Notifications</span>
              </div>
              {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unreadCount}</span>}
           </button>
        </div>
      </nav>

      <main className="flex-1 md:ml-64 p-6 md:p-10 mb-20 md:mb-0">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-8">
          <div>
             <h1 className="text-3xl font-black text-slate-800 tracking-tight">{currentUser.name}</h1>
             <p className="text-slate-500 font-medium">Platform Rep: {currentUser.reputation}% • {currentUser.streak} Day Streak 🔥</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsNotificationCenterOpen(true)} className="relative bg-white text-slate-400 p-3 rounded-2xl border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
               <Bell size={24}/>
               {unreadCount > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
            </button>
            <button onClick={() => setIsClassModalOpen(true)} className="bg-amber-500 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-amber-600 shadow-xl shadow-amber-200/50"><Calendar size={20}/> Schedule Class</button>
            <button onClick={() => setIsMeetingModalOpen(true)} className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-800 shadow-xl shadow-slate-200"><Video size={20}/> Start Study</button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Impact" value={`${currentUser.impactScore}`} icon={<TrendingUp className="text-white"/>} subLabel="Knowledge Points" bgColor="bg-indigo-600 text-white shadow-indigo-100" />
                <StatCard label="Streak" value={`${currentUser.streak}`} icon={<Flame className="text-orange-500"/>} subLabel="Consistency" />
                <StatCard label="Credits" value={`${currentUser.credits}`} icon={<Zap className="text-amber-500"/>} subLabel="Trade Power" />
              </div>

              {/* Skill Summary Section - Now Editable */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Skill Inventory</h3>
                    {!isEditingDashSkills ? (
                      <button 
                        onClick={() => {
                          setDashSkillsForm({ skillsOffered: [...currentUser.skillsOffered], skillsWanted: [...currentUser.skillsWanted] });
                          setIsEditingDashSkills(true);
                        }}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                      >
                        <Edit2 size={20}/>
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingDashSkills(false)} className="px-4 py-2 text-xs font-black text-slate-400 bg-slate-50 rounded-xl">Cancel</button>
                        <button onClick={handleSaveDashSkills} className="px-4 py-2 text-xs font-black text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">Save</button>
                      </div>
                    )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {/* Offered Skills Column */}
                   <div className="space-y-4">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Award size={16} className="text-indigo-600"/> Expertise
                      </h4>
                      {isEditingDashSkills && (
                        <div className="flex gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <input 
                            placeholder="Add..." 
                            className="flex-1 bg-white px-3 py-1.5 rounded-xl text-xs font-bold outline-none"
                            value={newOfferedSkill.name}
                            onChange={e => setNewOfferedSkill(prev => ({ ...prev, name: e.target.value }))}
                          />
                          <select 
                            className="bg-white px-2 py-1.5 rounded-xl font-bold text-[10px] outline-none"
                            value={newOfferedSkill.prof}
                            onChange={e => setNewOfferedSkill(prev => ({ ...prev, prof: e.target.value as Proficiency }))}
                          >
                            <option value={Proficiency.BEGINNER}>Beg.</option>
                            <option value={Proficiency.INTERMEDIATE}>Int.</option>
                            <option value={Proficiency.EXPERT}>Exp.</option>
                          </select>
                          <button onClick={() => addSkill('offered', 'dash')} className="bg-indigo-600 text-white p-1.5 rounded-xl"><Plus size={16}/></button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                         {(isEditingDashSkills ? dashSkillsForm.skillsOffered : currentUser.skillsOffered).map((s, i) => (
                           <div key={i} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black border border-indigo-100 group/item">
                             {s.name} <span className="opacity-40 text-[9px]">({s.proficiency.substring(0,3)})</span>
                             {isEditingDashSkills && (
                               <button onClick={() => removeSkill('offered', i, 'dash')} className="text-indigo-300 hover:text-red-500 transition-colors"><X size={12}/></button>
                             )}
                           </div>
                         ))}
                      </div>
                   </div>

                   {/* Wanted Skills Column */}
                   <div className="space-y-4">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <BookOpenCheck size={16} className="text-violet-600"/> Goals
                      </h4>
                      {isEditingDashSkills && (
                        <div className="flex gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <input 
                            placeholder="Add..." 
                            className="flex-1 bg-white px-3 py-1.5 rounded-xl text-xs font-bold outline-none"
                            value={newWantedSkill.name}
                            onChange={e => setNewWantedSkill(prev => ({ ...prev, name: e.target.value }))}
                          />
                          <select 
                            className="bg-white px-2 py-1.5 rounded-xl font-bold text-[10px] outline-none"
                            value={newWantedSkill.prof}
                            onChange={e => setNewWantedSkill(prev => ({ ...prev, prof: e.target.value as Proficiency }))}
                          >
                            <option value={Proficiency.BEGINNER}>Beg.</option>
                            <option value={Proficiency.INTERMEDIATE}>Int.</option>
                            <option value={Proficiency.EXPERT}>Exp.</option>
                          </select>
                          <button onClick={() => addSkill('wanted', 'dash')} className="bg-violet-600 text-white p-1.5 rounded-xl"><Plus size={16}/></button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                         {(isEditingDashSkills ? dashSkillsForm.skillsWanted : currentUser.skillsWanted).map((s, i) => (
                           <div key={i} className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 rounded-xl text-xs font-black border border-violet-100">
                             {s.name} <span className="opacity-40 text-[9px]">({s.proficiency.substring(0,3)})</span>
                             {isEditingDashSkills && (
                               <button onClick={() => removeSkill('wanted', i, 'dash')} className="text-violet-300 hover:text-red-500 transition-colors"><X size={12}/></button>
                             )}
                           </div>
                         ))}
                      </div>
                   </div>
                 </div>
              </div>

              <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><Zap className="text-amber-500" fill="currentColor"/> Active Skill Bursts</h3>
                    <div className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-3 py-1 rounded-full">LIVE NOW</div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {bursts.map(b => (
                     <div key={b.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between hover:border-indigo-300 transition-all group shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                           <img src={b.user.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                           <div>
                              <p className="text-xs font-black text-slate-800">{b.user.name}</p>
                              <p className="text-[10px] text-indigo-500 font-black uppercase">{b.skill}</p>
                           </div>
                        </div>
                        <p className="text-sm text-slate-600 font-medium italic mb-6">"{b.topic}"</p>
                        <button onClick={() => setActiveInstantSession({...b, messages: [{ sender: b.user.name, text: `I can help with ${b.skill}! What's the issue?`, time: 'Now' }]})} className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">Connect Now</button>
                     </div>
                   ))}
                 </div>
              </section>

              <SessionManager sessions={sessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled').slice(0, 3)} onComplete={(id) => setSessions(prev => prev.map(s => s.id === id ? {...s, status: 'completed'} : s))} onDelete={(id) => setSessions(prev => prev.filter(s => s.id !== id))} onEdit={setEditingSession} onSendMessage={handleSendSessionMessage} />
            </div>
            
            <div className="space-y-8">
               <SkillIdentityCard user={currentUser} />
               <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                  <h4 className="font-black text-indigo-400 uppercase tracking-widest text-xs mb-4">Storage Insight</h4>
                  <p className="text-sm font-medium leading-relaxed relative z-10">Data is stored locally in your browser's <span className="text-indigo-300 font-black">localStorage</span>. This ensures your sessions and identity persist without a complex backend for demo purposes.</p>
                  <Database className="absolute bottom-[-20%] right-[-10%] opacity-10" size={160}/>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'matchmaker' && (
           <div className="space-y-8">
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-top-4 duration-500">
                 <h2 className="text-3xl font-black text-slate-800 mb-2">AI Smart Match Engine</h2>
                 <p className="text-slate-500 mb-8 max-w-2xl text-lg font-medium leading-relaxed">Enter exactly what you want to learn. Our Gemini-3-Flash AI will scan the network for the best peer compatibility based on your learning style.</p>
                 <div className="flex flex-col md:flex-row gap-4">
                    <textarea value={deepQuery} onChange={e => setDeepQuery(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-[1.5rem] p-6 text-base font-medium outline-none focus:ring-4 focus:ring-indigo-100 min-h-[120px] transition-all" placeholder="E.g. I need someone to help me debug my React useEffect hooks. I prefer project-based learning and am free on weekends." />
                    <button onClick={handleFindMatches} disabled={isLoading || !deepQuery.trim()} className="bg-indigo-600 text-white px-10 rounded-[1.5rem] font-black hover:bg-indigo-700 disabled:opacity-50 flex flex-col items-center justify-center gap-2 transition-all">
                       {isLoading ? <Cpu className="animate-spin" /> : <BrainCircuit size={32} />}
                       {isLoading ? 'Analyzing...' : 'Find Match'}
                    </button>
                 </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {matches.length > 0 ? matches.map((m, idx) => (
                    <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all animate-in fade-in duration-500">
                       <div className="flex items-center gap-6 mb-8">
                          <img src={m.user.avatar} className="w-20 h-20 rounded-[1.5rem] shadow-xl" />
                          <div>
                             <h3 className="text-2xl font-black text-slate-800">{m.user.name}</h3>
                             <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">{m.matchScore}% Compatibility</span>
                          </div>
                       </div>
                       <p className="bg-slate-50 p-6 rounded-[1.5rem] mb-8 italic text-slate-600 font-medium border border-slate-100">"AI Insight: {m.explanation}"</p>
                       <div className="flex gap-4">
                          <button onClick={() => createSession(m.user, SessionType.CLASS_DOUBT, m.suggestedTopic)} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-transform">Schedule Micro-Session</button>
                       </div>
                    </div>
                 )) : !isLoading && (
                   <div className="col-span-2 text-center py-20 text-slate-300 font-black text-2xl uppercase tracking-widest border-4 border-dashed border-slate-100 rounded-[3rem]">
                      No Search Performed Yet
                   </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'sessions' && (
           <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="flex-1">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">My Sessions</h2>
                    <p className="text-slate-500 font-medium">Coordinate and track your active and pending peer exchanges.</p>
                 </div>
              </div>
              <SessionManager sessions={sessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled')} onComplete={(id) => setSessions(prev => prev.map(s => s.id === id ? {...s, status: 'completed'} : s))} onDelete={(id) => setSessions(prev => prev.filter(s => s.id !== id))} onEdit={setEditingSession} onSendMessage={handleSendSessionMessage} />
           </div>
        )}

        {activeTab === 'history' && (
           <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="flex-1">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Session History</h2>
                    <p className="text-slate-500 font-medium">A look back at your past knowledge exchanges.</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</p>
                       <p className="text-2xl font-black text-slate-800">{sessions.filter(s => s.status === 'completed').length}</p>
                    </div>
                    <CheckCircle2 className="text-green-500" size={32} />
                 </div>
              </div>
              
              <div className="space-y-4">
                {sessions.filter(s => s.status === 'completed' || s.status === 'cancelled').length === 0 ? (
                  <div className="bg-white p-20 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100">
                    <Archive className="mx-auto text-slate-100 mb-6" size={60} />
                    <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Archive is empty</h3>
                  </div>
                ) : (
                  sessions.filter(s => s.status === 'completed' || s.status === 'cancelled').map(session => (
                    <div key={session.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between gap-6 hover:shadow-md transition-shadow">
                       <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-2xl ${session.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                             {session.status === 'completed' ? <CheckCircle2 size={24}/> : <XCircle size={24}/>}
                          </div>
                          <div>
                             <h4 className="text-lg font-black text-slate-800 mb-1">{session.skill}</h4>
                             <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{session.type} • {session.duration}m</p>
                          </div>
                       </div>
                       <div className="text-right flex flex-col items-end gap-2">
                          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${session.status === 'completed' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                             {session.status}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(session.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        )}

        {activeTab === 'meetings' && (
          <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-gradient-to-br from-indigo-700 to-violet-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 max-w-lg">
                <h2 className="text-4xl font-black mb-4 tracking-tighter leading-tight">Combined Study Rooms</h2>
                <p className="text-indigo-100 mb-8 text-lg">Create virtual spaces for live collaboration and screen sharing with friends.</p>
                <button onClick={() => setIsMeetingModalOpen(true)} className="bg-white text-indigo-700 px-10 py-5 rounded-[1.5rem] font-black text-lg flex items-center gap-3 hover:scale-105 transition-all shadow-2xl">
                  <Plus size={28} /> Create Group Room
                </button>
              </div>
              <Rocket className="absolute right-[-5%] bottom-[-10%] opacity-10" size={300}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {meetings.map(m => (
                <div key={m.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg flex flex-col group animate-in zoom-in duration-300">
                  <div className="flex items-center justify-between mb-8">
                    <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600"><Video size={30}/></div>
                    <button onClick={() => setMeetings(prev => prev.filter(meet => meet.id !== m.id))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-4">{m.topic}</h3>
                  <button onClick={() => window.open(m.link)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg">Join Collaboration Room</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4 duration-500">
            <div className="lg:col-span-1">
              <SkillIdentityCard user={currentUser} />
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black text-slate-800">Your Platform Identity</h3>
                  {!isEditingProfile ? (
                    <button 
                      onClick={() => {
                        setProfileForm({ 
                          name: currentUser.name, 
                          bio: currentUser.bio, 
                          avatar: currentUser.avatar,
                          skillsOffered: [...currentUser.skillsOffered],
                          skillsWanted: [...currentUser.skillsWanted]
                        });
                        setIsEditingProfile(true);
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm hover:bg-indigo-100 transition-all"
                    >
                      <Edit2 size={16}/> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="px-6 py-2 bg-slate-50 text-slate-500 rounded-xl font-black text-sm hover:bg-slate-100 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                      >
                        <Save size={16}/> Save Changes
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-12">
                   {/* Personal Details */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-4 tracking-widest">Public Avatar</label>
                        <div className="relative group w-32 h-32">
                          <img src={isEditingProfile ? profileForm.avatar : currentUser.avatar} className="w-32 h-32 rounded-[2.5rem] border-4 border-slate-50 shadow-xl object-cover" />
                          {isEditingProfile && (
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute inset-0 bg-slate-900/60 rounded-[2.5rem] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Camera size={24} className="mb-2"/>
                              <span className="text-[10px] font-black uppercase">Upload</span>
                            </button>
                          )}
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Full Name</label>
                        {isEditingProfile ? (
                          <input 
                            value={profileForm.name}
                            onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full text-2xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                          />
                        ) : (
                          <p className="text-2xl font-black text-slate-800">{currentUser.name}</p>
                        )}
                      </div>
                   </div>

                   <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Bio & Learning Philosophy</label>
                      {isEditingProfile ? (
                        <textarea 
                          value={profileForm.bio}
                          onChange={e => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                          className="w-full text-slate-600 font-medium leading-relaxed bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-50 transition-all min-h-[120px]"
                        />
                      ) : (
                        <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner">
                          {currentUser.bio}
                        </p>
                      )}
                   </div>

                   {/* Skill Management Section */}
                   <div className="space-y-8 pt-8 border-t border-slate-100">
                      <div>
                         <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xl font-black text-slate-800 flex items-center gap-3"><PlusCircle className="text-indigo-600"/> Subjects I Know (Expertise)</h4>
                         </div>
                         
                         {isEditingProfile && (
                           <div className="flex gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <input 
                                placeholder="Add skill (e.g. Python)..." 
                                className="flex-1 bg-white px-4 py-2 rounded-xl outline-none font-bold text-sm"
                                value={newOfferedSkill.name}
                                onChange={e => setNewOfferedSkill(prev => ({ ...prev, name: e.target.value }))}
                              />
                              <select 
                                className="bg-white px-4 py-2 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-200"
                                value={newOfferedSkill.prof}
                                onChange={e => setNewOfferedSkill(prev => ({ ...prev, prof: e.target.value as Proficiency }))}
                              >
                                 <option value={Proficiency.BEGINNER}>Beginner</option>
                                 <option value={Proficiency.INTERMEDIATE}>Intermediate</option>
                                 <option value={Proficiency.EXPERT}>Expert</option>
                              </select>
                              <button onClick={() => addSkill('offered', 'profile')} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors"><Plus size={20}/></button>
                           </div>
                         )}

                         <div className="flex flex-wrap gap-3">
                            {(isEditingProfile ? profileForm.skillsOffered : currentUser.skillsOffered).map((s, i) => (
                              <div key={i} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-black text-xs border border-indigo-200">
                                {s.name} <span className="opacity-50 text-[9px]">({s.proficiency})</span>
                                {isEditingProfile && (
                                  <button onClick={() => removeSkill('offered', i, 'profile')} className="text-indigo-300 hover:text-red-500 transition-colors"><X size={14}/></button>
                                )}
                              </div>
                            ))}
                         </div>
                      </div>

                      <div>
                         <h4 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6"><BrainCircuit className="text-violet-600"/> Subjects I Want to Know</h4>
                         
                         {isEditingProfile && (
                           <div className="flex gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <input 
                                placeholder="Add goal (e.g. React)..." 
                                className="flex-1 bg-white px-4 py-2 rounded-xl outline-none font-bold text-sm"
                                value={newWantedSkill.name}
                                onChange={e => setNewWantedSkill(prev => ({ ...prev, name: e.target.value }))}
                              />
                              <select 
                                className="bg-white px-4 py-2 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-violet-200"
                                value={newWantedSkill.prof}
                                onChange={e => setNewWantedSkill(prev => ({ ...prev, prof: e.target.value as Proficiency }))}
                              >
                                 <option value={Proficiency.BEGINNER}>Beginner</option>
                                 <option value={Proficiency.INTERMEDIATE}>Intermediate</option>
                                 <option value={Proficiency.EXPERT}>Expert</option>
                              </select>
                              <button onClick={() => addSkill('wanted', 'profile')} className="bg-violet-600 text-white p-2 rounded-xl hover:bg-violet-700 transition-colors"><Plus size={20}/></button>
                           </div>
                         )}

                         <div className="flex flex-wrap gap-3">
                            {(isEditingProfile ? profileForm.skillsWanted : currentUser.skillsWanted).map((s, i) => (
                              <div key={i} className="flex items-center gap-2 bg-violet-50 text-violet-700 px-4 py-2 rounded-xl font-black text-xs border border-violet-200">
                                {s.name} <span className="opacity-50 text-[9px]">({s.proficiency})</span>
                                {isEditingProfile && (
                                  <button onClick={() => removeSkill('wanted', i, 'profile')} className="text-violet-300 hover:text-red-500 transition-colors"><X size={14}/></button>
                                )}
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Common Modals */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsClassModalOpen(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 p-10 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Schedule Peer Class</h2>
            <div className="space-y-6">
               <input value={meetingTopic} onChange={e => setMeetingTopic(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Topic name..." />
               <input value={classTime} onChange={e => setClassTime(e.target.value)} type="datetime-local" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
               <button onClick={() => { 
                 createSession(MOCK_USERS[Math.floor(Math.random()*MOCK_USERS.length)], SessionType.CLASS_DOUBT, meetingTopic, classTime);
                 setIsClassModalOpen(false);
                 setMeetingTopic('');
               }} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Schedule Micro-Class</button>
            </div>
          </div>
        </div>
      )}

      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMeetingModalOpen(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 p-10 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Create Study Room</h2>
            <input value={meetingTopic} onChange={e => setMeetingTopic(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6 font-bold" placeholder="Room topic (e.g. Finals Prep)..." />
            <button onClick={createMeeting} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Open Collaboration Room</button>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({active, onClick, icon, label}) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-6 py-4 rounded-3xl transition-all ${active ? 'bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
    {icon}
    <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const StatCard: React.FC<{label: string, value: string, icon: React.ReactNode, subLabel: string, bgColor?: string}> = ({label, value, icon, subLabel, bgColor = "bg-white"}) => (
  <div className={`${bgColor} p-8 rounded-[2.5rem] border border-slate-100 shadow-lg flex flex-col gap-6 transition-transform hover:translate-y-[-4px]`}>
    <div className="flex items-center justify-between">
      <div className={`p-5 rounded-[1.25rem] ${bgColor === 'bg-white' ? 'bg-slate-50' : 'bg-white/20'}`}>{icon}</div>
      <div className="text-right">
        <p className={`text-[11px] font-black uppercase ${bgColor === 'bg-white' ? 'text-slate-400' : 'text-indigo-100'}`}>{label}</p>
        <p className={`text-4xl font-black tracking-tighter mt-1 ${bgColor === 'bg-white' ? 'text-slate-800' : 'text-white'}`}>{value}</p>
      </div>
    </div>
    <div className="pt-4 border-t border-slate-100/10">
       <p className={`text-[10px] font-black uppercase tracking-widest ${bgColor === 'bg-white' ? 'text-slate-400' : 'text-indigo-200'}`}>{subLabel}</p>
    </div>
  </div>
);

export default App;
