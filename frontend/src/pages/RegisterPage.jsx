import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import axios from 'axios';

const ROLES = ['ADMIN', 'TEACHER', 'STUDENT', 'ACCOUNTANT'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    branch: '',
    batch: '',
    course: '',
  });
  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [bRes, cRes, baRes] = await Promise.all([
          axios.get('/api/public/branches'),
          axios.get('/api/public/courses'),
          axios.get('/api/public/batches'),
        ]);
        setBranches(bRes.data || []);
        setCourses(cRes.data || []);
        setBatches(baRes.data || []);
      } catch (e) {
        console.error('Failed to load registration metadata', e);
      }
    };
    loadMeta();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      const user = await register(payload);
      alert('Successfully registered');
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'TEACHER') navigate('/teacher');
      else if (user.role === 'STUDENT') navigate('/student');
      else if (user.role === 'ACCOUNTANT') navigate('/accountant');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isStudent = form.role === 'STUDENT';

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>Create an Account</h1>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Role
            <select name="role" value={form.role} onChange={handleChange}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {isStudent && (
            <>
              <label>
                Branch
                <select
                  name="branch"
                  value={form.branch}
                  onChange={handleChange}
                  required={isStudent}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Course
                <select
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  required={isStudent}
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Batch
                <select
                  name="batch"
                  value={form.batch}
                  onChange={handleChange}
                  required={isStudent}
                >
                  <option value="">Select Batch</option>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

