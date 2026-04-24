import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EvidencePage from './pages/EvidencePage';
import SamplingPage from './pages/SamplingPage';
import WorkpapersPage from './pages/WorkpapersPage';
import FindingsPage from './pages/FindingsPage';
import ChecklistsPage from './pages/ChecklistsPage';
import AuditTrailPage from './pages/AuditTrailPage';
import ReportsPage from './pages/ReportsPage';
import UserManagementPage from './pages/UserManagementPage';
import Sidebar from './components/Sidebar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData.user);
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData.user));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) return null;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/evidence" element={<EvidencePage />} />
            <Route path="/sampling" element={<SamplingPage />} />
            <Route path="/workpapers" element={<WorkpapersPage />} />
            <Route path="/findings" element={<FindingsPage />} />
            <Route path="/checklists" element={<ChecklistsPage />} />
            <Route path="/audit-trail" element={<AuditTrailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
