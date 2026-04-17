import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',   icon: '▦' },
  { to: '/jobs',        label: 'Jobs',         icon: '💼' },
  { to: '/pipeline',    label: 'Pipeline',     icon: '⬡' },
  { to: '/candidates',  label: 'Candidates',   icon: '👤' },
  { to: '/interviews',  label: 'Interviews',   icon: '📅' },
  { to: '/offers',      label: 'Offers',       icon: '✉' },
  { to: '/analytics',   label: 'Analytics',    icon: '📊' },
];

export default function Layout() {
  const { user, tenant, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-sm text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-4 py-5">
          <span className="text-base font-semibold text-gray-900">Hire<span className="text-blue-600">flow</span></span>
          {tenant && <div className="text-xs text-gray-400 mt-0.5 truncate">{tenant.name}</div>}
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user?.full_name}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-gray-600 text-xs" title="Logout">⏏</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
