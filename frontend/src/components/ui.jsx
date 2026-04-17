// Shared reusable UI components

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-700',
    green:  'bg-green-100 text-green-800',
    blue:   'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red:    'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
    teal:   'bg-teal-100 text-teal-800',
    orange: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

export const STAGE_META = {
  applied:          { label: 'Applied',           color: 'gray' },
  ai_screening:     { label: 'AI screening',       color: 'blue' },
  recruiter_review: { label: 'Recruiter review',   color: 'purple' },
  phone_screen:     { label: 'Phone screen',       color: 'teal' },
  interviewing:     { label: 'Interviewing',       color: 'yellow' },
  hiring_decision:  { label: 'Hiring decision',    color: 'orange' },
  offer_extended:   { label: 'Offer extended',     color: 'orange' },
  offer_accepted:   { label: 'Offer accepted',     color: 'green' },
  hired:            { label: 'Hired',              color: 'green' },
  rejected:         { label: 'Rejected',           color: 'red' },
  withdrawn:        { label: 'Withdrawn',          color: 'gray' },
};

export function StageBadge({ stage }) {
  const meta = STAGE_META[stage] || { label: stage, color: 'gray' };
  return <Badge color={meta.color}>{meta.label}</Badge>;
}

export function ScoreBadge({ score }) {
  if (score == null) return <span className="text-xs text-gray-400">—</span>;
  const s = Math.round(score);
  const cls = s >= 85 ? 'bg-green-100 text-green-800' : s >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{s}</span>;
}

export function Avatar({ name, size = 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['bg-purple-100 text-purple-700', 'bg-teal-100 text-teal-700', 'bg-blue-100 text-blue-700',
                  'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-green-100 text-green-700'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-medium flex-shrink-0`}>
      {initials}
    </div>
  );
}

export function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'h-4 w-4' : 'h-8 w-8';
  return (
    <div className={`${sz} animate-spin rounded-full border-2 border-gray-200 border-t-gray-600`} />
  );
}

export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, error, children, required }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white ${props.className || ''}`}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white resize-y ${props.className || ''}`}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white ${props.className || ''}`}
    >
      {children}
    </select>
  );
}

export function Btn({ children, variant = 'primary', size = 'md', loading, ...props }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary:  'bg-gray-900 text-white hover:bg-gray-700',
    secondary:'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
    danger:   'bg-red-600 text-white hover:bg-red-700',
    ghost:    'text-gray-600 hover:bg-gray-100',
  };
  return (
    <button {...props} disabled={props.disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]} ${props.className || ''}`}>
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

export function StatCard({ label, value, sub, valueClass = '' }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold text-gray-900 ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
