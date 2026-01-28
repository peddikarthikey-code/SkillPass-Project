
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { User, Proficiency } from '../types.ts';

interface SkillIdentityCardProps {
  user: User;
}

const SkillIdentityCard: React.FC<SkillIdentityCardProps> = ({ user }) => {
  // Map proficiency to numbers for charting
  const profMap: Record<Proficiency, number> = {
    [Proficiency.BEGINNER]: 30,
    [Proficiency.INTERMEDIATE]: 65,
    [Proficiency.EXPERT]: 100
  };

  const data = [
    ...user.skillsOffered.map(s => ({
      subject: s.name,
      A: profMap[s.proficiency],
      fullMark: 100,
      type: 'Offered'
    })),
    ...user.skillsWanted.map(s => ({
      subject: s.name,
      A: profMap[s.proficiency],
      fullMark: 100,
      type: 'Wanted'
    }))
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 transition-all hover:shadow-2xl">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white relative">
        <div className="flex items-center space-x-4">
          <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full border-4 border-white/20" />
          <div>
            <h3 className="text-xl font-bold">{user.name}</h3>
            <p className="text-indigo-100 text-sm">{user.availability}</p>
          </div>
        </div>
        <div className="absolute top-6 right-6 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
          {user.credits} Credits
        </div>
      </div>
      
      <div className="p-6">
        <div className="h-64 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
              <Radar
                name="Proficiency"
                dataKey="A"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Offered</h4>
            <div className="flex flex-wrap gap-2">
              {user.skillsOffered.map(s => (
                <span key={s.name} className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Learning</h4>
            <div className="flex flex-wrap gap-2">
              {user.skillsWanted.map(s => (
                <span key={s.name} className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillIdentityCard;
