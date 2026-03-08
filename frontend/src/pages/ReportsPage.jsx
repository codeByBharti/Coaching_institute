import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../AuthContext';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [attendance, setAttendance] = useState([]);
  const [batchWise, setBatchWise] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [examPerf, setExamPerf] = useState([]);
  const [feeStatus, setFeeStatus] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const load = async () => {
    const [att, bw, mon, ex, fee, rk, an] = await Promise.all([
      axios.get('/api/reports/attendance-summary').catch(() => ({ data: [] })),
      axios.get('/api/reports/attendance-batch-wise').catch(() => ({ data: [] })),
      axios.get('/api/reports/attendance-monthly').catch(() => ({ data: [] })),
      axios.get('/api/reports/exam-performance').catch(() => ({ data: [] })),
      axios.get('/api/reports/fee-status').catch(() => ({ data: [] })),
      axios.get('/api/reports/ranks').catch(() => ({ data: [] })),
      axios.get('/api/reports/analytics').catch(() => ({ data: null })),
    ]);
    setAttendance(att.data);
    setBatchWise(bw.data);
    setMonthly(mon.data);
    setExamPerf(ex.data);
    setFeeStatus(fee.data);
    setRanks(rk.data);
    setAnalytics(an?.data || null);
  };

  useEffect(() => { load(); }, []);

  const attData = (() => {
    if (!attendance.length) return [];
    const avg =
      Math.round(
        (attendance.reduce((sum, a) => sum + (a.attendancePercent || 0), 0) /
          attendance.length) * 100,
      ) / 100;
    return [{ name: 'Overall', percent: avg }];
  })();
  const examData = examPerf.slice(0, 10).map((e, i) => ({ name: `Exam ${i + 1}`, avg: Math.round(e.avgMarks) }));
  const feeData = feeStatus.map((f) => ({ name: f._id, value: f.count }));

  const role = user?.role;

  const reportTabs = [
    ...(role !== 'ACCOUNTANT'
      ? [
          { id: 'attendance', label: 'Attendance' },
          { id: 'batch', label: 'Batch-wise' },
          { id: 'monthly', label: 'Monthly' },
        ]
      : []),
    { id: 'exams', label: 'Exam Performance' },
    ...(role !== 'TEACHER' ? [{ id: 'fees', label: 'Fee Status' }] : []),
    { id: 'ranks', label: 'Ranks' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <DashboardLayout role={user?.role} activeTab="reports" onTabChange={() => {}}>
      <div className="section">
        <h3 className="section-title">Reports & Analytics</h3>
        <div className="report-tabs">
          {reportTabs.map((t) => (
            <button key={t.id} className={activeTab === t.id ? 'active' : ''} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'attendance' && (
          <div className="chart-card animate-in">
            <h4>Overall Attendance (%)</h4>
            {attData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={attData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="percent" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">No attendance data</p>
            )}
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="chart-card animate-in">
            <h4>Batch-wise Attendance</h4>
            {batchWise.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={batchWise.map((b) => ({ name: b.batch || 'N/A', percent: Math.round(b.percent || 0) }))}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="percent" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">No batch data</p>
            )}
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="chart-card animate-in">
            <h4>Overall Monthly Attendance</h4>
            {monthly.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[
                    {
                      name: 'Overall',
                      present:
                        monthly.reduce((sum, m) => sum + (m.present || 0), 0) / monthly.length,
                    },
                  ]}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="present" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">No monthly data</p>
            )}
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="chart-card animate-in">
            <h4>Exam Average Scores</h4>
            {examData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={examData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">No exam data</p>
            )}
          </div>
        )}

        {activeTab === 'fees' && (
          <div className="chart-card animate-in">
            <h4>Fee Status Distribution</h4>
            {feeData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={feeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {feeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">No fee data</p>
            )}
          </div>
        )}

        {activeTab === 'ranks' && (
          <div className="section animate-in">
            <h4>Exam Ranks</h4>
            <div className="rank-list">
              {ranks.slice(0, 20).map((r, i) => (
                <div key={r._id} className={`rank-item rank-${Math.min(i + 1, 3)}`}>
                  <span className="rank-badge">#{r.rank || i + 1}</span>
                  <span className="rank-name">{r.student?.name}</span>
                  <span className="rank-marks">{r.marksObtained} / {r.exam?.totalMarks}</span>
                  <span className="rank-exam">{r.exam?.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="stats-row animate-in">
            <div className="stat-card"><div className="stat-label">Total Students</div><div className="stat-value">{analytics.totalStudents}</div></div>
            <div className="stat-card"><div className="stat-label">Total Staff</div><div className="stat-value">{analytics.totalStaff}</div></div>
            <div className="stat-card"><div className="stat-label">Total Batches</div><div className="stat-value">{analytics.totalBatches}</div></div>
            <div className="stat-card highlight"><div className="stat-label">Pending Fees (₹)</div><div className="stat-value">{analytics.pendingFeeAmount?.toLocaleString()}</div></div>
            <div className="stat-card highlight"><div className="stat-label">Paid This Month (₹)</div><div className="stat-value">{analytics.paidThisMonth?.toLocaleString()}</div></div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
