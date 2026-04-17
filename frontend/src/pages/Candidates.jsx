import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { candidates as cApi, applications as aApi } from '../utils/api';
import { Avatar, Btn, Field, Input, Textarea, Select, Modal, Spinner, EmptyState, ScoreBadge, StageBadge } from '../components/ui';

export function CandidatesPage() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  const load = (p = 1, q = search) => {
    setLoading(true);
    cApi.list({ page: p, per_page: 20, q }).then(r => {
      setList(r.data.candidates); setTotal(r.data.total); setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault(); setPage(1); load(1, search);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Candidates</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        <Btn onClick={() => setShowAdd(true)}>+ Add candidate</Btn>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="max-w-sm" />
        <Btn type="submit" variant="secondary">Search</Btn>
      </form>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> :
        list.length === 0 ? (
          <EmptyState icon="👤" title="No candidates yet"
            description="Add candidates manually or they will appear when they apply to your jobs."
            action={<Btn onClick={() => setShowAdd(true)}>Add candidate</Btn>} />
        ) : (
          <>
            <div className="space-y-1.5">
              {list.map(c => (
                <Link key={c.id} to={`/candidates/${c.id}`}
                  className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors">
                  <Avatar name={c.full_name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{c.full_name}</div>
                    <div className="text-xs text-gray-400">{c.email} · {c.years_experience} yrs exp · {c.source}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.parsed_skills?.slice(0,3).map(s => (
                      <span key={s} className="hidden lg:inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{s}</span>
                    ))}
                    <span className="text-xs text-gray-400">{c.application_count} app{c.application_count !== 1 ? 's' : ''}</span>
                  </div>
                </Link>
              ))}
            </div>
            {total > 20 && (
              <div className="flex justify-center gap-2 mt-4">
                <Btn variant="secondary" size="sm" disabled={page === 1} onClick={() => { setPage(p=>p-1); load(page-1); }}>Previous</Btn>
                <span className="text-sm text-gray-500 px-2 py-1">{page} / {Math.ceil(total/20)}</span>
                <Btn variant="secondary" size="sm" disabled={page >= Math.ceil(total/20)} onClick={() => { setPage(p=>p+1); load(page+1); }}>Next</Btn>
              </div>
            )}
          </>
        )
      }
      {showAdd && <AddCandidateModal onClose={() => setShowAdd(false)} onCreated={(c) => { setShowAdd(false); navigate(`/candidates/${c.id}`); }} />}
    </div>
  );
}

function AddCandidateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', source:'direct', years_experience:'', resume_text:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const r = await cApi.create({ ...form, years_experience: parseFloat(form.years_experience) || 0 });
      onCreated(r.data);
    } catch(err) {
      setError(err.response?.data?.error || 'Failed to create candidate');
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add candidate"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" form="add-cand" loading={saving}>Add candidate</Btn></>}>
      <form id="add-cand" onSubmit={submit}>
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required><Input value={form.first_name} onChange={set('first_name')} /></Field>
          <Field label="Last name" required><Input value={form.last_name} onChange={set('last_name')} /></Field>
        </div>
        <Field label="Email" required><Input type="email" value={form.email} onChange={set('email')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Years experience"><Input type="number" value={form.years_experience} onChange={set('years_experience')} min="0" step="0.5" /></Field>
        </div>
        <Field label="Source">
          <Select value={form.source} onChange={set('source')}>
            {['direct','linkedin','indeed','referral','glassdoor','other'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Resume / CV text">
          <Textarea value={form.resume_text} onChange={set('resume_text')} rows={5}
            placeholder="Paste resume text here — skills will be auto-extracted for AI scoring" />
        </Field>
      </form>
    </Modal>
  );
}

export function CandidateDetailPage() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [apps, setApps] = useState([]);

  useEffect(() => {
    Promise.all([cApi.get(id), cApi.applications(id)]).then(([c, a]) => {
      setCandidate(c.data); setApps(a.data);
    });
  }, [id]);

  if (!candidate) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/candidates" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">← Candidates</Link>

      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <Avatar name={candidate.full_name} size="lg" />
          <div>
            <h1 className="text-lg font-semibold">{candidate.full_name}</h1>
            <div className="text-sm text-gray-500">{candidate.email} {candidate.phone && `· ${candidate.phone}`}</div>
            <div className="text-xs text-gray-400 mt-0.5">{candidate.years_experience} yrs experience · Source: {candidate.source}</div>
          </div>
        </div>

        {candidate.parsed_skills?.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Detected skills</div>
            <div className="flex flex-wrap gap-1.5">
              {candidate.parsed_skills.map(s => (
                <span key={s} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md">{s}</span>
              ))}
            </div>
          </div>
        )}

        {candidate.resume_text && (
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Resume</div>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {candidate.resume_text}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="text-sm font-semibold mb-4">Applications ({apps.length})</h2>
        {apps.length === 0 ? (
          <p className="text-sm text-gray-400">No applications yet.</p>
        ) : (
          <div className="space-y-2">
            {apps.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium">{a.job?.title}</div>
                  <div className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ScoreBadge score={a.ai_score} />
                  <StageBadge stage={a.stage} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
