import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', form);
      const { token, userId, username, displayName, profilePicUrl }
        = response.data;
      login(
        { id: userId, username, displayName, profilePicUrl },
        token
      );
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center
                    justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500
                          flex items-center justify-center mx-auto mb-4
                          shadow-lg shadow-emerald-500/20">
            <span className="text-3xl">💬</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Nexchat</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Sign in to continue
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800
                        rounded-2xl p-6 shadow-xl">

          {error && (
            <div className="bg-red-900/30 border border-red-700/50
                            text-red-400 rounded-xl p-3 mb-4 text-sm
                            flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Email or Phone Number
              </label>
              <input
                type="text"
                name="emailOrPhone"
                value={form.emailOrPhone}
                onChange={handleChange}
                required
                className="w-full bg-gray-800 border border-gray-700
                           rounded-xl px-4 py-3 text-white
                           focus:outline-none focus:border-emerald-500
                           placeholder-gray-600 transition-colors"
                placeholder="Enter your email or phone number"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700
                             rounded-xl px-4 py-3 text-white pr-12
                             focus:outline-none focus:border-emerald-500
                             placeholder-gray-600 transition-colors"
                  placeholder="Enter your password"
                />
                <button type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-500 hover:text-gray-300
                             transition-colors">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600
                         text-white font-semibold py-3 rounded-xl
                         transition-all disabled:opacity-50
                         hover:scale-[1.02] active:scale-[0.98]">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-5 text-sm">
            Don't have an account?{' '}
            <Link to="/register"
              className="text-emerald-400 hover:text-emerald-300
                         font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;