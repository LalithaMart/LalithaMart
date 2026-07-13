import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Eye, EyeOff } from 'lucide-react';

const Register = ({ targetRole = 'customer' }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const navigate = useNavigate();
  const { setCredentials } = useAuthStore();

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const handleResendOtp = async () => {
    if (timeLeft > 0) return;
    setLoading(true);
    setError('');
    try {
      const payload = { name, phone, email: email.trim(), password, role: targetRole };
      const response = await api.post('/auth/send-signup-otp', payload);
      setSuccess(response.data.message || 'OTP resent to your email.');
      setTimeLeft(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (step === 1) {
        const payload = { name, phone, email: email.trim(), password, role: targetRole };
        const response = await api.post('/auth/send-signup-otp', payload);
        setSuccess(response.data.message || 'OTP sent to your email.');
        setStep(2);
        setTimeLeft(60);
        setLoading(false);
      } else {
        // Step 2: Verify OTP
        const response = await api.post('/auth/verify-signup-otp', { email: email.trim(), otp });
        
        if (targetRole === 'delivery') {
          setSuccess('Registration successful! Please wait for admin approval before logging in.');
          setStep(3); // success state
          setLoading(false);
        } else {
          setCredentials(response.data, response.data.token);
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed');
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (targetRole === 'delivery') return 'Join Our Delivery Fleet';
    return 'Create an Account';
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white dark:bg-dark-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-8">
        {step === 2 ? 'Verify Email' : getTitle()}
      </h2>
      
      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-sm">{error}</div>}
      {success && step === 3 && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm flex flex-col gap-3 text-center">
          <p>{success}</p>
          <Link to="/login" className="inline-block bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition">
            Go to Login
          </Link>
        </div>
      )}
      
      {step === 1 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-white dark:bg-dark-900 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
            <input
              type="text"
              required
              pattern="\d{10}"
              maxLength="10"
              title="Phone number must be exactly 10 digits"
              className="w-full px-4 py-2 bg-white dark:bg-dark-900 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white"
              placeholder="10-digit phone number"
              value={phone}
              onKeyDown={(e) => {
                if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gmail Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 bg-white dark:bg-dark-900 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white"
              placeholder="example@gmail.com"
              value={email}
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
                placeholder="Minimum 6 characters"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-70 mt-2"
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-6 text-sm text-center font-medium">{success}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
              Enter the 6-digit OTP sent to {email}
            </label>
            <input
              type="text"
              required
              maxLength="6"
              className="w-full px-4 py-3 bg-white dark:bg-dark-900 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white text-center text-2xl tracking-[0.5em] font-bold"
              placeholder="------"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-70"
            >
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || timeLeft > 0}
              className="w-full bg-white dark:bg-dark-800 border-2 border-primary-100 dark:border-primary-900/30 text-primary-600 dark:text-primary-400 py-2.5 rounded-lg font-medium hover:bg-primary-50 dark:hover:bg-dark-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {timeLeft > 0 ? `Resend OTP in ${timeLeft}s` : 'Resend OTP'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setSuccess(''); setError(''); setTimeLeft(0); }}
              className="w-full bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-dark-600 transition"
            >
              Back
            </button>
          </div>
        </form>
      )}

      {targetRole === 'customer' ? (
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
              Login
            </Link>
          </p>
          <p className="text-sm">
            <Link to="/delivery/register" className="text-gray-500 hover:text-gray-800 dark:text-gray-500 dark:hover:text-gray-300 font-medium transition">
              Sign up as Delivery Agent &rarr;
            </Link>
          </p>
        </div>
      ) : targetRole === 'delivery' ? (
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already registered?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
              Login as Delivery Agent
            </Link>
          </p>
          <p className="text-sm">
            <Link to="/register" className="text-gray-500 hover:text-gray-800 font-medium transition">
              &larr; Sign up as Customer
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default Register;
