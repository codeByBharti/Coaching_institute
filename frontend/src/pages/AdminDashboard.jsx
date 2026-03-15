import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ROLES = ['ADMIN', 'TEACHER', 'STUDENT', 'ACCOUNTANT'];
const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    studentId: '',
    branch: '',
    course: '',
    batch: '',
  });
  const [newBranch, setNewBranch] = useState({ name: '', code: '', address: '', phone: '' });
  const [newCourse, setNewCourse] = useState({ name: '', code: '', branch: '', durationMonths: 12, feeAmount: 0 });
  const [newBatch, setNewBatch] = useState({ name: '', code: '', course: '', branch: '' });
  const [notifForm, setNotifForm] = useState({ scope: 'ALL', title: '', message: '' });
  const [salaryForm, setSalaryForm] = useState({
    staff: '',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'PENDING',
  });
  const [editStudent, setEditStudent] = useState(null);
  const [editStaff, setEditStaff] = useState(null);
  const [editBranch, setEditBranch] = useState(null);
  const [editCourse, setEditCourse] = useState(null);
  const [editBatch, setEditBatch] = useState(null);

  const load = async () => {
    try {
      const [s, u, b, c, bat, a, st, sal] = await Promise.all([
        axios.get('/api/admin/dashboard-summary'),
        axios.get('/api/admin/users', { params: roleFilter ? { role: roleFilter } : {} }),
        axios.get('/api/branches'),
        axios.get('/api/courses'),
        axios.get('/api/batches'),
        axios.get('/api/reports/analytics').catch(() => ({ data: null })),
        axios.get('/api/staff'),
        axios.get('/api/staff/salaries').catch(() => ({ data: [] })),
      ]);
      setSummary(s.data);
      setUsers(u.data);
      setBranches(b.data);
      setCourses(c.data);
      setBatches(bat.data);
      setAnalytics(a?.data || null);
      setStaff(st.data);
      setSalaries(sal.data);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Failed to load data');
    }
  };

  useEffect(() => { load(); }, [roleFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/users', newUser);
      setNewUser({ name: '', email: '', password: '', role: 'STUDENT', studentId: '', branch: '', course: '', batch: '' });
      load();
      alert('Student created successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create student');
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/branches', newBranch);
      setBranches((prev) => [...prev, res.data]);
      setNewBranch({ name: '', code: '', address: '', phone: '' });
      alert('Branch created successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create branch');
    }
  };

  const handleUpdateBranch = async () => {
    if (!editBranch) return;
    try {
      await axios.patch(`/api/branches/${editBranch.id}`, editBranch);
      setEditBranch(null);
      load();
      alert('Branch updated successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update branch');
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('Delete this branch? Associated data may be affected.')) return;
    try {
      await axios.delete(`/api/branches/${id}`);
      load();
      alert('Branch deleted');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete branch');
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const branchId = newCourse.branch || branches[0]?._id;
    if (!branchId) { alert('Please select a branch first'); return; }
    try {
      const res = await axios.post('/api/courses', { ...newCourse, branch: branchId });
      setCourses((prev) => [...prev, res.data]);
      setNewCourse({ name: '', code: '', branch: '', durationMonths: 12, feeAmount: 0 });
      alert('Course created successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create course');
    }
  };

  const handleUpdateCourse = async () => {
    if (!editCourse) return;
    try {
      await axios.patch(`/api/courses/${editCourse.id}`, editCourse);
      setEditCourse(null);
      load();
      alert('Course updated successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update course');
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Delete this course? Associated batches may be affected.')) return;
    try {
      await axios.delete(`/api/courses/${id}`);
      load();
      alert('Course deleted');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    const branchId = newBatch.branch || branches[0]?._id;
    const courseId = newBatch.course || courses[0]?._id;
    if (!branchId || !courseId) { alert('Please select branch and course'); return; }
    try {
      const res = await axios.post('/api/batches', { ...newBatch, branch: branchId, course: courseId });
      setBatches((prev) => [...prev, res.data]);
      setNewBatch({ name: '', code: '', course: '', branch: '' });
      alert('Batch created successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create batch');
    }
  };

  const handleUpdateBatch = async () => {
    if (!editBatch) return;
    try {
      await axios.patch(`/api/batches/${editBatch.id}`, editBatch);
      setEditBatch(null);
      load();
      alert('Batch updated successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update batch');
    }
  };

  const handleDeleteBatch = async (id) => {
    if (!window.confirm('Delete this batch?')) return;
    try {
      await axios.delete(`/api/batches/${id}`);
      load();
      alert('Batch deleted');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete batch');
    }
  };

  const handleStatusToggle = async (id, isActive) => {
    try {
      await axios.patch(`/api/admin/users/${id}/status`, { isActive: !isActive });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed to update status'); }
  };

  const handleStudentStatus = async (userId, status) => {
    try {
      await axios.patch(`/api/admin/students/${userId}/status`, { status });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
  };

  const saveStudentEdit = async () => {
    if (!editStudent) return;
    try {
      await axios.patch(`/api/admin/users/${editStudent.id}`, {
        name: editStudent.name,
        email: editStudent.email,
        studentId: editStudent.studentId,
        branch: editStudent.branch,
        course: editStudent.course,
        batch: editStudent.batch,
        status: editStudent.status,
      });
      alert('Student updated successfully');
      setEditStudent(null);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save student changes');
    }
  };

  const saveStaffEdit = async () => {
    if (!editStaff) return;
    try {
      await axios.patch(`/api/admin/users/${editStaff.id}`, {
        name: editStaff.name,
        email: editStaff.email,
        branch: editStaff.branch,
        designation: editStaff.designation,
        phone: editStaff.phone,
        batch: editStaff.batch,
      });
      alert('Staff updated successfully');
      setEditStaff(null);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save staff changes');
    }
  };

  const roleData = summary ? ROLES.map((r) => ({ name: r, value: summary.countsByRole[r] || 0 })) : [];

  return (
    <DashboardLayout role="ADMIN" activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && (
        <div className="section">
          <h3 className="section-title">Overview</h3>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{summary?.totalUsers ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Students</div>
              <div className="stat-value">{summary?.countsByRole?.STUDENT ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Teachers</div>
              <div className="stat-value">{summary?.countsByRole?.TEACHER ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Accountants</div>
              <div className="stat-value">{summary?.countsByRole?.ACCOUNTANT ?? 0}</div>
            </div>
            {analytics && (
              <div className="stat-card highlight">
                <div className="stat-label">Pending Fees (₹)</div>
                <div className="stat-value">
                  {analytics.pendingFeeAmount?.toLocaleString()}
                </div>
              </div>
            )}
            {analytics && (
              <div className="stat-card">
                <div className="stat-label">Paid This Month (₹)</div>
                <div className="stat-value">{analytics.paidThisMonth?.toLocaleString()}</div>
              </div>
            )}
          </div>
          {roleData.length > 0 && (
            <div className="chart-card">
              <h4>Users by Role</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {roleData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="chart-card">
            <h4>Create Notification</h4>
            <form
              className="form-section"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
              await axios.post('/api/notifications/broadcast', {
                  scope: notifForm.scope,
                  title: notifForm.title,
                  message: notifForm.message,
                  type: 'GENERAL',
                });
                setNotifForm({ scope: 'ALL', title: '', message: '' });
              } catch (err) {
                alert(err.response?.data?.message || 'Failed to send');
              }
              }}
            >
              <select
                value={notifForm.scope}
                onChange={(e) => setNotifForm((p) => ({ ...p, scope: e.target.value }))}
              >
                <option value="STUDENTS">Students</option>
                <option value="TEACHERS">Teachers</option>
                <option value="ACCOUNTANTS">Accountants</option>
                <option value="ALL">All (Students/Teachers/Accountants)</option>
              </select>
              <input
                placeholder="Title"
                value={notifForm.title}
                onChange={(e) => setNotifForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <input
                placeholder="Message"
                value={notifForm.message}
                onChange={(e) => setNotifForm((p) => ({ ...p, message: e.target.value }))}
                required
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'branches' && (
        <div className="section">
          <h3 className="section-title">Branches</h3>
          <form className="form-section" onSubmit={handleCreateBranch}>
            <input placeholder="Branch Name" value={newBranch.name} onChange={(e) => setNewBranch((p) => ({ ...p, name: e.target.value }))} required />
            <input placeholder="Code" value={newBranch.code} onChange={(e) => setNewBranch((p) => ({ ...p, code: e.target.value }))} required />
            <input placeholder="Address" value={newBranch.address} onChange={(e) => setNewBranch((p) => ({ ...p, address: e.target.value }))} />
            <input placeholder="Phone" value={newBranch.phone} onChange={(e) => setNewBranch((p) => ({ ...p, phone: e.target.value }))} />
            <button type="submit">Add Branch</button>
          </form>
          {editBranch && (
            <div className="chart-card">
              <h4>Edit Branch</h4>
              <div className="form-section">
                <input placeholder="Name" value={editBranch.name} onChange={(e) => setEditBranch((p) => ({ ...p, name: e.target.value }))} />
                <input placeholder="Code" value={editBranch.code} onChange={(e) => setEditBranch((p) => ({ ...p, code: e.target.value }))} />
                <input placeholder="Address" value={editBranch.address || ''} onChange={(e) => setEditBranch((p) => ({ ...p, address: e.target.value }))} />
                <input placeholder="Phone" value={editBranch.phone || ''} onChange={(e) => setEditBranch((p) => ({ ...p, phone: e.target.value }))} />
                <button type="button" onClick={handleUpdateBranch}>Save</button>
                <button type="button" onClick={() => setEditBranch(null)}>Cancel</button>
              </div>
            </div>
          )}
          <div className="data-table admin-table">
            <div className="table-row table-header">
              <div>Name</div>
              <div>Code</div>
              <div>Address</div>
              <div>Actions</div>
            </div>
            {branches.map((b) => (
              <div key={b._id} className="table-row">
                <div>{b.name}</div>
                <div>{b.code}</div>
                <div>{b.address || '-'}</div>
                <div className="action-buttons">
                  <button type="button" className="btn-edit" onClick={() => setEditBranch({ id: b._id, name: b.name, code: b.code, address: b.address, phone: b.phone })}>Edit</button>
                  <button type="button" onClick={() => handleDeleteBranch(b._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="section">
          <h3 className="section-title">Courses</h3>
          <form className="form-section" onSubmit={handleCreateCourse}>
            <input placeholder="Course Name" value={newCourse.name} onChange={(e) => setNewCourse((p) => ({ ...p, name: e.target.value }))} required />
            <input placeholder="Code" value={newCourse.code} onChange={(e) => setNewCourse((p) => ({ ...p, code: e.target.value }))} required />
            <select value={newCourse.branch} onChange={(e) => setNewCourse((p) => ({ ...p, branch: e.target.value }))}>
              <option value="">Select Branch</option>
              {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <input
              type="number"
              placeholder="Course duration (months)"
              aria-label="Course duration in months"
              value={newCourse.durationMonths}
              onChange={(e) => setNewCourse((p) => ({ ...p, durationMonths: e.target.value }))}
            />
            <input
              type="number"
              placeholder="Course fee (₹)"
              aria-label="Course fee in rupees"
              value={newCourse.feeAmount}
              onChange={(e) => setNewCourse((p) => ({ ...p, feeAmount: e.target.value }))}
            />
            <button type="submit">Add Course</button>
          </form>
          {editCourse && (
            <div className="chart-card">
              <h4>Edit Course</h4>
              <div className="form-section">
                <input placeholder="Name" value={editCourse.name} onChange={(e) => setEditCourse((p) => ({ ...p, name: e.target.value }))} />
                <input placeholder="Code" value={editCourse.code} onChange={(e) => setEditCourse((p) => ({ ...p, code: e.target.value }))} />
                <select value={editCourse.branch} onChange={(e) => setEditCourse((p) => ({ ...p, branch: e.target.value }))}>
                  <option value="">Select Branch</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <input type="number" placeholder="Fee" value={editCourse.feeAmount} onChange={(e) => setEditCourse((p) => ({ ...p, feeAmount: e.target.value }))} />
                <button type="button" onClick={handleUpdateCourse}>Save</button>
                <button type="button" onClick={() => setEditCourse(null)}>Cancel</button>
              </div>
            </div>
          )}
          <div className="data-table admin-table">
            <div className="table-row table-header">
              <div>Name</div>
              <div>Code</div>
              <div>Branch</div>
              <div>Fee</div>
              <div>Actions</div>
            </div>
            {courses.map((c) => (
              <div key={c._id} className="table-row">
                <div>{c.name}</div>
                <div>{c.code}</div>
                <div>{c.branch?.name || '-'}</div>
                <div>₹{c.feeAmount?.toLocaleString()}</div>
                <div className="action-buttons">
                  <button type="button" className="btn-edit" onClick={() => setEditCourse({ id: c._id, name: c.name, code: c.code, branch: c.branch?._id || '', feeAmount: c.feeAmount })}>Edit</button>
                  <button type="button" onClick={() => handleDeleteCourse(c._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="section">
          <h3 className="section-title">Batches</h3>
          <form className="form-section" onSubmit={handleCreateBatch}>
            <input placeholder="Batch Name" value={newBatch.name} onChange={(e) => setNewBatch((p) => ({ ...p, name: e.target.value }))} required />
            <input placeholder="Code" value={newBatch.code} onChange={(e) => setNewBatch((p) => ({ ...p, code: e.target.value }))} required />
            <select value={newBatch.course} onChange={(e) => setNewBatch((p) => ({ ...p, course: e.target.value }))}>
              <option value="">Select Course</option>
              {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select value={newBatch.branch} onChange={(e) => setNewBatch((p) => ({ ...p, branch: e.target.value }))}>
              <option value="">Select Branch</option>
              {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <button type="submit">Add Batch</button>
          </form>
          {editBatch && (
            <div className="chart-card">
              <h4>Edit Batch</h4>
              <div className="form-section">
                <input placeholder="Name" value={editBatch.name} onChange={(e) => setEditBatch((p) => ({ ...p, name: e.target.value }))} />
                <input placeholder="Code" value={editBatch.code} onChange={(e) => setEditBatch((p) => ({ ...p, code: e.target.value }))} />
                <select value={editBatch.course} onChange={(e) => setEditBatch((p) => ({ ...p, course: e.target.value }))}>
                  <option value="">Select Course</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <select value={editBatch.branch} onChange={(e) => setEditBatch((p) => ({ ...p, branch: e.target.value }))}>
                  <option value="">Select Branch</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <button type="button" onClick={handleUpdateBatch}>Save</button>
                <button type="button" onClick={() => setEditBatch(null)}>Cancel</button>
              </div>
            </div>
          )}
          <div className="data-table admin-table">
            <div className="table-row table-header">
              <div>Name</div>
              <div>Code</div>
              <div>Course</div>
              <div>Actions</div>
            </div>
            {batches.map((b) => (
              <div key={b._id} className="table-row">
                <div>{b.name}</div>
                <div>{b.code}</div>
                <div>{b.course?.name || '-'}</div>
                <div className="action-buttons">
                  <button type="button" className="btn-edit" onClick={() => setEditBatch({ id: b._id, name: b.name, code: b.code, course: b.course?._id || '', branch: b.branch?._id || '' })}>Edit</button>
                  <button type="button" onClick={() => handleDeleteBatch(b._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="section">
          <h3 className="section-title">Students</h3>
          {editStudent && (
            <div className="chart-card">
              <h4>Edit Student</h4>
              <div className="form-section">
                <input
                  placeholder="Name"
                  value={editStudent.name}
                  onChange={(e) => setEditStudent((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  placeholder="Email"
                  value={editStudent.email}
                  onChange={(e) => setEditStudent((p) => ({ ...p, email: e.target.value }))}
                />
                <input
                  placeholder="Student ID"
                  value={editStudent.studentId}
                  onChange={(e) => setEditStudent((p) => ({ ...p, studentId: e.target.value }))}
                />
                <select value={editStudent.branch} onChange={(e) => setEditStudent((p) => ({ ...p, branch: e.target.value }))}>
                  <option value="">Select Branch</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <select value={editStudent.course} onChange={(e) => setEditStudent((p) => ({ ...p, course: e.target.value }))}>
                  <option value="">Select Course</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <select value={editStudent.batch} onChange={(e) => setEditStudent((p) => ({ ...p, batch: e.target.value }))}>
                  <option value="">Select Batch</option>
                  {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <select value={editStudent.status} onChange={(e) => setEditStudent((p) => ({ ...p, status: e.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="DROPPED">Dropped</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <button type="button" onClick={saveStudentEdit}>Save</button>
                <button type="button" onClick={() => setEditStudent(null)}>Cancel</button>
              </div>
            </div>
          )}
          <form className="form-section" onSubmit={handleCreateUser}>
            <input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} required />
            <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} required />
            <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required />
            <input
              placeholder="Student ID"
              value={newUser.studentId}
              onChange={(e) => setNewUser((p) => ({ ...p, studentId: e.target.value }))}
              required
            />
            <select
              value={newUser.branch}
              onChange={(e) => setNewUser((p) => ({ ...p, branch: e.target.value }))}
              required
            >
              <option value="">Select Branch</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
            <select
              value={newUser.course}
              onChange={(e) => setNewUser((p) => ({ ...p, course: e.target.value }))}
              required
            >
              <option value="">Select Course</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <select
              value={newUser.batch}
              onChange={(e) => setNewUser((p) => ({ ...p, batch: e.target.value }))}
              required
            >
              <option value="">Select Batch</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
            <button type="submit">Create User</button>
          </form>
          <div className="data-table student-table">
            <div className="table-row table-header">
              <div>Student ID</div>
              <div>Email</div>
              <div>Branch</div>
              <div>Course</div>
              <div>Batch</div>
              <div>Fees</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            {users.filter((u) => u.role === 'STUDENT').map((u) => (
              <div key={u._id} className="table-row">
                <div>{u.studentProfile?.studentId || '-'}</div>
                <div>{u.email}</div>
                <div>{u.studentProfile?.branch?.name || '-'}</div>
                <div>{u.studentProfile?.course?.name || '-'}</div>
                <div>{u.studentProfile?.batch?.name || '-'}</div>
                <div>
                  <span className={`badge badge-${(u.feeStatus || 'NONE').toLowerCase()}`}>
                    {u.feeStatus || 'NONE'}
                  </span>
                </div>
                <div><span className={`badge badge-${u.studentProfile?.status?.toLowerCase() || 'active'}`}>{u.studentProfile?.status || 'ACTIVE'}</span></div>
                <div>
                  <div className="action-buttons">
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() =>
                        setEditStudent({
                          id: u._id,
                          name: u.name || '',
                          email: u.email || '',
                          studentId: u.studentProfile?.studentId || '',
                          branch: u.studentProfile?.branch?._id || '',
                          course: u.studentProfile?.course?._id || '',
                          batch: u.studentProfile?.batch?._id || '',
                          status: u.studentProfile?.status || 'ACTIVE',
                        })
                      }
                    >
                      Edit
                    </button>
                    <button onClick={() => handleStatusToggle(u._id, u.isActive)}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => handleDeleteUser(u._id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="section">
          <h3 className="section-title">Staff</h3>
          {editStaff && (
            <div className="chart-card">
              <h4>Edit Staff</h4>
              <div className="form-section">
                <input
                  placeholder="Name"
                  value={editStaff.name}
                  onChange={(e) => setEditStaff((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  placeholder="Email"
                  value={editStaff.email}
                  onChange={(e) => setEditStaff((p) => ({ ...p, email: e.target.value }))}
                />
                <input
                  placeholder="Phone"
                  value={editStaff.phone}
                  onChange={(e) => setEditStaff((p) => ({ ...p, phone: e.target.value }))}
                />
                <select value={editStaff.branch} onChange={(e) => setEditStaff((p) => ({ ...p, branch: e.target.value }))}>
                  <option value="">No Branch</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <select value={editStaff.batch || ''} onChange={(e) => setEditStaff((p) => ({ ...p, batch: e.target.value }))}>
                  <option value="">No Batch</option>
                  {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <input
                  placeholder="Designation"
                  value={editStaff.designation}
                  onChange={(e) => setEditStaff((p) => ({ ...p, designation: e.target.value }))}
                />
                <button type="button" onClick={saveStaffEdit}>Save</button>
                <button type="button" onClick={() => setEditStaff(null)}>Cancel</button>
              </div>
            </div>
          )}
          <form className="form-section" onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
              await axios.post('/api/staff/register', {
                name: fd.get('name'),
                email: fd.get('email'),
                password: fd.get('password'),
                role: fd.get('role'),
                branch: fd.get('branch') || undefined,
              });
              e.target.reset();
              load();
              alert('Staff registered successfully');
            } catch (err) {
              alert(err.response?.data?.message || 'Failed to register staff');
            }
          }}>
            <input name="name" placeholder="Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" required />
            <select name="role">
              <option value="TEACHER">Teacher</option>
              <option value="ACCOUNTANT">Accountant</option>
            </select>
            <select name="branch">
              <option value="">No Branch</option>
              {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <button type="submit">Register Staff</button>
          </form>
          <h4>Staff List</h4>
          <div className="data-table staff-table">
            <div className="table-row table-header">
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Branch</div>
              <div>Batch</div>
              <div>Status</div>
              <div>Action</div>
            </div>
            {staff.map((u) => (
              <div key={u._id} className="table-row">
                <div>{u.name}</div>
                <div>{u.email}</div>
                <div>{u.role}</div>
                <div>{u.staffProfile?.branch?.name || '-'}</div>
                 <div>{u.staffProfile?.batch?.name || '-'}</div>
                <div>{u.isActive ? 'Active' : 'Inactive'}</div>
                <div>
                  <div className="action-buttons">
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() =>
                        setEditStaff({
                          id: u._id,
                          name: u.name || '',
                          email: u.email || '',
                          phone: u.staffProfile?.phone || '',
                          branch: u.staffProfile?.branch?._id || '',
                          batch: u.staffProfile?.batch?._id || '',
                          designation: u.staffProfile?.designation || u.role,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button onClick={() => handleStatusToggle(u._id, u.isActive)}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => handleDeleteUser(u._id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h4>Salary Records</h4>
          <form
            className="form-section"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
              await axios.post('/api/staff/salaries', {
                staff: salaryForm.staff,
                amount: Number(salaryForm.amount),
                month: Number(salaryForm.month),
                year: Number(salaryForm.year),
                status: salaryForm.status,
              });
              setSalaryForm((p) => ({ ...p, amount: '' }));
              load();
              } catch (err) { alert(err.response?.data?.message || 'Failed'); }
            }}
          >
            <select
              value={salaryForm.staff}
              onChange={(e) => setSalaryForm((p) => ({ ...p, staff: e.target.value }))}
              required
            >
              <option value="">Select Staff</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Salary amount (₹)"
              value={salaryForm.amount}
              onChange={(e) => setSalaryForm((p) => ({ ...p, amount: e.target.value }))}
              aria-label="Salary amount in rupees"
              required
            />
            <input
              type="number"
              placeholder="Salary month (1-12)"
              value={salaryForm.month}
              onChange={(e) => setSalaryForm((p) => ({ ...p, month: e.target.value }))}
              min={1}
              max={12}
              aria-label="Salary month number"
            />
            <input
              type="number"
              placeholder="Salary year (e.g. 2026)"
              value={salaryForm.year}
              onChange={(e) => setSalaryForm((p) => ({ ...p, year: e.target.value }))}
              aria-label="Salary year"
            />
            <select
              value={salaryForm.status}
              onChange={(e) => setSalaryForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
            </select>
            <button type="submit">Add Salary</button>
          </form>

          <div className="data-table staff-table">
            <div className="table-row table-header">
              <div>Staff</div>
              <div>Amount</div>
              <div>Month</div>
              <div>Year</div>
              <div>Status</div>
            </div>
            {salaries.map((sal) => (
              <div key={sal._id} className="table-row">
                <div>{sal.staff?.name || sal.staff}</div>
                <div>₹{Number(sal.amount || 0).toLocaleString()}</div>
                <div>{sal.month}</div>
                <div>{sal.year}</div>
                <div>
                  <span className={`badge badge-${String(sal.status || 'PENDING').toLowerCase()}`}>
                    {sal.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="section">
          <h3 className="section-title">Reports</h3>
          <p><a href="/reports">Open full Reports page →</a></p>
        </div>
      )}
    </DashboardLayout>
  );
}
