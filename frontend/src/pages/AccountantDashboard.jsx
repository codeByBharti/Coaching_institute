import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6366f1'];

export default function AccountantDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [fees, setFees] = useState([]);
  const [feeStatus, setFeeStatus] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [form, setForm] = useState({ studentId: '', amount: '', dueDate: '', status: 'PENDING', method: 'CASH' });
  const [notifications, setNotifications] = useState([]);
  const [receiptForm, setReceiptForm] = useState({ studentId: '', amount: '', paymentDate: '' });

  const load = async () => {
    const [f, fs, a, notifs] = await Promise.all([
      axios.get('/api/accountant/fees'),
      axios.get('/api/reports/fee-status'),
      axios.get('/api/reports/analytics').catch(() => ({ data: null })),
      axios.get('/api/notifications').catch(() => ({ data: [] })),
    ]);
    setFees(f.data);
    setFeeStatus(fs.data);
    setAnalytics(a?.data || null);
    setNotifications(notifs.data || []);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/accountant/fees', { ...form, amount: Number(form.amount) });
    setForm({ studentId: '', amount: '', dueDate: '', status: 'PENDING', method: 'CASH' });
    load();
  };

  const feeChartData = feeStatus.map((f) => ({
    name: f._id,
    value: f.count,
    color: f._id === 'PAID' ? '#22c55e' : '#ef4444',
  }));

  const handleReceiptChange = (e) => {
    const { name, value } = e.target;
    setReceiptForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!receiptForm.studentId || !receiptForm.amount) return;
    await axios.post('/api/accountant/fees', {
      studentId: receiptForm.studentId,
      amount: Number(receiptForm.amount),
      dueDate: receiptForm.paymentDate || new Date().toISOString(),
      paymentDate: receiptForm.paymentDate || new Date().toISOString(),
      status: 'PAID',
      method: 'CASH',
    });
    setReceiptForm({ studentId: '', amount: '', paymentDate: '' });
    load();
  };

  return (
    <DashboardLayout role="ACCOUNTANT" activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && (
        <div className="section">
          <h3 className="section-title">Overview</h3>
          <div className="stats-row">
            {analytics && (
              <>
                <div className="stat-card"><div className="stat-label">Pending Fees (₹)</div><div className="stat-value">{analytics.pendingFeeAmount?.toLocaleString()}</div></div>
                <div className="stat-card highlight"><div className="stat-label">Paid This Month (₹)</div><div className="stat-value">{analytics.paidThisMonth?.toLocaleString()}</div></div>
              </>
            )}
            <div className="stat-card"><div className="stat-label">Total Records</div><div className="stat-value">{fees.length}</div></div>
            <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value">{fees.filter((f) => f.status === 'PENDING').length}</div></div>
          </div>
          {feeChartData.length > 0 && (
            <div className="chart-card">
              <h4>Fee Status Distribution</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={feeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {feeChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="section">
          <h3 className="section-title">Create Fee Record</h3>
          <form className="form-section" onSubmit={handleSubmit}>
            <input
              placeholder="Student ID (e.g. MAIN240001)"
              value={form.studentId}
              onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
              required
            />
            <input
              type="number"
              placeholder="Fee amount (₹)"
              aria-label="Fee amount in rupees"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              required
            />
            <input
              type="date"
              placeholder="Due date"
              aria-label="Fee due date"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              required
            />
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online</option>
            </select>
            <button type="submit">Save</button>
          </form>
          <h4>Fee Records</h4>
          <div className="data-table admin-table">
            <div className="table-row table-header"><div>Student</div><div>Amount</div><div>Status</div><div>Due Date</div><div>Receipt</div></div>
            {fees.map((f) => (
              <div key={f._id} className="table-row">
                <div>{f.student?.name || f.student?._id}</div>
                <div>₹{f.amount?.toLocaleString()}</div>
                <div><span className={`badge badge-${f.status?.toLowerCase()}`}>{f.status}</span></div>
                <div>{new Date(f.dueDate).toLocaleDateString()}</div>
                <div>{f.receiptNo || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'receipts' && (
        <div className="section">
          <h3 className="section-title">Receipts</h3>
          <form className="form-section" onSubmit={handleReceiptSubmit}>
            <input
              name="studentId"
              placeholder="Student ID (e.g. MAIN240001)"
              value={receiptForm.studentId}
              onChange={handleReceiptChange}
              required
            />
            <input
              name="amount"
              type="number"
              placeholder="Receipt amount (₹)"
              value={receiptForm.amount}
              onChange={handleReceiptChange}
              required
            />
            <input
              name="paymentDate"
              type="date"
              placeholder="Payment date"
              value={receiptForm.paymentDate}
              onChange={handleReceiptChange}
            />
            <button type="submit">Create Receipt</button>
          </form>
          <p className="muted">Receipts are generated as PAID fee records. Receipt number format: RCPYYMMXXXX</p>
          <div className="data-table admin-table">
            <div className="table-row table-header"><div>Receipt No</div><div>Student</div><div>Amount</div><div>Date</div></div>
            {fees.filter((f) => f.receiptNo).map((f) => (
              <div key={f._id} className="table-row">
                <div>{f.receiptNo}</div>
                <div>{f.student?.name}</div>
                <div>₹{f.amount?.toLocaleString()}</div>
                <div>{f.paymentDate ? new Date(f.paymentDate).toLocaleDateString() : '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="section">
          <h3 className="section-title">Reports</h3>
          <p><a href="/reports">Open Reports page →</a></p>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="section">
          <h3 className="section-title">Notifications</h3>
          <div className="card-list">
            {notifications.map((n) => (
              <div key={n._id} className="content-card">
                <div className="card-title">{n.title}</div>
                <div className="card-meta">
                  {n.message} · {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {notifications.length === 0 && <p className="muted">No notifications yet.</p>}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
