import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const SignupPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      setAuth(data.data.user, data.data.accessToken);
      toast.success(`Welcome to Laziz, ${data.data.user.name}! 🎉`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-header">
        <button onClick={() => navigate(-1)} style={{ color: '#666' }}><ArrowLeft size={22} /></button>
      </div>

      <div className="auth-body">
        <div className="auth-logo">
          <div style={{ width: 64, height: 64, background: '#FFEBEE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🍽</div>
          <div className="auth-logo-text">LAZIZ RESTAURANT</div>
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join thousands of happy customers</p>

        <form onSubmit={handleSubmit} noValidate>
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', auto: 'name', id: 'signup-name' },
            { key: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com', auto: 'email', id: 'signup-email' },
            { key: 'phone', label: 'Mobile Number', type: 'tel', placeholder: '9876543210', auto: 'tel', id: 'signup-phone' },
          ].map(field => (
            <div className="form-group" key={field.key}>
              <label className="form-label">{field.label}</label>
              <input
                className={`form-input${errors[field.key] ? ' error' : ''}`}
                type={field.type} placeholder={field.placeholder} autoComplete={field.auto}
                value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                id={field.id}
              />
              {errors[field.key] && <div className="form-error">{errors[field.key]}</div>}
            </div>
          ))}

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className={`form-input${errors.password ? ' error' : ''}`}
                type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingRight: 44 }} id="signup-password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#999' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '15px', fontSize: 16, marginTop: 8 }} disabled={loading} id="signup-submit">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
