import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/Button';
import FormError from '../../components/shared/FormError';

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already logged in — redirect declaratively (BUG-030: avoid calling navigate() during render)
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center mb-6">
          <Building2 size={22} className="text-white" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sign in</h1>
        <p className="text-sm text-gray-400 -mt-0.5">to Real Estate CRM</p>

        <form onSubmit={handleSubmit} noValidate className="mt-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-gray-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                required
                disabled={loading}
                autoComplete="email"
                className="w-full pb-2 text-sm text-gray-900 bg-transparent border-0 border-b-[1.5px] border-gray-300 focus:outline-none focus:border-primary transition-colors duration-150 ease-snappy disabled:text-gray-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-gray-400">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full pb-2 pr-8 text-sm text-gray-900 bg-transparent border-0 border-b-[1.5px] border-gray-300 focus:outline-none focus:border-primary transition-colors duration-150 ease-snappy disabled:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 bottom-2 text-gray-400 hover:text-gray-600 transition-colors duration-150 ease-snappy"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <FormError message={error} />

            <Button type="submit" loading={loading} className="w-full justify-center gap-1.5 mt-1">
              Sign In
              {!loading && <ArrowRight size={15} />}
            </Button>
          </div>
        </form>

        <p className="text-xs text-gray-400 mt-10">
          Real Estate CRM — Phase 1
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
