import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import useAuthStore from '@/context/authStore';
import { auth as authApi } from '@/api/client';
import { Field } from '@/components/ui';
import GoogleSignInButton  from '@/components/GoogleSignInButton';
import toast from 'react-hot-toast';
import { Leaf, Check, Mail, AlertTriangle, CheckCircle2, ChevronLeft, Eye, EyeOff } from 'lucide-react';

// ── Shared Auth Card Shell ────────────────────────────────────────
// Centered card layout (matches the approved reference template:
// white background, single rounded card, blue accent) rather than the
// old 45/55 split panel — this is mobile-first by construction, since
// there's no secondary panel to hide at a breakpoint. The brand mark
// and trust bullets that used to live in the left panel now sit above
// the card so they're never lost, just reflowed.
function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-shell" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'var(--cream)',
      padding: 'var(--space-6) var(--space-4)',
    }}>
      <style>{`
        .auth-shell__card {
          animation: fadeUp 0.35s ease;
        }
        .auth-shell__google > * {
          width: 100% !important;
        }
        .auth-shell input.input:focus {
          border-color: var(--sage) !important;
          box-shadow: 0 0 0 3px var(--parchment) !important;
        }
        .auth-shell .btn-primary {
          background: var(--sage) !important;
          border-color: var(--sage) !important;
        }
        .auth-shell .btn-primary:hover:not(:disabled) {
          background: var(--sage-dark) !important;
        }
        .auth-shell .btn-outline {
          border-color: var(--sage) !important;
          color: var(--sage) !important;
        }
        .auth-shell .btn-outline:hover {
          background: var(--parchment) !important;
        }
        @media (min-width: 480px) {
          .auth-shell__card { padding: var(--space-8) var(--space-8) !important; }
        }
      `}</style>

      <Link to='/' style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 28px' }}>
        <span style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--parchment)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Leaf size={18} strokeWidth={1.8} color="var(--sage)" aria-hidden="true" />
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--forest)', fontWeight: 700 }}>
          Winners Health
        </span>
      </Link>

      <div
        className="auth-shell__card"
        style={{
          width: '100%', maxWidth: 420,
          background: 'var(--white)',
          borderRadius: 20,
          boxShadow: '0 1px 2px rgba(20,22,31,0.04), 0 12px 32px -12px rgba(20,22,31,0.12)',
          padding: 'var(--space-6) var(--space-5)',
        }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--forest)', marginBottom: 6 }}>{title}</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 'var(--space-6)', fontSize: 14 }}>{subtitle}</p>
        {children}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 28, alignItems: 'center' }}>
        {['Free delivery over ₦40,000', '30-day returns', '100% natural ingredients'].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13 }}>
            <Check size={13} strokeWidth={2.4} color="var(--sage)" aria-hidden="true" /> {t}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────
export function LoginPage() {
  const { login, loginWithGoogle, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      toast.success('Welcome back!');
      navigate(params.get('redirect') || '/');
    } else {
      toast.error(result.error);
    }
  };

  const handleGoogleSuccess = (data) => {
    loginWithGoogle(data);
    toast.success('Welcome back!');
    navigate(params.get('redirect') || '/');
  };

  const handleGoogleError = (err) => {
    toast.error(err.message || 'Google sign-in failed.');
  };

  return (
    <AuthShell title='Welcome back' subtitle='Sign in to your account'>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        <div className="auth-shell__google">
          <GoogleSignInButton
           onSuccess={handleGoogleSuccess}
           onError={handleGoogleError}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>or continue with email</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Field label='Email Address' error={errors.email?.message}>
            <input className={`input ${errors.email ? 'error' : ''}`} type='email' placeholder='you@example.com'
              {...register('email', { required: 'Email is required' })} />
          </Field>
          <Field label='Password' error={errors.password?.message}>
            <div style={{ position: 'relative' }}>
              <input className={`input ${errors.password ? 'error' : ''}`} type={showPassword ? 'text' : 'password'} placeholder='Your password'
                {...register('password', { required: 'Password is required' })} />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: 12 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <div style={{ textAlign: 'right' }}>
            <Link to='/forgot-password' style={{ fontSize: 13, color: 'var(--sage)' }}>Forgot password?</Link>
          </div>
          <button
            type='submit'
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', height: 46, borderRadius: 12, border: 'none',
              background: 'var(--sage)', color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: isLoading ? 'default' : 'pointer', opacity: isLoading ? 0.75 : 1,
            }}
          >
            {isLoading ? <><div className='spinner' style={{ width: 18, height: 18 }} /> Signing in...</> : 'Sign In'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
            Don't have an account? <Link to='/register' style={{ color: 'var(--sage)', fontWeight: 600 }}>Sign up</Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}

// ── Forgot Password ───────────────────────────────────────────────
export function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [sent, setSent] = useState(false);


  const onSubmit = async (data) => {
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (_) {
      setSent(true); // Always show success (prevent enumeration)
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="Enter your email and we'll send a reset link">
      {sent ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Mail size={56} strokeWidth={1.5} color="var(--sage)" aria-hidden="true" />
          </div>
          <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            If an account with that email exists, you'll receive a reset link shortly.
          </p>
          <Link to="/login" className='btn btn-outline btn-full' style={{ marginTop: 'var(--space-6)' }}>Back to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Field label='Email Address' error={errors.email?.message}>
            <input className={`input ${errors.email ? 'error' : ''}`} type='email' placeholder='you@example.com'
              {...register('email', { required: 'Email is required' })} />
          </Field>
          <button className='btn btn-primary btn-full btn-lg' type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}><ChevronLeft size={14} strokeWidth={2} /> Back to Login</Link>
        </form>
      )}
    </AuthShell>
  );
}

// ── Reset Password ────────────────────────────────────────────────
// authApi.resetPassword(token, password) is assumed to mirror the
// forgotPassword(email) shape above — check /api/client and rename
export function ResetPasswordPage() {
  const { token } = useParams();
  // Fallback in case your email link uses a query string instead of
  // a path param (?token=...) — harmless if unused.
  const [searchParams] = useSearchParams();
  const resetToken = token || searchParams.get('token');

  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(!resetToken);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const password = watch('password', '');

  
const onSubmit = async (data) => {
  try {
    await authApi.resetPassword({ token: resetToken, password: data.password });
    setDone(true);
    toast.success('Password updated');
    setTimeout(() => navigate('/login'), 1800);
  } catch (err) {
    const status = err?.response?.status;
    if (status === 400 || status === 410) {
      setInvalid(true);
    } else {
      toast.error(err?.response?.data?.message || 'Something went wrong. Try again.');
    }
  }
};

  if (invalid) {
    return (
      <AuthShell title="Link expired" subtitle="This reset link is no longer valid">
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <AlertTriangle size={56} strokeWidth={1.5} color="var(--rust)" aria-hidden="true" />
          </div>
          <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            The link may have expired or already been used. Request a fresh one to continue.
          </p>
          <Link to="/forgot-password" className='btn btn-primary btn-full' style={{ marginTop: 'var(--space-6)' }}>
            Request new link
          </Link>
          <Link to="/login" style={{ display: 'block', textAlign: 'center', fontSize: 14, color: 'var(--muted)', marginTop: 12 }}>
            Back to Login
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="Taking you to sign in...">
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <CheckCircle2 size={56} strokeWidth={1.5} color="var(--success)" aria-hidden="true" />
          </div>
          <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            Your password has been changed successfully.
          </p>
          <Link to="/login" className='btn btn-primary btn-full' style={{ marginTop: 'var(--space-6)' }}>
            Go to sign in now
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose something strong and memorable">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Field label='New Password' error={errors.password?.message}>
          <div style={{ position: 'relative' }}>
            <input
              className={`input ${errors.password ? 'error' : ''}`}
              type={showPassword ? 'text' : 'password'}
              placeholder='Enter new password'
              style={{ paddingRight: 44 }}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                  message: 'Include upper, lower case and a number',
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                display: 'flex',
                padding: 0,
              }}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
            </button>
          </div>
        </Field>

        <Field label='Confirm Password' error={errors.confirm?.message}>
          <div style={{ position: 'relative' }}>
            <input
              className={`input ${errors.confirm ? 'error' : ''}`}
              type={showConfirm ? 'text' : 'password'}
              placeholder='Re-enter new password'
              style={{ paddingRight: 44 }}
              {...register('confirm', {
                required: 'Please confirm your password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                display: 'flex',
                padding: 0,
              }}
            >
              {showConfirm ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
            </button>
          </div>
        </Field>

        <button className='btn btn-primary btn-full btn-lg' type='submit' disabled={isSubmitting}>
          {isSubmitting ? <><div className='spinner' style={{ width: 18, height: 18 }} /> Updating...</> : 'Update Password'}
        </button>

        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}><ChevronLeft size={14} strokeWidth={2} /> Back to Login</Link>
      </form>
    </AuthShell>
  );
}

export default LoginPage;