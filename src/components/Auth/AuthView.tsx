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
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type AuthMode = 'login' | 'register' | 'forgot-password';

export const AuthView: React.FC<{ initialMode?: AuthMode }> = ({ initialMode = 'login' }) => {
  const { login, register, signInWithGoogle, continueAsGuest, resetPassword, authError, setAuthError } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);
  const [localValidationMsg, setLocalValidationMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLocalValidationMsg(null);
    setAuthError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (_) {
      // Error captured in authError
    } finally {
      setGoogleSubmitting(false);
    }
  };

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

  const isOperationNotAllowed =
    authError && authError.toLowerCase().includes('not enabled in this firebase project');

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
          {/* Primary Recommended Action: Google Sign-In */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleSubmitting || submitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white border border-[#D5CEBE] text-stone-800 text-sm font-semibold hover:bg-[#FAF7F2] active:scale-[0.98] disabled:opacity-50 transition-all shadow-xs"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleSubmitting ? 'Connecting Google...' : 'Continue with Google (Recommended)'}</span>
            </button>
            <p className="text-[11px] text-stone-600 text-center mt-1.5">
              Instant 1-click cloud sync pre-configured for your store.
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#E6E0D2] w-full" />
            <span className="bg-white px-3 text-[11px] uppercase font-semibold text-stone-600">
              or with email
            </span>
          </div>

          {/* Error Message Alert */}
          {(authError || localValidationMsg) && (
            <div className="p-3.5 bg-[#FCF4F1] border border-[#C25438]/40 rounded-xl space-y-2 text-xs text-[#9E3E23]">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C25438]" />
                <div className="leading-relaxed font-medium">
                  {localValidationMsg || authError}
                </div>
              </div>

              {/* Actionable guidance if email provider is disabled */}
              {isOperationNotAllowed && (
                <div className="pt-2 border-t border-[#C25438]/20 space-y-2">
                  <div className="text-[11px] text-stone-700">
                    💡 <strong>Quick Fix:</strong> Click <strong>Continue with Google</strong> above to sign in without email setup.
                  </div>
                  <div className="p-2 bg-white rounded border border-[#E6E0D2] text-[11px] text-stone-600">
                    <strong>To enable Email/Password:</strong> Open your{' '}
                    <a
                      href="https://console.firebase.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#164E35] underline font-semibold inline-flex items-center gap-0.5"
                    >
                      Firebase Console <ExternalLink className="w-3 h-3 inline" />
                    </a>{' '}
                    &rarr; <em>Authentication</em> &rarr; <em>Sign-in method</em> &rarr; Enable <strong>Email/Password</strong>.
                  </div>
                </div>
              )}
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
                disabled={submitting || googleSubmitting}
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
                      {mode === 'login' && 'Sign In with Email'}
                      {mode === 'register' && 'Register with Email'}
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
                Don&apos;t have an email ledger account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-bold text-[#164E35] hover:underline"
                >
                  Register with Email
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

            {/* Guest Demo Mode Option */}
            <div className="pt-3 border-t border-[#E6E0D2]">
              <button
                type="button"
                onClick={continueAsGuest}
                className="w-full py-2 px-3 rounded-lg border border-[#D5CEBE] bg-[#FAF7F2] hover:bg-[#E6F3EC] text-[#164E35] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explore as Demo Guest (No Sign-In Required)</span>
              </button>
            </div>
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
