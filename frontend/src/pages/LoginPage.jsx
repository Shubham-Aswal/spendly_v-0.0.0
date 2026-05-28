import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function LoginPage() {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const isSignUp = mode === 'signup';

  const title = isSignUp ? 'Create Account' : 'Welcome Back';
  const subtitle = isSignUp
    ? 'Join Spendly and start managing your money with clarity.'
    : 'Sign in to view your dashboard and keep spending on track.';
  const submitLabel = isSignUp ? 'Register' : 'Sign In';

  const canSubmit = useMemo(() => {
    if (!form.email.trim() || !form.password.trim()) return false;
    if (isSignUp) {
      if (!form.name.trim() || !form.phone.trim() || !form.confirmPassword.trim()) {
        return false;
      }
      return form.password === form.confirmPassword;
    }
    return true;
  }, [form, isSignUp]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setError('');
    setSuccess('');
  };

  const validate = () => {
    if (!form.email.trim()) return 'Email is required.';
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters.';
    if (isSignUp) {
      if (!form.name.trim()) return 'Full name is required.';
      if (!form.phone.trim()) return 'Phone number is required.';
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = isSignUp ? 'http://localhost:3000/api/auth/signup' : 'http://localhost:3000/api/auth/signin';
      const response = await axios.post(url, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
      });

      if (response?.data?.token || response?.data?.success) {
        const token = response?.data?.token;
        const user = response?.data?.user;
        if (token) {
          localStorage.setItem('spendly_token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        if (user) {
          localStorage.setItem('spendly_user', JSON.stringify(user));
        }
        setSuccess(isSignUp ? 'Account created successfully. Redirecting…' : 'Signed in successfully. Redirecting…');
        setForm(initialForm);
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Unable to complete request.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-layout">
      <div className="card-panel grid-2">
        <div className="auth-left">
          <div className="brand-header">
            <div className="brand-dot">S</div>
            <span>Spendly</span>
          </div>

          <div>
            <h1 className="hero-title">{title}</h1>
            <p className="hero-copy">{subtitle}</p>
          </div>

          <div className="tab-list" role="tablist">
            <button
              type="button"
              className={`tab-button ${!isSignUp ? 'active' : ''}`}
              onClick={() => setMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-button ${isSignUp ? 'active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <div className="field-group">
                  <label htmlFor="name">Full Name</label>
                  <input id="name" value={form.name} onChange={handleChange('name')} placeholder="John Doe" />
                </div>
                <div className="field-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" value={form.phone} onChange={handleChange('phone')} placeholder="+1 234 567 8900" />
                </div>
              </>
            )}

            <div className="field-group">
              <label htmlFor="email">Email Address</label>
              <input id="email" type="email" value={form.email} onChange={handleChange('email')} placeholder="xyz123@gmail.com" />
            </div>

            <div className="field-group password-toggle">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Enter your password"
              />
              <button type="button" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {isSignUp && (
              <div className="field-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {error && <div className="message error">{error}</div>}
            {success && <div className="message success">{success}</div>}

            <button className="submit-btn" type="submit" disabled={!canSubmit || loading}>
              {loading ? 'Working…' : submitLabel}
            </button>
          </form>

          <div className="alt-login">
            <span>Or continue with</span>
            <span className="dot" />
            <span>Google, Apple, or Facebook</span>
          </div>

          <div className="social-row">
            <div className="social-button">G</div>
            <div className="social-button"></div>
            <div className="social-button">f</div>
          </div>
        </div>

        <div className="auth-right">
          <div className="image-panel">
            <h2>Better spending starts today.</h2>
            <p>
              Switch the static frontend to a modern React experience and keep the UI ready for the next Spendly features.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
