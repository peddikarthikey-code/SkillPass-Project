
import React, { useState, useEffect } from 'react';
import { Session, SessionType } from '../types.ts';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  FileText, 
  Zap, 
  Calendar, 
  ChevronDown, 
  Send, 
  MessageCircle, 
  Trash2,
  Edit2,
  X
} from 'lucide-react';

interface SessionManagerProps {
  sessions: Session[];
  onComplete: (id: string) => void;
  onSendMessage?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (session: Session) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ sessions, onComplete, onSendMessage, onDelete, onEdit }) => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [chatInput, setChatInput] = useState<Record<string, string>>({});

  useEffect(() => {
    let timer: any;
    if (activeSessionId && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeSessionId, timeLeft]);

  const startSession = (s: Session) => {
    setActiveSessionId(s.id);
    setTimeLeft(s.duration * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = (id: string) => {
    const text = chatInput[id];
    if (text?.trim() && onSendMessage) {
       onSendMessage(id, text);
       setChatInput(prev => ({ ...prev, [id]: '' }));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-4 tracking-tighter">
          <div className="p-3 bg-indigo-50 rounded-2xl">
            <Clock className="text-indigo-600" size={24} />
          </div>
          Active Sessions
        </h2>
        <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-100 px-4 py-2 rounded-full uppercase shadow-sm">
          {sessions.length} TOTAL
        </span>
      </div>
      
      {sessions.length === 0 && (
        <div className="bg-white p-20 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100">
          <FileText className="mx-auto text-slate-100 mb-6" size={60} />
          <h3 className="text-xl font-black text-slate-300">No sessions scheduled</h3>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {sessions.map(session => {
          const isBurst = session.type === SessionType.SKILL_BURST;
          const isClass = session.type === SessionType.CLASS_DOUBT || session.type === SessionType.CLASS_TEACH;
          const isExpanded = expandedSessionId === session.id;
          const isDeleting = deletingSessionId === session.id;
          const hasMessages = (session.rescheduleRequests?.length || 0) > 0;
          
          return (
            <div 
              key={session.id} 
              className={`bg-white rounded-[2rem] shadow-lg transition-all border ${activeSessionId === session.id ? 'border-indigo-600 ring-[12px] ring-indigo-50/50' : 'border-slate-100'} overflow-hidden relative group`}
            >
              {isDeleting && (
                <div className="absolute inset-0 z-20 bg-red-600/95 backdrop-blur-sm flex items-center justify-center p-8 text-white text-center animate-in fade-in duration-200">
                  <div className="space-y-4">
                    <Trash2 size={40} className="mx-auto mb-2" />
                    <p className="text-xl font-black">Delete this session?</p>
                    <div className="flex gap-4">
                      <button onClick={() => setDeletingSessionId(null)} className="px-6 py-2 bg-white/20 rounded-xl font-bold hover:bg-white/30">Cancel</button>
                      <button onClick={() => { onDelete?.(session.id); setDeletingSessionId(null); }} className="px-6 py-2 bg-white text-red-600 rounded-xl font-bold hover:bg-red-50">Confirm Delete</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-center space-x-6">
                    <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center transition-transform group-hover:scale-105 ${isBurst ? 'bg-amber-100 text-amber-600' : isClass ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isBurst ? <Zap size={32} /> : isClass ? <Calendar size={32} /> : <FileText size={32} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-black text-slate-800 tracking-tight">{session.skill}</h4>
                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black ${
                          session.status === 'completed' ? 'bg-green-50 text-green-600' : 
                          session.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{session.type}</p>
                        {session.scheduledTime && (
                           <div className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">
                              <Calendar size={12} />
                              {session.scheduledTime.replace('T', ' ')}
                           </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase">
                          <Clock size={12} />
                          {session.duration} MINS
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {activeSessionId === session.id ? (
                      <div className="flex items-center gap-6 bg-indigo-600 px-8 py-4 rounded-2xl shadow-xl shadow-indigo-200 animate-pulse">
                        <span className="text-white font-mono font-black text-2xl tabular-nums">{formatTime(timeLeft)}</span>
                        <button 
                          onClick={() => { onComplete(session.id); setActiveSessionId(null); }}
                          className="bg-white text-indigo-600 p-3 rounded-xl hover:scale-110 shadow-lg"
                        >
                          <CheckCircle size={24} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => setDeletingSessionId(session.id)}
                                className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                title="Delete"
                             >
                                <Trash2 size={20} />
                             </button>
                             <button 
                                onClick={() => onEdit?.(session)}
                                className="p-4 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                                title="Reschedule / Edit"
                             >
                                <Edit2 size={20} />
                             </button>
                             <button 
                                onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                className={`p-4 rounded-2xl transition-all border ${isExpanded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-300 hover:text-indigo-600 hover:border-indigo-100'}`}
                                title="Chat"
                             >
                                <MessageCircle size={20} className={hasMessages && !isExpanded ? 'animate-bounce' : ''} />
                             </button>
                        </div>
                        
                        {(session.status === 'active' || session.status === 'pending') && (
                          <button 
                            onClick={() => startSession(session)}
                            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all flex items-center gap-3"
                          >
                            <Play size={16} fill="currentColor" />
                            <span>Go Live</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-8 pb-8 pt-0 animate-in slide-in-from-top-5 duration-300">
                   <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100">
                      <div className="flex items-center justify-between mb-6">
                         <p className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-2">
                           <MessageCircle size={14} /> Coordination
                         </p>
                      </div>
                      <div className="space-y-4 max-h-60 overflow-y-auto mb-6 pr-2">
                        {session.rescheduleRequests && session.rescheduleRequests.map((req, idx) => (
                          <div key={idx} className={`flex flex-col ${req.from === 'You' ? 'items-end' : 'items-start'}`}>
                             <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm border ${req.from === 'You' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-100'}`}>
                                <p className="text-sm font-medium">{req.note}</p>
                             </div>
                             <span className="text-[9px] font-black text-slate-400 mt-1 uppercase">{req.from} • {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3">
                         <input 
                           placeholder="Type message..." 
                           className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                           value={chatInput[session.id] || ''}
                           onChange={(e) => setChatInput(prev => ({ ...prev, [session.id]: e.target.value }))}
                           onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(session.id); }}
                         />
                         <button onClick={() => handleSendMessage(session.id)} className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg">
                           <Send size={18} />
                         </button>
                      </div>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SessionManager;
