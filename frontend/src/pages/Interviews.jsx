import { useEffect, useState } from 'react';
import { interviews as iApi, auth as authApi } from '../utils/api';
import { Avatar, Btn, Badge, Field, Input, Select, Modal, Spinner, EmptyState } from '../components/ui';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

const TYPE_COLOR = { phone:'teal', technical:'blue', panel:'purple', final:'orange', debrief:'gray' };
const REC_COLOR  = { strong_yes:'green', yes:'teal', no:'red', strong_no:'red' };
const REC_LABEL  = { strong_yes:'Strong yes', yes:'Yes', no:'No', strong_no:'Strong no' };

function dateLabel(dt) {
  const d = new Date(dt);
  if (isToday(d)) return `Today ${format(d,'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow ${format(d,'h:mm a')}`;
  return format(d, 'MMM d · h:mm a');
}

export default function InterviewsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [scorecardModal, setScorecardModal] = useState(null);
  const [tab, setTab] = useState('upcoming');

  const load = () => iApi.list().then(r => { setList(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const upcoming  = list.filter(i => !isPast(new Date(i.scheduled_at)) || i.status === 'scheduled');
  const past      = list.filter(i => isPast(new Date(i.scheduled_at)) && i.status !== 'scheduled');
  const pending   = list.filter(i => isPast(new Date(i.scheduled_at)) && i.scorecard_count === 0);
  const shown     = tab === 'upcoming' ? upcoming : tab === 'past' ? past : pending;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Interviews</h1>
        <div className="flex gap-2 items-center">
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {pending.length} scorecard{pending.length > 1 ? 's' : ''} pending
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-100 pb-0">
        {[['upcoming','Upcoming'], ['past','Past'], ['pending','Pending scorecards']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {l} {k==='pending' && pending.length > 0 && <span className="ml-1 bg-amber-100 text-amber-700 text-xs rounded-full px-1.5">{pending.length}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> :
        shown.length === 0 ? (
          <EmptyState icon="📅" title={`No ${tab} interviews`} description="Interviews will appear here once scheduled." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-2">
              {shown.map(iv => (
                <div key={iv.id}
                  onClick={() => setSelected(iv)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${selected?.id === iv.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <Avatar name={iv.candidate?.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{iv.candidate?.full_name}</span>
                        <Badge color={TYPE_COLOR[iv.interview_type]}>{iv.interview_type}</Badge>
                        {iv.scorecard_count === 0 && isPast(new Date(iv.scheduled_at)) && (
                          <Badge color="yellow">No scorecard</Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {iv.job?.title} · {iv.duration_minutes} min
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-medium text-gray-700">{dateLabel(iv.scheduled_at)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{iv.interviewers.map(u => u.full_name.split(' ')[0]).join(', ')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail */}
            <div className="lg:col-span-2">
              {selected ? (
                <InterviewDetail
                  interview={selected}
                  onScorecard={() => { setScorecardModal(selected); }}
                  onUpdated={(iv) => { setSelected(iv); load(); }}
                />
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-sm text-gray-400">
                  Select an interview to view details
                </div>
              )}
            </div>
          </div>
        )
      }

      {scorecardModal && (
        <ScorecardModal
          interview={scorecardModal}
          onClose={() => setScorecardModal(null)}
          onSubmitted={() => { setScorecardModal(null); load(); setSelected(null); }}
        />
      )}
    </div>
  );
}

function InterviewDetail({ interview: iv, onScorecard, onUpdated }) {
  const [scorecards, setScorecards] = useState([]);
  useEffect(() => {
    if (iv) iApi.scorecards(iv.id).then(r => setScorecards(r.data));
  }, [iv?.id]);

  const canSubmit = isPast(new Date(iv.scheduled_at));

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4 sticky top-4">
      <div className="flex items-center gap-3">
        <Avatar name={iv.candidate?.full_name} size="md" />
        <div>
          <div className="font-semibold">{iv.candidate?.full_name}</div>
          <div className="text-xs text-gray-500">{iv.job?.title}</div>
        </div>
        <Badge color={TYPE_COLOR[iv.interview_type]} className="ml-auto">{iv.interview_type}</Badge>
      </div>

      <div className="text-sm space-y-1.5">
        <div className="flex justify-between"><span className="text-gray-400">When</span><span className="font-medium">{dateLabel(iv.scheduled_at)}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Duration</span><span>{iv.duration_minutes} min</span></div>
        {iv.location && <div className="flex justify-between"><span className="text-gray-400">Location</span><span className="truncate max-w-[180px]">{iv.location}</span></div>}
      </div>

      {iv.interviewers?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Interviewers</div>
          <div className="flex flex-wrap gap-1.5">
            {iv.interviewers.map(u => (
              <span key={u.id} className="flex items-center gap-1.5 bg-gray-50 text-xs px-2 py-1 rounded-lg">
                <Avatar name={u.full_name} size="sm" />
                {u.full_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {scorecards.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Scorecards</div>
          {scorecards.map(sc => (
            <div key={sc.id} className="bg-gray-50 rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">{sc.submitted_by?.full_name}</span>
                {sc.recommendation && (
                  <Badge color={REC_COLOR[sc.recommendation]}>{REC_LABEL[sc.recommendation]}</Badge>
                )}
              </div>
              {Object.entries(sc.scores || {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 w-24 capitalize">{k.replace('_',' ')}</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={`w-3 h-3 rounded-sm ${n <= v ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
              ))}
              {sc.feedback && <p className="text-xs text-gray-500 mt-2 italic">"{sc.feedback}"</p>}
            </div>
          ))}
        </div>
      )}

      {canSubmit && scorecards.length === 0 && (
        <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-lg">
          Interview is complete — scorecard not yet submitted.
        </div>
      )}

      {canSubmit && (
        <Btn className="w-full" onClick={onScorecard}>Submit scorecard</Btn>
      )}
    </div>
  );
}

function ScorecardModal({ interview: iv, onClose, onSubmitted }) {
  const DIMS = ['communication', 'technical', 'culture', 'problem_solving'];
  const [scores, setScores] = useState({ communication:3, technical:3, culture:3, problem_solving:3 });
  const [rec, setRec] = useState('yes');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await iApi.submitScorecard(iv.id, {
        scores, recommendation: rec, feedback,
        overall_rating: Math.round(Object.values(scores).reduce((a,b)=>a+b,0) / DIMS.length),
      });
      onSubmitted();
    } catch(e) { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Scorecard — ${iv.candidate?.full_name}`}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={submit} loading={saving}>Submit scorecard</Btn></>}>
      <p className="text-sm text-gray-500 mb-4">{iv.job?.title} · {iv.interview_type} interview</p>
      {DIMS.map(dim => (
        <Field key={dim} label={dim.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setScores(s => ({...s, [dim]:n}))}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${scores[dim]>=n ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {n}
              </button>
            ))}
          </div>
        </Field>
      ))}
      <Field label="Recommendation">
        <Select value={rec} onChange={e => setRec(e.target.value)}>
          <option value="strong_yes">Strong yes — definitely hire</option>
          <option value="yes">Yes — hire</option>
          <option value="no">No — don't hire</option>
          <option value="strong_no">Strong no — definitely don't hire</option>
        </Select>
      </Field>
      <Field label="Feedback notes">
        <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4}
          placeholder="Share your observations about the candidate's strengths and areas of concern..." />
      </Field>
    </Modal>
  );
}
