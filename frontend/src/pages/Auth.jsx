import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Btn, Field, Input } from '../components/ui';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function LoginPage() {
  const [form, setForm] = useState({ email: 'sarah@acme.com', password: 'password123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Hire<span className="text-blue-600">flow</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com"
                autoFocus
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </Field>
            <Btn type="submit" loading={loading} className="w-full">
              Sign in
            </Btn>
          </form>

          <div className="mt-5 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-1">Demo accounts</p>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>Admin: <span className="font-mono text-gray-700">admin@acme.com</span></div>
              <div>Recruiter: <span className="font-mono text-gray-700">sarah@acme.com</span></div>
              <div>Password: <span className="font-mono text-gray-700">password123</span></div>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500">
            No account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({
    company_name: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('tenant', JSON.stringify(res.data.tenant));
      navigate('/dashboard');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Hire<span className="text-blue-600">flow</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create your company account</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            <Field label="Company name" required>
              <Input value={form.company_name} onChange={set('company_name')} placeholder="Acme Corp" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <Input value={form.first_name} onChange={set('first_name')} placeholder="Jane" />
              </Field>
              <Field label="Last name">
                <Input value={form.last_name} onChange={set('last_name')} placeholder="Smith" />
              </Field>
            </div>
            <Field label="Work email" required>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="jane@acme.com" />
            </Field>
            <Field label="Password" required>
              <Input type="password" value={form.password} onChange={set('password')} placeholder="Min 8 characters" />
            </Field>
            <Btn type="submit" loading={loading} className="w-full">
              Create account
            </Btn>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
