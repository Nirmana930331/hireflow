import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analytics, jobs } from '../utils/api';
import { StatCard, StageBadge, ScoreBadge, Spinner } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STAGE_COLORS = {
  applied: '#e5e7eb', ai_screening: '#bfdbfe', recruiter_review: '#ddd6fe',
  phone_screen: '#99f6e4', interviewing: '#fef08a', hiring_decision: '#fed7aa',
  offer_extended: '#fdba74', offer_accepted: '#86efac', hired: '#4ade80',
  rejected: '#fca5a5', withdrawn: '#d1d5db',
};

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analytics.overview(30),
      analytics.funnel(),
      jobs.list({ status: 'open' }),
    ]).then(([ov, fn, jb]) => {
      setOverview(ov.data);
      setFunnel(fn.data.filter(s => s.count > 0));
      setRecentJobs(jb.data.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Last 30 days</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open jobs" value={overview?.open_jobs ?? '—'} sub="actively hiring" />
        <StatCard label="New applications" value={overview?.new_applications ?? '—'} sub="this month" />
        <StatCard label="Interviews" value={overview?.interviews_this_period ?? '—'} sub="this month" />
        <StatCard
          label="Pending scorecards"
          value={overview?.pending_scorecards ?? '—'}
          sub="need attention"
          valueClass={overview?.pending_scorecards > 0 ? 'text-amber-600' : ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Pipeline funnel</h2>
          {funnel.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnel} layout="vertical" margin={{ left: 100, right: 30 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }}
                  tickFormatter={s => s.replace(/_/g, ' ')} width={100} />
                <Tooltip formatter={(v) => [v, 'candidates']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnel.map((entry, i) => (
                    <Cell key={i} fill={STAGE_COLORS[entry.stage] || '#e5e7eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-400 text-center py-8">No pipeline data yet</div>
          )}
        </div>

        {/* Open Jobs */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Open jobs</h2>
            <Link to="/jobs" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8">No open jobs</div>
          ) : (
            <div className="space-y-2">
              {recentJobs.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{job.title}</div>
                    <div className="text-xs text-gray-500">{job.department} · {job.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{job.application_count}</div>
                    <div className="text-xs text-gray-400">applicants</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: '/jobs/new',       label: 'Post a job',          icon: '➕', color: 'bg-blue-50 text-blue-700' },
          { to: '/candidates/new', label: 'Add candidate',       icon: '👤', color: 'bg-purple-50 text-purple-700' },
          { to: '/interviews',     label: 'View interviews',     icon: '📅', color: 'bg-teal-50 text-teal-700' },
          { to: '/analytics',      label: 'Analytics',           icon: '📊', color: 'bg-amber-50 text-amber-700' },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className={`flex items-center gap-3 p-4 rounded-xl ${item.color} hover:opacity-80 transition-opacity`}>
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
