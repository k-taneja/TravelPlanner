import React, { useState, useEffect } from 'react';
import { Plane, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ResetPasswordViewProps {
  onComplete: () => void;
  onBack: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onComplete, onBack }) => {
  const { updatePassword, session } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  // Check if user has a valid session for password reset
  useEffect(() => {
    if (!session) {
      // Redirect to login if no session
      onBack();
    }
  }, [session, onBack]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { error } = await updatePassword(formData.password);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (err) {
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 rounded-full bg-green-500/20 border border-green-500/30">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Password Updated!</h1>
            <p className="text-gray-300 text-sm mb-6">
              Your password has been successfully updated. You will be redirected to the dashboard.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: '#ff497c' }}></div>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
            <p className="text-gray-300 text-sm">
              Enter your new password below
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

            {/* New Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                New Password
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
                  placeholder="Enter new password"
                  minLength={6}
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

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-white/30 rounded-xl text-white placeholder-gray-300 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 hover:border-white/50"
                  style={{ '--tw-ring-color': '#ff497c' }}
                  placeholder="Confirm new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white focus:outline-none focus:text-white transition-colors duration-200"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs text-blue-300 mb-2 font-medium">Password Requirements:</p>
              <ul className="text-xs text-blue-200 space-y-1">
                <li className={`flex items-center ${formData.password.length >= 6 ? 'text-green-400' : ''}`}>
                  <span className="mr-2">{formData.password.length >= 6 ? '✓' : '•'}</span>
                  At least 6 characters long
                </li>
                <li className={`flex items-center ${formData.password === formData.confirmPassword && formData.password ? 'text-green-400' : ''}`}>
                  <span className="mr-2">{formData.password === formData.confirmPassword && formData.password ? '✓' : '•'}</span>
                  Passwords match
                </li>
              </ul>
            </div>

            {/* Update Button */}
            <button
              type="submit"
              disabled={loading || formData.password.length < 6 || formData.password !== formData.confirmPassword}
              className="relative w-full bg-transparent border-2 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[0.98] active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg hover:shadow-xl group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderColor: '#ff497c',
                '--tw-ring-color': '#ff497c'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#ff497c')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span className="relative z-10">
                {loading ? 'Updating...' : 'Update Password'}
              </span>
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={onBack}
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
};