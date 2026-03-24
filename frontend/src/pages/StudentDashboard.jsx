import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const CHART_COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState({ user: null, studentProfile: null });
  const [liveClasses, setLiveClasses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [fees, setFees] = useState([]);
  const [homework, setHomework] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [examAttempts, setExamAttempts] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [answerSheetFile, setAnswerSheetFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState({
    name: '',
    phone: '',
    address: '',
    guardianName: '',
    guardianContact: '',
  });

  const applyMe = (me) => {
    setUserData({ user: me.data.user, studentProfile: me.data.studentProfile });
    setEditProfile({
      name: me.data.user?.name || '',
      phone: me.data.studentProfile?.phone || '',
      address: me.data.studentProfile?.address || '',
      guardianName: me.data.studentProfile?.guardianName || '',
      guardianContact: me.data.studentProfile?.guardianContact || '',
    });
  };

  /** Fetch one endpoint; failures don't wipe other sections (isolated errors). */
  const fetchStudentData = async (promise, fallback = []) => {
    try {
      const res = await promise;
      return res.data ?? fallback;
    } catch (e) {
      console.error('Student dashboard load:', e.response?.data || e.message || e);
      return fallback;
    }
  };

  const getDownloadFileName = (url) => {
    const s = String(url || '').split('?')[0];
    const last = s.split('/').pop() || '';
    return last || 'download';
  };

  const buildDownloadProxyUrl = (rawUrl, fileName) => {
    const src = resolveAssetUrl(rawUrl);
    const name = fileName || getDownloadFileName(src);
    const q = new URLSearchParams({ url: src, name });
    let apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    if (!apiBase) {
      try {
        apiBase = new URL(src).origin;
      } catch {
        apiBase = import.meta.env.DEV ? 'http://localhost:5000' : '';
      }
    }
    if (apiBase) return `${apiBase}/api/files/download?${q.toString()}`;
    return `/api/files/download?${q.toString()}`;
  };

  const buildOpenProxyUrl = (rawUrl, fileName) => {
    const src = resolveAssetUrl(rawUrl);
    const name = fileName || getDownloadFileName(src);
    const q = new URLSearchParams({ url: src, name });
    let apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    if (!apiBase) {
      try {
        apiBase = new URL(src).origin;
      } catch {
        apiBase = import.meta.env.DEV ? 'http://localhost:5000' : '';
      }
    }
    if (apiBase) return `${apiBase}/api/files/open?${q.toString()}`;
    return `/api/files/open?${q.toString()}`;
  };

  const triggerDownload = async (downloadUrl, fileName) => {
    try {
      const resp = await fetch(downloadUrl, { method: 'GET', credentials: 'include' });
      if (!resp.ok) {
        throw new Error(`Download failed (${resp.status})`);
      }
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      alert('Download failed. Please try again.');
    }
  };

  /** Load lists (live classes, homework, exams, etc.) — safe to call after login. */
  const loadLists = useCallback(async () => {
    const [
      lc,
      rec,
      att,
      res,
      fee,
      hw,
      notif,
      ex,
      atts,
    ] = await Promise.all([
      fetchStudentData(axios.get('/api/student/live-classes')),
      fetchStudentData(axios.get('/api/student/recorded-lectures')),
      fetchStudentData(axios.get('/api/student/attendance')),
      fetchStudentData(axios.get('/api/student/exam-results')),
      fetchStudentData(axios.get('/api/student/fee-history')),
      fetchStudentData(axios.get('/api/student/homework')),
      fetchStudentData(axios.get('/api/student/notifications')),
      fetchStudentData(axios.get('/api/student/exams')),
      fetchStudentData(axios.get('/api/student/exams/attempts')),
    ]);
    setLiveClasses(lc);
    setLectures(rec);
    setAttendance(att);
    setResults(res);
    setFees(fee);
    setHomework(hw);
    setNotifications(notif);
    setExams(ex);
    setExamAttempts(Array.isArray(atts) ? atts : []);
  }, []);

  /** Profile + auth first, then all lists. */
  const load = useCallback(async () => {
    try {
      const me = await axios.get('/api/auth/me');
      applyMe(me);
    } catch (e) {
      console.error(e);
      return;
    }
    await loadLists();
  }, [loadLists]);

  useEffect(() => {
    load();
  }, [load]);

  /** When student returns to the tab, refresh lists so new exams / classes / homework appear. */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        loadLists();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadLists]);

  // Keep Homework tab fresh so new uploads/links appear without requiring manual refresh.
  useEffect(() => {
    if (activeTab !== 'homework') return undefined;
    const id = setInterval(() => {
      loadLists();
    }, 8000);
    return () => clearInterval(id);
  }, [activeTab, loadLists]);

  const profileTabSeen = useRef(false);
  /** Refresh profile when returning to Profile tab (admin may have changed status) */
  useEffect(() => {
    if (activeTab !== 'profile') return;
    if (!profileTabSeen.current) {
      profileTabSeen.current = true;
      return;
    }
    axios.get('/api/auth/me').then(applyMe).catch(() => {});
  }, [activeTab]);

  const attendancePercent = useMemo(() => {
    if (!attendance.length) return 0;
    const present = attendance.filter((a) => a.status === 'PRESENT').length;
    return Math.round((present / attendance.length) * 100);
  }, [attendance]);

  const attendanceChartData = useMemo(() => {
    const present = attendance.filter((a) => a.status === 'PRESENT').length;
    const absent = attendance.filter((a) => a.status === 'ABSENT').length;
    const late = attendance.filter((a) => a.status === 'LATE').length;
    return [
      { name: 'Present', value: present, color: CHART_COLORS[0] },
      { name: 'Absent', value: absent, color: CHART_COLORS[1] },
      { name: 'Late', value: late, color: CHART_COLORS[2] },
    ].filter((d) => d.value > 0);
  }, [attendance]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setEditProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.patch('/api/student/profile', editProfile);
      setUserData({ user: res.data.user, studentProfile: res.data.studentProfile });
      setIsEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <DashboardLayout role="STUDENT" activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'profile' && (
        <div className="section">
          <h3 className="section-title">My Profile</h3>
          <div className="profile-card">
            <div className="profile-avatar">{userData.user?.name?.[0] || '?'}</div>
            <div className="profile-info">
              <h4>{userData.user?.name}</h4>
              <p><strong>Student ID:</strong> {userData.studentProfile?.studentId || '-'}</p>
              <p>
                <strong>Account status:</strong>{' '}
                <span className={`badge badge-${(userData.studentProfile?.status || 'ACTIVE').toLowerCase()}`}>
                  {userData.studentProfile?.status || 'ACTIVE'}
                </span>
              </p>
              <p><strong>Email:</strong> {userData.user?.email}</p>
              <p><strong>Phone:</strong> {userData.studentProfile?.phone || '-'}</p>
              <p><strong>Course:</strong> {userData.studentProfile?.course?.name || '-'}</p>
              <p><strong>Batch:</strong> {userData.studentProfile?.batch?.name || '-'}</p>
              <p><strong>Branch:</strong> {userData.studentProfile?.branch?.name || '-'}</p>
              <p>
                <strong>Joining Date:</strong>{' '}
                {userData.studentProfile?.joiningDate
                  ? new Date(userData.studentProfile.joiningDate).toLocaleDateString()
                  : '-'}
              </p>
              <p><strong>Guardian:</strong> {userData.studentProfile?.guardianName || '-'} {userData.studentProfile?.guardianContact && `(${userData.studentProfile.guardianContact})`}</p>
              <p><strong>Status:</strong> <span className={`badge badge-${userData.studentProfile?.status?.toLowerCase() || 'active'}`}>{userData.studentProfile?.status || 'ACTIVE'}</span></p>
            </div>
          </div>
          <button type="button" style={{ marginTop: '1rem' }} onClick={() => setIsEditing((v) => !v)}>
            {isEditing ? 'Close Edit' : 'Edit Profile'}
          </button>
          {isEditing && (
            <form
              className="form-section"
              onSubmit={handleProfileSave}
              style={{ marginTop: '1rem', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              <h4>Update Personal Details</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%' }}>
                <input
                  name="name"
                  placeholder="Full name"
                  value={editProfile.name}
                  onChange={handleProfileChange}
                />
                <input
                  name="phone"
                  placeholder="Phone"
                  value={editProfile.phone}
                  onChange={handleProfileChange}
                />
                <input
                  name="address"
                  placeholder="Address"
                  value={editProfile.address}
                  onChange={handleProfileChange}
                />
                <input
                  name="guardianName"
                  placeholder="Guardian name"
                  value={editProfile.guardianName}
                  onChange={handleProfileChange}
                />
                <input
                  name="guardianContact"
                  placeholder="Guardian contact"
                  value={editProfile.guardianContact}
                  onChange={handleProfileChange}
                />
              </div>
              <button type="submit">Save Profile</button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="section">
          <h3 className="section-title">Attendance</h3>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Attendance %</div>
              <div className="stat-value">{attendancePercent}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Present</div>
              <div className="stat-value">{attendance.filter((a) => a.status === 'PRESENT').length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Days</div>
              <div className="stat-value">{attendance.length}</div>
            </div>
          </div>
          {attendanceChartData.length > 0 && (
            <div className="chart-card">
              <h4>Attendance Breakdown</h4>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={attendanceChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                    {attendanceChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="data-table">
            <div className="table-row table-header"><div>Date</div><div>Status</div></div>
            {attendance.map((a) => (
              <div key={a._id} className="table-row">
                <div>{new Date(a.date).toLocaleDateString()}</div>
                <div><span className={`badge badge-${a.status?.toLowerCase()}`}>{a.status}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'live-classes' && (
        <div className="section">
          <h3 className="section-title">Upcoming Live Classes</h3>
          <div className="card-list">
            {liveClasses.map((c) => (
              <div key={c._id} className="content-card">
                <div className="card-title">{c.title} · {c.subject}</div>
                <div className="card-meta">
                  {new Date(c.scheduledAt).toLocaleString()} · {c.teacher?.name}
                  {c.status === 'CANCELLED' && (
                    <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>Class cancelled</span>
                  )}
                </div>
                {c.status !== 'CANCELLED' && (
                  <a href={c.joinUrl} target="_blank" rel="noreferrer" className="btn-link">Join</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'recorded' && (
        <div className="section">
          <h3 className="section-title">Recorded Lectures</h3>
          <div className="card-list">
            {lectures.map((l) => (
              <div key={l._id} className="content-card">
                <div className="card-title">{l.title} · {l.subject}</div>
                <div className="card-meta">{l.teacher?.name} · {l.durationMinutes} min</div>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => window.open(resolveAssetUrl(l.s3Url), '_blank')}
                >
                  Watch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'homework' && (
        <div className="section">
          <h3 className="section-title">Homework & Study Material</h3>
          <div className="card-list">
            {homework.map((h) => (
              <div key={h._id} className="content-card">
                <div className="card-title">{h.title} · {h.subject}</div>
                <div className="card-meta">
                  <div>
                    <strong>Teacher:</strong> {h.teacher?.name || '-'}
                  </div>
                  {h.description && (
                    <div>
                      <strong>Problems:</strong> {h.description}
                    </div>
                  )}
                </div>
                {(h.url || h.s3Url) && (
                  (h.type || h.materialType) === 'file' ? (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => {
                        const downloadUrl = buildDownloadProxyUrl(
                          h.url || h.s3Url,
                          h.originalFileName
                        );
                      triggerDownload(
                        downloadUrl,
                        h.originalFileName || getDownloadFileName(h.url || h.s3Url)
                      );
                      }}
                    >
                      Open file
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() =>
                        window.open(resolveAssetUrl(h.url || h.s3Url), '_blank', 'noopener,noreferrer')
                      }
                    >
                      Open link
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'exam-results' && (
        <div className="section">
          <h3 className="section-title">Exam Results</h3>
          <div className="card-list">
            {results.map((r) => (
              <div key={r._id} className="content-card">
                <div className="card-title">
                  {r.exam?.title} · {r.exam?.subject}
                  {r.exam?.createdBy?.name && (
                    <> · <span className="muted">Teacher: {r.exam.createdBy.name}</span></>
                  )}
                </div>
                <div className="card-meta">
                  {r.marksObtained} / {r.exam?.totalMarks} · Grade: {r.grade || '-'} {r.rank && `· Rank #${r.rank}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="section">
          <h3 className="section-title">Upcoming Exams</h3>
          <div className="data-table">
            <div className="table-row table-header">
              <div>Title</div>
              <div>Subject</div>
              <div>Teacher</div>
              <div>Date</div>
              <div>Total Marks</div>
              <div>Action</div>
            </div>
            {exams.map((e) => {
              const attempted = examAttempts.some((a) => String(a.exam) === String(e._id));
              return (
                <div key={e._id} className="table-row">
                  <div>{e.title}</div>
                  <div>{e.subject}</div>
                  <div>{e.createdBy?.name || '-'}</div>
                  <div>{new Date(e.date).toLocaleDateString()}</div>
                  <div>{e.totalMarks}</div>
                  <div>
                    {attempted ? (
                      <span className="badge badge-completed">Attempted</span>
                    ) : (
                      <button type="button" onClick={() => { setActiveExam(e); setExamAnswers({}); setAnswerSheetFile(null); }}>
                        Attempt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {activeExam && (
            <div className="section" style={{ marginTop: '1.5rem' }}>
              <h3 className="section-title">
                Attempt: {activeExam.title} ({activeExam.type || 'MCQ'}) · {activeExam.durationMinutes || 60} min
              </h3>
              {activeExam.type === 'UPLOAD_PAPER' && activeExam.questionPaperUrl && (
                <div style={{ width: '100%' }}>
                  <div className="muted" style={{ marginBottom: '0.5rem' }}>
                    Uploaded question paper:{' '}
                    <span className="action-buttons" style={{ marginLeft: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => {
                          const openUrl = buildOpenProxyUrl(
                            activeExam.questionPaperUrl,
                            activeExam.questionPaperOriginalFileName
                          );
                          window.open(openUrl, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => {
                          const downloadUrl = buildDownloadProxyUrl(
                            activeExam.questionPaperUrl,
                            activeExam.questionPaperOriginalFileName
                          );
                          triggerDownload(
                            downloadUrl,
                            activeExam.questionPaperOriginalFileName ||
                              getDownloadFileName(activeExam.questionPaperUrl)
                          );
                        }}
                      >
                        Download
                      </button>
                    </span>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <h4>Upload Answer Sheet</h4>
                    <input
                      type="file"
                      onChange={(e) => setAnswerSheetFile(e.target.files?.[0] || null)}
                      required
                    />
                    <button
                      type="button"
                      style={{ marginLeft: '0.5rem' }}
                      onClick={async () => {
                        if (!answerSheetFile) {
                          alert('Please upload your answer sheet before submitting.');
                          return;
                        }
                        const fd = new FormData();
                        fd.append('file', answerSheetFile);
                        await axios.post(`/api/student/exams/${activeExam._id}/attempts/upload-answer`, fd, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        alert('Exam submitted successfully.');
                        setActiveExam(null);
                        setExamAnswers({});
                        setAnswerSheetFile(null);
                        setExamAttempts((prev) => [...prev, { exam: activeExam._id }]);
                        loadLists();
                      }}
                    >
                      Submit Exam
                    </button>
                  </div>
                </div>
              )}
              {(activeExam.type === 'MCQ' || activeExam.type === 'MCQ_THEORY') && Array.isArray(activeExam.questions) && (
                <form
                  className="form-section"
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    // Ensure all questions are answered
                    const allAnswered =
                      Array.isArray(activeExam.questions) &&
                      activeExam.questions.every((q, idx) => {
                        const key = `q-${idx}`;
                        const ans = examAnswers[key];
                        if (q.questionType === 'MCQ') {
                          return typeof ans === 'number';
                        }
                        if (q.questionType === 'THEORY') {
                          return typeof ans === 'string' && ans.trim().length > 0;
                        }
                        return true;
                      });
                    if (!allAnswered) {
                      alert('Please answer all questions before submitting the exam.');
                      return;
                    }
                    axios
                      .post(`/api/student/exams/${activeExam._id}/attempts`, { answers: examAnswers })
                      .then(() => {
                        alert('Exam submitted successfully.');
                        setActiveExam(null);
                        setExamAnswers({});
                        setExamAttempts((prev) => [...prev, { exam: activeExam._id }]);
                        loadLists();
                      })
                      .catch((err) => {
                        alert(err.response?.data?.message || 'Failed to submit exam.');
                      });
                  }}
                >
                  {activeExam.questions.map((q, idx) => (
                    <div key={idx} style={{ padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid var(--border)', width: '100%' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        Q{idx + 1}. {q.text}
                      </div>
                      {q.questionType === 'MCQ' && q.options && q.options.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {q.options.map((opt, oi) => (
                            <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <input
                                type="radio"
                                name={`q-${idx}`}
                                value={oi}
                                checked={examAnswers[`q-${idx}`] === oi}
                                onChange={() =>
                                  setExamAnswers((prev) => ({
                                    ...prev,
                                    [`q-${idx}`]: oi,
                                  }))
                                }
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {q.questionType === 'THEORY' && (
                        <textarea
                          rows={3}
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          placeholder="Write your answer..."
                          value={examAnswers[`q-${idx}`] || ''}
                          onChange={(e) =>
                            setExamAnswers((prev) => ({
                              ...prev,
                              [`q-${idx}`]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                  <button type="submit">Submit Exam</button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="section">
          <h3 className="section-title">Fee History</h3>
          <div className="data-table">
            <div className="table-row table-header"><div>Amount</div><div>Status</div><div>Due Date</div><div>Receipt</div></div>
            {fees.map((f) => (
              <div key={f._id} className="table-row">
                <div>₹{f.amount?.toLocaleString()}</div>
                <div><span className={`badge badge-${f.status?.toLowerCase()}`}>{f.status}</span></div>
                <div>{new Date(f.dueDate).toLocaleDateString()}</div>
                <div>{f.status === 'PAID' && f.receiptNo ? f.receiptNo : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="section">
          <h3 className="section-title">Reports & Analytics</h3>
          <p><a href="/reports">Open full Reports page →</a></p>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="section">
          <h3 className="section-title">Notifications</h3>
          <div className="card-list">
            {notifications.map((n) => (
              <div key={n._id} className="content-card">
                <div className="card-title">{n.title}</div>
                <div className="card-meta">{n.message} · {new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
