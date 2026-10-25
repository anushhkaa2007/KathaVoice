import React, { useState } from 'react';
import {
  BookOpen,
  Lock,
  Mail,
  User,
  Store,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type AuthMode = 'login' | 'register' | 'forgot-password';

export const AuthView: React.FC<{ initialMode?: AuthMode }> = ({ initialMode = 'login' }) => {
  const { login, register, resetPassword, authError, setAuthError } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);
  const [localValidationMsg, setLocalValidationMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidationMsg(null);
    setAuthError(null);

    if (mode === 'register') {
      if (!fullName.trim()) {
        setLocalValidationMsg('Full name is required.');
        return;
      }
      if (!shopName.trim()) {
        setLocalValidationMsg('Shop name is required.');
        return;
      }
      if (!email.trim()) {
        setLocalValidationMsg('Email address is required.');
        return;
      }
      if (password.length < 6) {
        setLocalValidationMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalValidationMsg('Passwords do not match. Please verify your password confirmation.');
        return;
      }

      setSubmitting(true);
      try {
        await register({ fullName, shopName, email, password });
      } catch (_) {
        // Error captured in authError
      } finally {
        setSubmitting(false);
      }
    } else if (mode === 'login') {
      if (!email.trim() || !password) {
        setLocalValidationMsg('Please enter both email and password.');
        return;
      }

      setSubmitting(true);
      try {
        await login(email, password);
      } catch (_) {
        // Error captured in authError
      } finally {
        setSubmitting(false);
      }
    } else if (mode === 'forgot-password') {
      if (!email.trim()) {
        setLocalValidationMsg('Please enter your registered email address.');
        return;
      }

      setSubmitting(true);
      try {
        await resetPassword(email);
        setResetSentEmail(email);
      } catch (_) {
        // Error captured in authError
      } finally {
        setSubmitting(false);
      }
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setLocalValidationMsg(null);
    setAuthError(null);
    setResetSentEmail(null);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 laser-paper">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#164E35] text-white flex items-center justify-center shadow-md">
            <BookOpen className="w-6 h-6 text-[#E6F3EC]" />
          </div>
          <div>
            <h1 className="font-canto text-2xl font-bold tracking-tight text-[#103325]">
              Katha Voice Easy
            </h1>
            <p className="text-xs text-stone-600">
              Retail Udhari & Credit Ledger
            </p>
          </div>
        </div>

        <h2 className="mt-6 text-center font-canto text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
          {mode === 'login' && 'Sign in to your shop ledger'}
          {mode === 'register' && 'Register your shop & start ledger'}
          {mode === 'forgot-password' && 'Reset your ledger password'}
        </h2>
        <p className="mt-1 text-center text-xs text-stone-600">
          {mode === 'login' && 'Access customer accounts, voice dictation, and debt records securely.'}
          {mode === 'register' && 'Create your private, cloud-persisted khata account.'}
          {mode === 'forgot-password' && 'We will send a password reset link to your verified email.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#FFFFFF] py-8 px-6 sm:px-10 border border-[#E6E0D2] rounded-2xl shadow-sm space-y-6">
          {/* Error Message Alert */}
          {(authError || localValidationMsg) && (
            <div className="p-3.5 bg-[#FCF4F1] border border-[#C25438]/40 rounded-xl flex items-start gap-2.5 text-xs text-[#9E3E23]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C25438]" />
              <div className="leading-relaxed font-medium">
                {localValidationMsg || authError}
              </div>
            </div>
          )}

          {/* Reset Link Success Notice */}
          {resetSentEmail && (
            <div className="p-4 bg-[#E6F3EC] border border-[#164E35]/40 rounded-xl space-y-2 text-xs text-[#103325]">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#164E35]" />
                <span>Password Reset Email Sent!</span>
              </div>
              <p className="text-stone-700 leading-relaxed">
                We sent password reset instructions to <strong>{resetSentEmail}</strong>. Please check your inbox and spam folder, then sign in with your new password.
              </p>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-semibold text-[#164E35] underline hover:text-[#103325] pt-1 block"
              >
                &larr; Back to Sign In
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registration Fields */}
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-stone-800">
                    Your Full Name *
                  </label>
                  <div className="mt-1 relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800">
                    Shop / Business Name *
                  </label>
                  <div className="mt-1 relative">
                    <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Kumar Kirana & General Store"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-stone-800">
                Email Address *
              </label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@yourshop.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                />
              </div>
            </div>

            {/* Password Field (for Login and Register) */}
            {mode !== 'forgot-password' && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-800">
                    Password *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="text-[11px] font-semibold text-[#164E35] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="mt-1 relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                  />
                </div>
              </div>
            )}

            {/* Confirm Password Field (for Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-stone-800">
                  Confirm Password *
                </label>
                <div className="mt-1 relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#164E35] text-white text-sm font-semibold hover:bg-[#103325] active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm ring-1 ring-[#103325]"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'login' && 'Sign In to Shop Ledger'}
                      {mode === 'register' && 'Create Account & Start Ledger'}
                      {mode === 'forgot-password' && 'Send Password Reset Link'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Mode Switchers */}
          <div className="pt-4 border-t border-[#E6E0D2] text-center text-xs text-stone-600 space-y-2">
            {mode === 'login' && (
              <p>
                Don&apos;t have a ledger account yet?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-bold text-[#164E35] hover:underline"
                >
                  Register your shop
                </button>
              </p>
            )}

            {mode === 'register' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold text-[#164E35] hover:underline"
                >
                  Sign in here
                </button>
              </p>
            )}

            {mode === 'forgot-password' && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold text-[#164E35] hover:underline"
                >
                  Return to Sign In
                </button>
              </p>
            )}
          </div>

          {/* Security Note */}
          <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E6E0D2] flex items-center gap-2 text-[11px] text-stone-600">
            <ShieldCheck className="w-4 h-4 text-[#164E35] shrink-0" />
            <span>
              Protected by Firebase Authentication & Zero-Trust Cloud Firestore security rules.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
