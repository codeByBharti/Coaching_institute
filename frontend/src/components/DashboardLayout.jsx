import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const SIDEBAR_ITEMS = {
  ADMIN: [
    { id: 'overview', label: 'Overview' },
    { id: 'branches', label: 'Branches' },
    { id: 'courses', label: 'Courses' },
    { id: 'batches', label: 'Batches' },
    { id: 'students', label: 'Students' },
    { id: 'staff', label: 'Staff' },
    { id: 'reports', label: 'Reports' },
  ],
  TEACHER: [
    { id: 'overview', label: 'Overview' },
    { id: 'live-classes', label: 'Live Classes' },
    { id: 'recorded', label: 'Recorded Lectures' },
    { id: 'homework', label: 'Homework & Notes' },
    { id: 'exams', label: 'Exams' },
    { id: 'attempted-exams', label: 'Attempted Exams' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'reports', label: 'Reports' },
  ],
  STUDENT: [
    { id: 'profile', label: 'My Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'live-classes', label: 'Live Classes' },
    { id: 'recorded', label: 'Recorded Lectures' },
    { id: 'homework', label: 'Study Material' },
    { id: 'exams', label: 'Exams' },
    { id: 'exam-results', label: 'Exam Results' },
    { id: 'fees', label: 'Fee History' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'reports', label: 'Reports' },
  ],
  ACCOUNTANT: [
    { id: 'overview', label: 'Overview' },
    { id: 'fees', label: 'Fee Management' },
    { id: 'receipts', label: 'Receipts' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'reports', label: 'Reports' },
  ],
};

export default function DashboardLayout({ children, role, activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = SIDEBAR_ITEMS[role] || [];
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-logo">EduManage</h1>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <button
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {sidebarOpen && (
            <>
              {['ADMIN', 'TEACHER', 'ACCOUNTANT', 'STUDENT'].includes(role) && (
                <Link to="/reports" className="sidebar-item">
                  <span>Reports</span>
                </Link>
              )}
              <button className="sidebar-item logout" onClick={logout}>
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </aside>
      <main className="main-content">
        <header className="main-header">
          <div>
            <h2 className="main-title">Welcome, {user?.name}</h2>
            <span className="main-subtitle">{role}</span>
          </div>
        </header>
        <div className="content-area animate-in">
          {children}
        </div>
      </main>
    </div>
  );
}
