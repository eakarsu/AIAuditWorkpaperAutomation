import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

const emptyForm = { name: '', email: '', password: '', role: 'auditor' };

function UserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
      setUsers(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = editUser ? `${API_BASE}/users/${editUser.id}` : `${API_BASE}/users`;
      const method = editUser ? 'PUT' : 'POST';
      const body = { ...form };
      if (editUser && !body.password) delete body.password;

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setShowForm(false);
      setEditUser(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: getHeaders() });
      load();
    } catch (e) { console.error(e); }
  };

  const roleColor = (role) => {
    switch (role) {
      case 'admin': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
      case 'senior_auditor': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
      default: return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
    }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
      </button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-users-gear" style={{ color: '#fb923c', marginRight: 12 }}></i>User Management</h1>
          <p>Manage audit team members, roles, and access permissions</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>{users.length} Team Members</h2>
          <div className="header-actions">
            <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setEditUser(null); setShowForm(true); setError(''); }}>
              <i className="fa-solid fa-user-plus"></i> Add User
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 24px' }}>
          <div className="user-cards-grid">
            {users.map(user => {
              const rc = roleColor(user.role);
              return (
                <div key={user.id} className="user-card">
                  <div className="user-card-header">
                    <div className="user-card-avatar">{getInitials(user.name)}</div>
                    <div>
                      <div className="user-card-name">{user.name}</div>
                      <div className="user-card-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="user-card-body">
                    <div className="user-card-role">
                      <span style={{ padding: '4px 12px', borderRadius: 20, background: rc.bg, color: rc.color, fontSize: 12, fontWeight: 600 }}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="user-card-joined">
                      <i className="fa-solid fa-calendar" style={{ marginRight: 6, color: '#475569' }}></i>
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="user-card-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ name: user.name, email: user.email, password: '', role: user.role }); setEditUser(user); setShowForm(true); setError(''); }}>
                      <i className="fa-solid fa-pen"></i> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.id)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>{editUser ? 'Edit User' : 'Add New User'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
                <div className="form-group"><label>Full Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-group"><label>Email</label><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="form-group"><label>{editUser ? 'New Password (leave blank to keep current)' : 'Password'}</label><input type="password" required={!editUser} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                <div className="form-group"><label>Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="auditor">Auditor</option>
                    <option value="senior_auditor">Senior Auditor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success btn-sm"><i className="fa-solid fa-check"></i> {editUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementPage;
