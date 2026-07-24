import React, { useState } from 'react';
import { auth } from '../services/api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await auth.login(email, password);
      onLogin(data);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || '';
  const demoEnabled = import.meta.env.VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'true'
    && Boolean(demoPassword);

  const quickLogin = (userEmail) => {
    if (!demoEnabled) return;
    setEmail(userEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <div className="logo-icon">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h1>AuditPro AI</h1>
          <p>AI-Powered Audit Workpaper Automation</p>
        </div>

        {error && <div className="login-error"><i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }}></i>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div> Signing In...</>
            ) : (
              <><i className="fa-solid fa-right-to-bracket"></i> Sign In</>
            )}
          </button>
        </form>

        <div className="quick-login">
          <p>Quick Demo Access</p>
          <button className="quick-login-btn" onClick={() => quickLogin('admin@auditpro.com')} disabled={!demoEnabled}>
            <i className="fa-solid fa-user-shield"></i>
            Sarah Mitchell
            <span className="role-badge">Admin</span>
          </button>
          <button className="quick-login-btn" onClick={() => quickLogin('john@auditpro.com')} disabled={!demoEnabled}>
            <i className="fa-solid fa-user-tie"></i>
            John Anderson
            <span className="role-badge">Senior Auditor</span>
          </button>
          <button className="quick-login-btn" onClick={() => quickLogin('emily@auditpro.com')} disabled={!demoEnabled}>
            <i className="fa-solid fa-user"></i>
            Emily Chen
            <span className="role-badge">Auditor</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
