// src/pages/auth/RegisterPage.jsx  (or wherever your auth pages live)
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import useAuthStore from '@/context/authStore';
import { Field } from '@/components/ui';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import toast from 'react-hot-toast';
import { Leaf, Check, Eye, EyeOff, House } from 'lucide-react';

// ── Shared Auth Card Shell ─────────────────────────────────────────
function AuthShell({ title, subtitle, children }) {
  return (
    <div
      className="auth-shell"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cream)',
        padding: 'var(--space-6) var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, textDecoration: 'none' }}>
            <Leaf size={25} strokeWidth={1.7} color="var(--sage)" aria-hidden="true" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--forest)', fontWeight: 700 }}>
              Winners Health
            </span>
          </Link>
          <Link
            to="/"
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, color: 'var(--forest)' }}
          >
            <House size={15} strokeWidth={2} aria-hidden="true" />
            Home
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--forest)', marginBottom: 6, lineHeight: 1.25 }}>
            Your wellness journey starts here.
          </h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: 14, margin: 0 }}>
            Premium supplements trusted by 50,000+ Individuals. Quality ingredients, real results.
          </p>
        </div>

        <div
          className="auth-shell__card"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--white)',
            borderRadius: 20,
            boxShadow: '0 1px 2px rgba(20,22,31,0.04), 0 12px 32px -12px rgba(20,22,31,0.12)',
            padding: 'var(--space-6) var(--space-5)',
          }}
        >
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--forest)', marginBottom: 6 }}>
            {title}
          </h1>
          <p style={{ color: 'var(--muted)', marginBottom: 'var(--space-6)', fontSize: 14 }}>{subtitle}</p>
          {children}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 18px', marginTop: 20 }}>
          {['Free delivery over ₦40,000', '100% natural ingredients'].map((text) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12 }}>
              <Check size={13} strokeWidth={2.4} color="var(--sage)" aria-hidden="true" /> {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Register Page ─────────────────────────────────────────────────
export function RegisterPage() {
  const { register: registerUser, loginWithGoogle, isLoading } = useAuthStore(); // adjust if your store method is named differently
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const password = watch('password');

  const onSubmit = async (data) => {
    // Remove confirmPassword before sending
    const { confirmPassword, ...payload } = data;

    const result = await registerUser(payload); // expects { name, email, password }

    if (result?.success) {
      toast.success('Account created! Welcome to Winners Health', {
        icon: <Check size={18} strokeWidth={2.5} color="var(--success)" />,
      });
      navigate('/');
    } else {
      toast.error(result?.error || 'Registration failed. Please try again.');
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
    <AuthShell title="Create account" subtitle="Join thousands of healthy Nigerians">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Google */}
         <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>or continue with email</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <Field label="Full Name" error={errors.name?.message}>
            <input
              className={`input ${errors.name ? 'error' : ''}`}
              type="text"
              placeholder="Chidi Okonkwo"
              {...register('name', {
                required: 'Full name is required',
                minLength: { value: 2, message: 'Name is too short' },
              })}
            />
          </Field>

          <Field label="Email Address" error={errors.email?.message}>
            <input
              className={`input ${errors.email ? 'error' : ''}`}
              type="email"
              placeholder="you@example.com"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email',
                },
              })}
            />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <div style={{ position: 'relative' }}>
              <input
                className={`input ${errors.password ? 'error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                style={{ paddingRight: 44 }}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' },
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

          <Field label="Confirm Password" error={errors.confirmPassword?.message}>
            <div style={{ position: 'relative' }}>
              <input
                className={`input ${errors.confirmPassword ? 'error' : ''}`}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                style={{ paddingRight: 44 }}
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === password || 'Passwords do not match',
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

          <button
            className="btn btn-primary btn-full btn-lg"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18 }} /> Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--sage-dark)', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
export default RegisterPage;