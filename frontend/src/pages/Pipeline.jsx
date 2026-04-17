import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { applications as appsApi, jobs as jobsApi } from '../utils/api';
import { StageBadge, ScoreBadge, Avatar, Btn, Select, Spinner, Modal, Textarea, EmptyState } from '../components/ui';

const STAGES = [
  { key: 'applied',          label: 'Applied' },
  { key: 'ai_screening',     label: 'AI screen' },
  { key: 'recruiter_review', label: 'Review' },
  { key: 'phone_screen',     label: 'Phone screen' },
  { key: 'interviewing',     label: 'Interviewing' },
  { key: 'hiring_decision',  label: 'Decision' },
  { key: 'offer_extended',   label: 'Offer sent' },
  { key: 'hired',            label: 'Hired' },
];

const NEXT_STAGE = {
  applied: 'ai_screening', ai_screening: 'recruiter_review',
  recruiter_review: 'phone_screen', phone_screen: 'interviewing',
  interviewing: 'hiring_decision', hiring_decision: 'offer_extended',
  offer_extended: 'offer_accepted', offer_accepted: 'hired',
};

export default function PipelinePage() {
  const [searchParams] = useSearchParams();
  const [jobId, setJobId] = useState(searchParams.get('job_id') || '');
  const [jobList, setJobList] = useState([]);
  const [board, setBoard] = useState({});
  const [jobInfo, setJobInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    jobsApi.list({ status: 'open' }).then(r => {
      setJobList(r.data);
      if (!jobId && r.data.length > 0) setJobId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true); setSelected(null);
    appsApi.pipeline(jobId).then(r => {
      setBoard(r.data.board || {});
      setJobInfo(r.data.job);
      setLoading(false);
    });
  }, [jobId]);

  const refreshBoard = () => appsApi.pipeline(jobId).then(r => setBoard(r.data.board || {}));

  const advance = async (app) => {
    const next = NEXT_STAGE[app.stage];
    if (!next || moving) return;
    setMoving(true);
    await appsApi.updateStage(app.id, next);
    await refreshBoard();
    setSelected(a => a?.id === app.id ? { ...a, stage: next } : a);
    setMoving(false);
  };

  const reject = async () => {
    if (!rejectModal) return; setMoving(true);
    await appsApi.updateStage(rejectModal.id, 'rejected', rejectReason);
    await refreshBoard();
    setRejectModal(null); setRejectReason(''); setSelected(null); setMoving(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <h1 className="text-base font-semibold flex-shrink-0">Pipeline</h1>
        <div className="w-72">
          <Select value={jobId} onChange={e => setJobId(e.target.value)}>
            <option value="">Select a job...</option>
            {jobList.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </Select>
        </div>
        {jobInfo && <span className="text-sm text-gray-500">{Object.values(board).flat().length} total applicants</span>}
      </div>

      {!jobId ? (
        <EmptyState icon="⬡" title="Select a job" description="Choose an open job above to view its pipeline." />
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Kanban */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-3 p-4 h-full min-w-max">
              {STAGES.map(stage => {
                const cards = board[stage.key] || [];
                return (
                  <div key={stage.key} className="w-52 flex flex-col">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{stage.label}</span>
                      <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">{cards.length}</span>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto pb-4">
                      {cards.map(app => (
                        <div key={app.id}
                          onClick={() => setSelected(app)}
                          className={`bg-white border rounded-xl p-3 cursor-pointer transition-all ${
                            selected?.id === app.id
                              ? 'border-blue-400 ring-2 ring-blue-100'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar name={app.candidate?.full_name} size="sm" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-gray-900 truncate">{app.candidate?.full_name}</div>
                              <div className="text-xs text-gray-400 truncate">{app.candidate?.years_experience}yr exp</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <ScoreBadge score={app.ai_score} />
                            <span className="text-xs text-gray-400">
                              {Math.floor((Date.now() - new Date(app.created_at)) / 86400000)}d ago
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-80 flex-shrink-0 bg-white border-l border-gray-100 overflow-y-auto p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={selected.candidate?.full_name} size="md" />
                  <div>
                    <div className="font-semibold text-gray-900">{selected.candidate?.full_name}</div>
                    <div className="text-xs text-gray-500">{selected.candidate?.email}</div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500">×</button>
              </div>

              <div className="mb-4">
                <StageBadge stage={selected.stage} />
                <span className="ml-2 text-xs text-gray-400">{selected.candidate?.years_experience} yrs exp</span>
              </div>

              {/* AI Score */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-600">AI Score</span>
                  <ScoreBadge score={selected.ai_score} />
                </div>
                {selected.ai_signals && Object.entries({
                  'Skills match':   selected.ai_signals.skills_match,
                  'Experience':     selected.ai_signals.experience_score,
                  'JD relevance':   selected.ai_signals.relevance_score,
                  'Tenure':         selected.ai_signals.tenure_score,
                }).map(([label, val]) => val != null && (
                  <div key={label} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.round(val)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{Math.round(val)}</span>
                  </div>
                ))}
                {selected.ai_signals?.matched_skills?.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    Matched: {selected.ai_signals.matched_skills.join(', ')}
                  </div>
                )}
              </div>

              {/* Skills */}
              {selected.candidate?.parsed_skills?.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.candidate.parsed_skills.slice(0,12).map(s => (
                      <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {NEXT_STAGE[selected.stage] && (
                  <Btn className="w-full" onClick={() => advance(selected)} loading={moving}>
                    Advance to {NEXT_STAGE[selected.stage]?.replace(/_/g, ' ')} →
                  </Btn>
                )}
                <Btn variant="secondary" className="w-full" onClick={() => setRejectModal(selected)}>
                  Reject candidate
                </Btn>
                <Link to={`/candidates/${selected.candidate?.id}`} className="block">
                  <Btn variant="ghost" size="sm" className="w-full">View full profile</Btn>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(''); }}
        title={`Reject ${rejectModal?.candidate?.full_name}`}
        footer={<>
          <Btn variant="secondary" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancel</Btn>
          <Btn variant="danger" onClick={reject} loading={moving}>Confirm rejection</Btn>
        </>}>
        <p className="text-sm text-gray-600 mb-4">This will move the candidate to the rejected stage and cannot be undone.</p>
        <Field label="Reason (optional)">
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="e.g. Insufficient React experience, salary expectations too high..." rows={3} />
        </Field>
      </Modal>
    </div>
  );
}
