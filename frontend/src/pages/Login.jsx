import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setCredentials } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phone && !email) {
      setError('Please enter either a Phone Number or an Email address.');
      return;
    }

    if (phone && email) {
      setError('Please enter ONLY ONE: either Phone Number OR Email address, not both.');
      return;
    }

    let loginId = '';

    if (phone) {
      if (!/^\d{10}$/.test(phone)) {
        setError('Phone number must be exactly 10 digits.');
        return;
      }
      loginId = phone;
    }

    if (email) {
      if (!/^[\w-\.]+@gmail\.com$/.test(email.toLowerCase())) {
        setError('Please enter a valid @gmail.com address.');
        return;
      }
      loginId = email;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { loginId, password });
      


      setCredentials(response.data, response.data.token);
      
      // Redirect based on role
      if (response.data.role === 'admin') {
        navigate('/admin');
      } else if (response.data.role === 'delivery') {
        navigate('/delivery');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-md mx-auto mt-16 bg-white dark:bg-dark-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-8">Welcome Back</h2>
      
      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-sm">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
          <input
            type="text"
            pattern="\d{10}"
            maxLength="10"
            className="w-full px-4 py-2 bg-white dark:bg-dark-900 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white"
            placeholder="Enter your 10-digit phone number"
            value={phone}
            disabled={email.length > 0}
            onKeyDown={(e) => {
              if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key)) {
                e.preventDefault();
              }
            }}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="flex items-center justify-center space-x-4">
          <div className="h-px bg-gray-300 dark:bg-dark-600 flex-1"></div>
          <span className="text-gray-400 dark:text-gray-500 text-sm font-bold">OR</span>
          <div className="h-px bg-gray-300 dark:bg-dark-600 flex-1"></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gmail Address</label>
          <input
            type="email"
            className="w-full px-4 py-2 bg-white dark:bg-dark-900 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white"
            placeholder="example@gmail.com"
            value={email}
            disabled={phone.length > 0}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength="6"
              className="w-full px-4 py-2 bg-white dark:bg-dark-900 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white pr-10"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500 bg-white dark:bg-dark-900" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-70"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="mt-6 text-center space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
