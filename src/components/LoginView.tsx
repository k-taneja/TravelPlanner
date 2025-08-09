import React, { useState } from 'react';
import { Plane, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LoginViewProps {
  onLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = isSignUp 
        ? await signUp(formData.email, formData.password)
        : await signIn(formData.email, formData.password);

      if (error) {
        setError(error.message);
      } else {
        onLogin();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await resetPassword(formData.email);
      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage('Password reset email sent! Check your inbox.');
        setShowForgotPassword(false);
      }
    } catch (err) {
      setError('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGuestLogin = () => {
    // Skip authentication for guest users
    onLogin();
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 rounded-2xl" style={{ backgroundColor: '#ff497c' }}>
                  <Plane className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
              <p className="text-gray-300 text-sm">
                Enter your email to receive reset instructions
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleForgotPassword} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">{successMessage}</span>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-white mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-white/30 rounded-xl text-white placeholder-gray-300 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 hover:border-white/50"
                    style={{ '--tw-ring-color': '#ff497c' }}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Reset Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full bg-transparent border-2 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[0.98] active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg hover:shadow-xl group disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  borderColor: '#ff497c',
                  '--tw-ring-color': '#ff497c'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#ff497c')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="relative z-10">
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </span>
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                type="button"
                className="font-medium text-sm transition-colors duration-200 focus:outline-none focus:underline hover:opacity-80"
                style={{ color: '#ff497c' }}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: '#ff497c' }}>
                <Plane className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Planora
            </h1>
            <p className="text-gray-300 text-sm">
              Plan smarter, travel better
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">{successMessage}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-white/30 rounded-xl text-white placeholder-gray-300 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 hover:border-white/50"
                  style={{ '--tw-ring-color': '#ff497c' }}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-white/30 rounded-xl text-white placeholder-gray-300 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 hover:border-white/50"
                  style={{ '--tw-ring-color': '#ff497c' }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white focus:outline-none focus:text-white transition-colors duration-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            {!isSignUp && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm transition-colors duration-200 focus:outline-none focus:underline hover:opacity-80"
                  style={{ color: '#ff497c' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full bg-transparent border-2 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[0.98] active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg hover:shadow-xl group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderColor: '#ff497c',
                '--tw-ring-color': '#ff497c'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#ff497c')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span className="relative z-10">
                {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </span>
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundImage: 'linear-gradient(to right, #ff497c, #a855f7)' }}></div>
            </button>
          </form>

          {/* Bottom Links */}
          <div className="mt-6 space-y-4">
            {/* Toggle Sign Up/Sign In */}
            <div className="text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccessMessage(null);
                }}
                type="button"
                className="font-medium text-sm transition-colors duration-200 focus:outline-none focus:underline hover:opacity-80"
                style={{ color: '#ff497c' }}
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>

            {/* Guest Button */}
            <button
              onClick={handleGuestLogin}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[0.98] active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 backdrop-blur-sm border border-white/20 hover:border-white/30"
              style={{ '--tw-ring-color': '#ff497c' }}
            >
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            <span className="text-xs text-gray-400">
            Secure login • Privacy protected
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}