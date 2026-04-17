// Offers Page
import { useEffect, useState } from 'react';
import { offers as oApi, applications as aApi } from '../utils/api';
import { Avatar, Btn, Badge, Field, Input, Textarea, Select, Modal, Spinner, EmptyState, StatCard } from '../components/ui';
import { analytics as analyticsApi, jobs as jobsApi } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const STATUS_COLOR = { draft:'gray', sent:'blue', accepted:'green', declined:'red', expired:'gray' };

export function OffersPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => oApi.list().then(r => { setList(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await oApi.update(id, { status });
    load();
    setSelected(o => o?.id === id ? {...o, status} : o);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Offers</h1>
        <Btn onClick={() => setShowCreate(true)}>+ Create offer</Btn>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {['sent','accepted','declined'].map(s => (
          <StatCard key={s} label={s.charAt(0).toUpperCase()+s.slice(1)}
            value={list.filter(o=>o.status===s).length}
            valueClass={s==='accepted'?'text-green-600':s==='declined'?'text-red-500':''}
          />
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> :
        list.length === 0 ? (
          <EmptyState icon="✉" title="No offers yet"
            description="Create an offer once a candidate reaches the offer stage."
            action={<Btn onClick={() => setShowCreate(true)}>Create offer</Btn>} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-2">
              {list.map(offer => (
                <div key={offer.id} onClick={() => setSelected(offer)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${selected?.id===offer.id?'border-blue-400 ring-2 ring-blue-100':'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <Avatar name={offer.candidate?.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{offer.candidate?.full_name}</span>
                        <Badge color={STATUS_COLOR[offer.status]}>{offer.status}</Badge>
                      </div>
                      <div className="text-xs text-gray-500">{offer.job?.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">${offer.salary?.toLocaleString()}</div>
                      {offer.start_date && <div className="text-xs text-gray-400">Start {offer.start_date}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4 sticky top-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.candidate?.full_name} />
                    <div>
                      <div className="font-semibold">{selected.candidate?.full_name}</div>
                      <div className="text-xs text-gray-500">{selected.job?.title}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      ['Salary', `$${selected.salary?.toLocaleString()} ${selected.currency}`],
                      ['Bonus', selected.bonus ? `$${selected.bonus.toLocaleString()}` : '—'],
                      ['Equity', selected.equity || '—'],
                      ['Start date', selected.start_date || '—'],
                      ['Status', <Badge color={STATUS_COLOR[selected.status]}>{selected.status}</Badge>],
                      ['Sent', selected.sent_at ? new Date(selected.sent_at).toLocaleDateString() : '—'],
                    ].map(([k,v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-400">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  {selected.notes && <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">{selected.notes}</p>}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    {selected.status === 'draft' && <Btn size="sm" onClick={() => updateStatus(selected.id,'sent')}>Mark as sent</Btn>}
                    {selected.status === 'sent' && <>
                      <Btn size="sm" variant="primary" onClick={() => updateStatus(selected.id,'accepted')}>Mark accepted</Btn>
                      <Btn size="sm" variant="danger" onClick={() => updateStatus(selected.id,'declined')}>Mark declined</Btn>
                    </>}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-sm text-gray-400">Select an offer to view details</div>
              )}
            </div>
          </div>
        )
      }
      {showCreate && <CreateOfferModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateOfferModal({ onClose, onCreated }) {
  const [appSearch, setAppSearch] = useState('');
  const [apps, setApps] = useState([]);
  const [form, setForm] = useState({ application_id:'', salary:'', currency:'USD', start_date:'', equity:'', bonus:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  useEffect(() => {
    aApi.list({ stage: 'offer_extended', per_page: 50 }).then(r => setApps(r.data.applications));
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await oApi.create({ ...form, salary: parseInt(form.salary)||null, bonus: parseInt(form.bonus)||null });
      onCreated();
    } catch(err) { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title="Create offer"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" form="offer-form" loading={saving}>Create offer</Btn></>}>
      <form id="offer-form" onSubmit={submit}>
        <Field label="Candidate" required>
          <Select value={form.application_id} onChange={set('application_id')}>
            <option value="">Select candidate...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.candidate.full_name} — {a.job.title}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Salary ($)" required><Input type="number" value={form.salary} onChange={set('salary')} /></Field>
          <Field label="Bonus ($)"><Input type="number" value={form.bonus} onChange={set('bonus')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><Input type="date" value={form.start_date} onChange={set('start_date')} /></Field>
          <Field label="Equity"><Input value={form.equity} onChange={set('equity')} placeholder="0.1%" /></Field>
        </div>
        <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} rows={3} /></Field>
      </form>
    </Modal>
  );
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

const FUNNEL_COLORS = ['#bfdbfe','#ddd6fe','#99f6e4','#fef08a','#fed7aa','#fdba74','#86efac','#4ade80','#fca5a5'];
const PIE_COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6'];

export function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [sources, setSources] = useState([]);
  const [tth, setTth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = (d) => {
    setLoading(true);
    Promise.all([
      analyticsApi.overview(d),
      analyticsApi.funnel(),
      analyticsApi.sources(),
      analyticsApi.timeToHire(),
    ]).then(([ov, fn, src, tth]) => {
      setOverview(ov.data); setFunnel(fn.data); setSources(src.data); setTth(tth.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(days); }, [days]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[7,30,90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${days===d?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="New applications" value={overview?.new_applications ?? 0} sub={`last ${days} days`} />
        <StatCard label="Open jobs" value={overview?.open_jobs ?? 0} />
        <StatCard label="Avg AI score" value={overview?.avg_ai_score ?? 0} sub="out of 100" />
        <StatCard label="Time to hire" value={tth?.avg_days ? `${tth.avg_days}d` : '—'} sub={`${tth?.count||0} hires`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Pipeline funnel</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnel.filter(s=>s.count>0)} layout="vertical" margin={{ left:110, right:30 }}>
              <XAxis type="number" tick={{ fontSize:11 }} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize:11 }} tickFormatter={s=>s.replace(/_/g,' ')} width={110} />
              <Tooltip formatter={v=>[v,'candidates']} />
              <Bar dataKey="count" radius={[0,4,4,0]}>
                {funnel.filter(s=>s.count>0).map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Application sources</h2>
          {sources.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={70}>
                    {sources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {sources.map((s, i) => (
                  <div key={s.source} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-600 capitalize">{s.source}</span>
                    <span className="font-semibold ml-auto">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-400 py-8">No data yet</div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-1">Pipeline stage breakdown</h2>
        <p className="text-xs text-gray-400 mb-4">All-time candidates per stage</p>
        <div className="space-y-2">
          {funnel.map((s, i) => (
            <div key={s.stage} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-36 capitalize flex-shrink-0">{s.stage.replace(/_/g,' ')}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width:`${s.pct}%`, background: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }} />
              </div>
              <span className="text-xs text-gray-500 w-10 text-right">{s.count}</span>
              <span className="text-xs text-gray-400 w-10 text-right">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
