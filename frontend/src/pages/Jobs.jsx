import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { jobs as jobsApi } from '../utils/api';
import { Badge, Btn, Field, Input, Textarea, Select, Modal, Spinner, EmptyState, StatCard } from '../components/ui';

const STATUS_COLOR = { draft: 'gray', open: 'green', closed: 'yellow', archived: 'gray' };

export function JobsPage() {
  const [jobList, setJobList] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => jobsApi.list().then(r => { setJobList(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = jobList.filter(j =>
    !filter || j.status === filter || j.department?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{jobList.filter(j=>j.status==='open').length} open positions</p>
        </div>
        <Btn onClick={() => navigate('/jobs/new')}>+ New job</Btn>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'open', 'draft', 'closed', 'archived'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> :
        filtered.length === 0 ? (
          <EmptyState icon="💼" title="No jobs found"
            description="Create your first job posting to start receiving applications."
            action={<Btn onClick={() => navigate('/jobs/new')}>Post a job</Btn>} />
        ) : (
          <div className="space-y-2">
            {filtered.map(job => (
              <div key={job.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 hover:border-gray-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/jobs/${job.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">{job.title}</Link>
                    <Badge color={STATUS_COLOR[job.status]}>{job.status}</Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    {job.department} · {job.location} · {job.employment_type?.replace('_', ' ')}
                    {job.salary_min && ` · $${(job.salary_min/1000).toFixed(0)}k–$${(job.salary_max/1000).toFixed(0)}k`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-semibold text-gray-900">{job.application_count}</div>
                  <div className="text-xs text-gray-400">applicants</div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/pipeline?job_id=${job.id}`}>
                    <Btn variant="secondary" size="sm">Pipeline</Btn>
                  </Link>
                  <Link to={`/jobs/${job.id}/edit`}>
                    <Btn variant="ghost" size="sm">Edit</Btn>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

const EMPTY_JOB = {
  title: '', department: '', location: '', employment_type: 'full_time',
  status: 'draft', description: '', requirements: '',
  salary_min: '', salary_max: '', min_years_experience: 0, required_skills: '',
};

export function JobFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_JOB);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      jobsApi.get(id).then(r => {
        const j = r.data;
        setForm({ ...j, required_skills: (j.required_skills || []).join(', '), salary_min: j.salary_min || '', salary_max: j.salary_max || '' });
        setLoading(false);
      });
    }
  }, [id]);

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const payload = {
        ...form,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        min_years_experience: parseInt(form.min_years_experience) || 0,
        required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (id) { await jobsApi.update(id, payload); navigate(`/jobs/${id}`); }
      else { const r = await jobsApi.create(payload); navigate(`/jobs/${r.data.id}`); }
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-xl font-semibold">{id ? 'Edit job' : 'New job'}</h1>
      </div>

      <form onSubmit={submit} className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

        <Field label="Job title" required>
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Senior Frontend Engineer" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Department">
            <Input value={form.department} onChange={set('department')} placeholder="Engineering" />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={set('location')} placeholder="Remote" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Employment type">
            <Select value={form.employment_type} onChange={set('employment_type')}>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Min salary ($)">
            <Input type="number" value={form.salary_min} onChange={set('salary_min')} placeholder="100000" />
          </Field>
          <Field label="Max salary ($)">
            <Input type="number" value={form.salary_max} onChange={set('salary_max')} placeholder="150000" />
          </Field>
          <Field label="Min years exp.">
            <Input type="number" value={form.min_years_experience} onChange={set('min_years_experience')} min="0" />
          </Field>
        </div>

        <Field label="Required skills (comma-separated)">
          <Input value={form.required_skills} onChange={set('required_skills')} placeholder="React, TypeScript, CSS" />
        </Field>

        <Field label="Job description">
          <Textarea value={form.description} onChange={set('description')} rows={5}
            placeholder="Describe the role, team, and responsibilities..." />
        </Field>

        <Field label="Requirements">
          <Textarea value={form.requirements} onChange={set('requirements')} rows={4}
            placeholder="List qualifications and requirements..." />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Btn>
          <Btn type="submit" loading={saving}>{id ? 'Save changes' : 'Create job'}</Btn>
        </div>
      </form>
    </div>
  );
}

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([jobsApi.get(id), jobsApi.stats(id)]).then(([j, s]) => {
      setJob(j.data); setStats(s.data);
    });
  }, [id]);

  if (!job) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/jobs')} className="text-gray-400 hover:text-gray-600">←</button>
        <Badge color={STATUS_COLOR[job.status]}>{job.status}</Badge>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{job.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{job.department} · {job.location} · {job.employment_type?.replace('_',' ')}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/pipeline?job_id=${job.id}`}><Btn variant="secondary">View pipeline</Btn></Link>
          <Link to={`/jobs/${job.id}/edit`}><Btn variant="secondary">Edit</Btn></Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total applicants" value={stats.total} />
          {Object.entries(stats.by_stage || {}).slice(0,3).map(([s,c]) => (
            <StatCard key={s} label={s.replace(/_/g,' ')} value={c} />
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-5">
        {job.salary_min && (
          <div><h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Compensation</h3>
          <p className="text-sm">${job.salary_min.toLocaleString()} – ${job.salary_max?.toLocaleString()}/year</p></div>
        )}
        {job.required_skills?.length > 0 && (
          <div><h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Required skills</h3>
          <div className="flex flex-wrap gap-1.5">{job.required_skills.map(s => <Badge key={s}>{s}</Badge>)}</div></div>
        )}
        {job.description && (
          <div><h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Description</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p></div>
        )}
        {job.requirements && (
          <div><h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Requirements</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.requirements}</p></div>
        )}
      </div>
    </div>
  );
}
