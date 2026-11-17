import React, { useState, useEffect } from 'react';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode
} from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import {
  auth,
  isGoogleAuthConfigured,
  getAuthErrorMessage
} from '../../lib/firebase';
import { validateEmail, validatePasswordStrength } from '../../lib/validation';
import {
  HeartPulse,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  LogOut,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

export const AuthView: React.FC = () => {
  const {
    isAuthenticated,
    isEmailVerified,
    firebaseUser,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    resendVerificationEmail,
    refreshVerificationStatus,
    sendPasswordReset,
    logout,
    showToast
  } = useApp();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password reset / action code state
  const [oobCode, setOobCode] = useState('');
  const [resetEmailForCode, setResetEmailForCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Firebase email action links (?mode=resetPassword&oobCode=... or ?mode=verifyEmail&oobCode=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const code = params.get('oobCode');

    if (!urlMode || !code) return;

    if (urlMode === 'resetPassword') {
      setMode('reset');
      setOobCode(code);
      setVerifyingCode(true);
      verifyPasswordResetCode(auth, code)
        .then((resolvedEmail) => {
          setResetEmailForCode(resolvedEmail);
          setErrorMsg(null);
        })
        .catch((err) => {
          setErrorMsg(getAuthErrorMessage(err));
        })
        .finally(() => {
          setVerifyingCode(false);
        });
    } else if (urlMode === 'verifyEmail') {
      setLoading(true);
      applyActionCode(auth, code)
        .then(async () => {
          setSuccessMsg('Email verified successfully! You may now sign in.');
          showToast('Email verified successfully!', 'success');
          if (auth.currentUser) {
            await refreshVerificationStatus();
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          setErrorMsg(getAuthErrorMessage(err));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [refreshVerificationStatus, showToast]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const isProviderDisabledError = Boolean(
    errorMsg && errorMsg.includes('not enabled in Firebase Authentication Console')
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    const pwdIssue = validatePasswordStrength(password);
    if (pwdIssue) {
      setErrorMsg(pwdIssue);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(fullName, email, password);
      setSuccessMsg('Verification email sent! Please verify your inbox to access your Health Vault.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateEmail(email)) {
      setErrorMsg('Please enter the email address associated with your account.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccessMsg(`Password reset email sent to ${email.trim()}. Check your inbox to continue.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!oobCode.trim()) {
      setErrorMsg('Missing password reset code from your email link.');
      return;
    }
    const pwdIssue = validatePasswordStrength(password);
    if (pwdIssue) {
      setErrorMsg(pwdIssue);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode.trim(), password);
      setSuccessMsg('Your password has been reset successfully. Please sign in with your new password.');
      showToast('Password reset complete! Please sign in.', 'success');
      setPassword('');
      setConfirmPassword('');
      window.history.replaceState({}, document.title, window.location.pathname);
      setMode('signin');
    } catch (err) {
      setErrorMsg(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email Verification Gate for signed-in users whose email is not yet verified
  if (isAuthenticated && !isEmailVerified && firebaseUser) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#181818] border border-emerald-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl relative z-10 space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
              VERIFICATION REQUIRED
            </span>
            <h2 className="text-2xl font-black text-white">Verify Your Email Address</h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              We sent a verification link to{' '}
              <span className="text-emerald-400 font-bold">{firebaseUser.email}</span>.
              Please verify your email to unlock your protected HealthCare+ medical vault.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={async () => {
                setLoading(true);
                await refreshVerificationStatus();
                setLoading(false);
              }}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Checking Status...' : "I've Verified — Refresh & Continue"}</span>
            </button>

            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await resendVerificationEmail();
                } catch (err: any) {
                  setErrorMsg(err?.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-200 font-bold text-xs transition disabled:opacity-50"
            >
              Resend Verification Email
            </button>

            <button
              onClick={logout}
              className="w-full py-2.5 px-4 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out & Use Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-500/20 mb-3">
            <HeartPulse className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            HealthCare<span className="text-emerald-400">+</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-medium">
            Luxury AI Precision Medicine & Health Platform
          </p>
        </div>

        {/* Mode Tabs for Sign In / Create Account */}
        {(mode === 'signin' || mode === 'signup') && (
          <div className="flex p-1 rounded-xl bg-neutral-900 border border-white/5 mb-5">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'signin' ? 'bg-emerald-500 text-white shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'signup' ? 'bg-emerald-500 text-white shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error & Success Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="space-y-1">
              <p>{errorMsg}</p>
              {isProviderDisabledError && isGoogleAuthConfigured && (
                <p className="text-[11px] text-emerald-300 font-semibold">
                  Tip: Tap &quot;Continue with Google&quot; below for instant sign-in.
                </p>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SIGN IN / SIGN UP FORM */}
        {(mode === 'signin' || mode === 'signup') && (
          <>
            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      maxLength={120}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                      placeholder="Aarav Sharma"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-neutral-500 hover:text-neutral-300"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Min 8 characters with uppercase, lowercase, and a number.
                  </p>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {mode === 'signin' && (
                <div className="flex items-center justify-end text-xs">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-pulse">Authenticating...</span>
                ) : (
                  <>
                    <span>{mode === 'signup' ? 'Create Account & Verify Email' : 'Sign In to Health Vault'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {isGoogleAuthConfigured && (
              <>
                <div className="relative my-5 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <span className="relative px-3 bg-[#181818] text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    Or Continue With
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className={`w-full py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2.5 transition disabled:opacity-50 ${
                    isProviderDisabledError
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400 text-white ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20'
                      : 'bg-neutral-900 hover:bg-neutral-800 border-white/10 text-neutral-200'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>
              </>
            )}
          </>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" /> Reset Password
              </h2>
              <p className="text-xs text-neutral-400">
                Enter your registered email address and we will send you a Firebase password reset link.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? 'Sending Reset Link...' : 'Send Password Reset Email'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="w-full py-2 text-xs font-semibold text-neutral-400 hover:text-white flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </form>
        )}

        {/* CONFIRM PASSWORD RESET SCREEN */}
        {mode === 'reset' && (
          <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" /> Set New Password
              </h2>
              <p className="text-xs text-neutral-400">
                {verifyingCode
                  ? 'Verifying reset link...'
                  : resetEmailForCode
                  ? `Creating new password for ${resetEmailForCode}`
                  : 'Enter your reset code and choose a strong new password.'}
              </p>
            </div>

            {!oobCode && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Reset Code</label>
                <input
                  type="text"
                  value={oobCode}
                  onChange={(e) => setOobCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="Paste oobCode from email link"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                placeholder="Min 8 chars, upper, lower & number"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                placeholder="Repeat new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || verifyingCode}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Confirm Password Reset'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="w-full py-2 text-xs font-semibold text-neutral-400 hover:text-white flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Firebase Auth • Cloud Firestore Protected</span>
        </div>
      </div>
    </div>
  );
};
