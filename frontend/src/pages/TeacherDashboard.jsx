import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { resolveAssetUrl, isHttpUrl } from '../utils/resolveAssetUrl';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [liveClasses, setLiveClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [homework, setHomework] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [teacherBatch, setTeacherBatch] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [marksForm, setMarksForm] = useState({ examId: '', studentId: '', marksObtained: '', grade: '' });
  const [classForm, setClassForm] = useState({ title: '', subject: '', scheduledAt: '', durationMinutes: 60, provider: 'ZOOM', joinUrl: '' });
  const [examForm, setExamForm] = useState({ title: '', subject: '', totalMarks: 100, date: '', type: 'MCQ', durationMinutes: 60 });
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [newMcq, setNewMcq] = useState({ text: '', options: ['', '', '', ''], correctIndex: 0 });
  const [theoryQuestions, setTheoryQuestions] = useState([]);
  const [newTheory, setNewTheory] = useState({ text: '', maxMarks: 5 });
  const [paperExam, setPaperExam] = useState({ title: '', subject: '', totalMarks: 100, date: '', durationMinutes: 60, file: null });
  const [hwForm, setHwForm] = useState({ title: '', subject: '', description: '', s3Url: '' });
  const [attendanceForm, setAttendanceForm] = useState({ date: '', studentId: '', status: 'PRESENT' });

  const load = async () => {
    try {
      const me = await axios.get('/api/auth/me');
      setTeacherBatch(me.data.staffProfile?.batch || null);
    } catch (e) {
      console.error(e);
      return;
    }
    try {
      const [lc, ex, hw, notifs] = await Promise.all([
        axios.get('/api/teacher/live-classes'),
        axios.get('/api/teacher/exams'),
        axios.get('/api/homework'),
        axios.get('/api/notifications').catch(() => ({ data: [] })),
      ]);
      setLiveClasses(lc.data);
      setExams(ex.data);
      setHomework(hw.data);
      setNotifications(notifs.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    await axios.post('/api/teacher/live-classes', classForm);
    setClassForm({ title: '', subject: '', scheduledAt: '', durationMinutes: 60, provider: 'ZOOM', joinUrl: '' });
    load();
  };

  const handleCancelClass = async (id) => {
    await axios.patch(`/api/teacher/live-classes/${id}/cancel`);
    load();
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (examForm.type === 'MCQ' || examForm.type === 'MCQ_THEORY') {
      const minMcq = 15;
      if (mcqQuestions.length < minMcq) {
        alert(`Please add at least ${minMcq} MCQ questions.`);
        return;
      }
      if (examForm.type === 'MCQ_THEORY' && theoryQuestions.length < 20) {
        alert('Please add at least 20 theory questions.');
        return;
      }
      const questions = [
        ...mcqQuestions.map((q) => ({
          questionType: 'MCQ',
          text: q.text,
          options: q.options,
          correctOptionIndex: q.correctIndex,
        })),
        ...theoryQuestions.map((q) => ({
          questionType: 'THEORY',
          text: q.text,
          maxMarks: Number(q.maxMarks) || 0,
        })),
      ];
      await axios.post('/api/teacher/exams', {
        ...examForm,
        totalMarks: Number(examForm.totalMarks),
        durationMinutes: Number(examForm.durationMinutes) || 60,
        questions,
      });
      setExamForm({ title: '', subject: '', totalMarks: 100, date: '', type: 'MCQ', durationMinutes: 60 });
      setMcqQuestions([]);
      setTheoryQuestions([]);
      setNewMcq({ text: '', options: ['', '', '', ''], correctIndex: 0 });
      setNewTheory({ text: '', maxMarks: 5 });
      load();
    }
  };

  const handleCreateHomework = async (e) => {
    e.preventDefault();
    const url = hwForm.s3Url?.trim();
    const materialType = url && isHttpUrl(url) ? 'link' : 'link';
    await axios.post('/api/homework', { ...hwForm, s3Url: url || undefined, isPublic: true, materialType });
    setHwForm({ title: '', subject: '', description: '', s3Url: '' });
    load();
  };

  const handleMarksChange = (e) => {
    const { name, value } = e.target;
    setMarksForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitMarks = async (e) => {
    e.preventDefault();
    if (!marksForm.examId || !marksForm.studentId || !marksForm.marksObtained) return;
    await axios.post(`/api/teacher/exams/${marksForm.examId}/results`, {
      studentId: marksForm.studentId,
      marksObtained: Number(marksForm.marksObtained),
      grade: marksForm.grade || undefined,
    });
    setMarksForm({ examId: '', studentId: '', marksObtained: '', grade: '' });
  };

  const handleAttendanceChange = (e) => {
    const { name, value } = e.target;
    setAttendanceForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!attendanceForm.studentId) return;
    try {
      await axios.post('/api/teacher/attendance', {
        date: attendanceForm.date || new Date().toISOString().slice(0, 10),
        records: [{ studentId: attendanceForm.studentId.trim(), status: attendanceForm.status }],
      });
      setAttendanceForm({ date: '', studentId: '', status: 'PRESENT' });
      alert('Attendance marked successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  return (
    <DashboardLayout role="TEACHER" activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && (
        <div className="section">
          <h3 className="section-title">Overview</h3>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-label">Live Classes</div><div className="stat-value">{liveClasses.length}</div></div>
            <div className="stat-card"><div className="stat-label">Exams</div><div className="stat-value">{exams.length}</div></div>
            <div className="stat-card"><div className="stat-label">Study Material</div><div className="stat-value">{homework.length}</div></div>
            <div className="stat-card">
              <div className="stat-label">Batch</div>
              <div className="stat-value">{teacherBatch ? 1 : 0}</div>
              {teacherBatch && (
                <div className="stat-subtext">
                  {teacherBatch.name} · {teacherBatch.course?.name || ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'live-classes' && (
        <div className="section">
          <h3 className="section-title">Schedule Live Class</h3>
          <form className="form-section" onSubmit={handleCreateClass}>
            <input placeholder="Title" value={classForm.title} onChange={(e) => setClassForm((p) => ({ ...p, title: e.target.value }))} required />
            <input placeholder="Subject" value={classForm.subject} onChange={(e) => setClassForm((p) => ({ ...p, subject: e.target.value }))} required />
            <input type="datetime-local" value={classForm.scheduledAt} onChange={(e) => setClassForm((p) => ({ ...p, scheduledAt: e.target.value }))} required />
            <input
              type="number"
              placeholder="Class duration (minutes)"
              aria-label="Class duration in minutes"
              value={classForm.durationMinutes}
              onChange={(e) => setClassForm((p) => ({ ...p, durationMinutes: e.target.value }))}
            />
            <select value={classForm.provider} onChange={(e) => setClassForm((p) => ({ ...p, provider: e.target.value }))}>
              <option value="ZOOM">Zoom</option>
              <option value="GOOGLE_MEET">Google Meet</option>
            </select>
            <input placeholder="Join URL" value={classForm.joinUrl} onChange={(e) => setClassForm((p) => ({ ...p, joinUrl: e.target.value }))} required />
            <button type="submit">Create</button>
          </form>
          <h4>Upcoming Classes</h4>
          <div className="card-list">
            {liveClasses.map((c) => (
              <div key={c._id} className="content-card">
                <div className="card-title">{c.title} · {c.subject}</div>
                <div className="card-meta">
                  {new Date(c.scheduledAt).toLocaleString()} · {c.provider}
                  {c.status === 'CANCELLED' && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>Class cancelled</span>}
                </div>
                <div className="live-class-actions">
                  <a
                    href={c.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-link"
                    style={{ pointerEvents: c.status === 'CANCELLED' ? 'none' : 'auto', opacity: c.status === 'CANCELLED' ? 0.5 : 1 }}
                  >
                    Join
                  </a>
                  <button
                    type="button"
                    className="btn-link btn-cancel"
                    onClick={() => handleCancelClass(c._id)}
                    disabled={c.status === 'CANCELLED'}
                  >
                    {c.status === 'CANCELLED' ? 'Cancelled' : 'Cancel'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'recorded' && (
        <div className="section">
          <h3 className="section-title">Recorded Lectures</h3>
          <p className="muted">Upload via Classes → Recorded. Demo lectures are available for students.</p>
        </div>
      )}

      {activeTab === 'homework' && (
        <div className="section">
          <h3 className="section-title">Add Homework / Study Material</h3>
          <form className="form-section" onSubmit={handleCreateHomework}>
            <input placeholder="Title" value={hwForm.title} onChange={(e) => setHwForm((p) => ({ ...p, title: e.target.value }))} required />
            <input placeholder="Subject" value={hwForm.subject} onChange={(e) => setHwForm((p) => ({ ...p, subject: e.target.value }))} required />
            <input placeholder="Description / Problems" value={hwForm.description} onChange={(e) => setHwForm((p) => ({ ...p, description: e.target.value }))} />
            <input
              placeholder="External link (Google Drive, docs, etc.)"
              value={hwForm.s3Url}
              onChange={(e) => setHwForm((p) => ({ ...p, s3Url: e.target.value }))}
            />
            <button type="submit">Add</button>
          </form>
          <form
            className="form-section"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              await axios.post('/api/homework/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              e.target.reset();
              load();
            }}
          >
            <input name="title" placeholder="Title" required />
            <input name="subject" placeholder="Subject" required />
            <input name="description" placeholder="Description / Problems" />
            <input name="file" type="file" required />
            <button type="submit">Upload File</button>
          </form>
          <h4>Study Material</h4>
          <div className="card-list">
            {homework.map((h) => (
              <div key={h._id} className="content-card">
                <div className="card-title">{h.title} · {h.subject}</div>
                <div className="card-meta">{h.description || '-'}</div>
                <div className="action-buttons">
                  {(h.s3Url || h.url) && (
                    <a
                      href={resolveAssetUrl(h.url || h.s3Url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-link"
                    >
                      {h.materialType === 'file' || !isHttpUrl(h.s3Url || h.url) ? 'Open file' : 'Open link'}
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn-action"
                    onClick={async () => {
                      if (!window.confirm('Remove this study material?')) return;
                      await axios.delete(`/api/homework/${h._id}`);
                      load();
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'attempted-exams' && (
        <div className="section">
          <h3 className="section-title">Attempted Exams</h3>
          <button
            type="button"
            onClick={async () => {
              const res = await axios.get('/api/teacher/exam-attempts');
              setAttempts(res.data || []);
            }}
          >
            Refresh
          </button>
          <div className="data-table" style={{ marginTop: '1rem' }}>
            <div className="table-row table-header">
              <div>Student</div>
              <div>Exam</div>
              <div>Type</div>
              <div>Submitted</div>
              <div>Answer Sheet</div>
            </div>
            {attempts.map((a) => (
              <div key={a._id} className="table-row">
                <div>{a.student?.name || '-'}</div>
                <div>{a.exam?.title || '-'}</div>
                <div>{a.exam?.type || '-'}</div>
                <div>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '-'}</div>
                <div>
                  {a.answerSheetUrl ? (
                    <a href={resolveAssetUrl(a.answerSheetUrl)} target="_blank" rel="noopener noreferrer" className="btn-link">
                      Open
                    </a>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="section">
          <h3 className="section-title">Create Exam</h3>
          <form className="form-section" onSubmit={handleCreateExam}>
            <input placeholder="Title" value={examForm.title} onChange={(e) => setExamForm((p) => ({ ...p, title: e.target.value }))} required />
            <input placeholder="Subject" value={examForm.subject} onChange={(e) => setExamForm((p) => ({ ...p, subject: e.target.value }))} required />
            <input
              type="number"
              placeholder="Total marks"
              aria-label="Total marks for exam"
              value={examForm.totalMarks}
              onChange={(e) => setExamForm((p) => ({ ...p, totalMarks: e.target.value }))}
            />
            <input
              type="number"
              placeholder="Duration (minutes)"
              aria-label="Exam duration in minutes"
              value={examForm.durationMinutes}
              onChange={(e) => setExamForm((p) => ({ ...p, durationMinutes: e.target.value }))}
            />
            <input type="date" value={examForm.date} onChange={(e) => setExamForm((p) => ({ ...p, date: e.target.value }))} required />
            <select
              value={examForm.type}
              onChange={(e) => setExamForm((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="MCQ">MCQ based</option>
              <option value="UPLOAD_PAPER" disabled>Upload question paper (use form below)</option>
              <option value="MCQ_THEORY">MCQ + Theory</option>
            </select>
            <button type="submit">Create</button>
          </form>

          {(examForm.type === 'MCQ' || examForm.type === 'MCQ_THEORY') && (
            <>
              <h4>MCQ Questions (min 15, max 60)</h4>
              <form
                className="form-section"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newMcq.text.trim()) return;
                  if (mcqQuestions.length >= 60) {
                    alert('Maximum 60 MCQ questions allowed.');
                    return;
                  }
                  setMcqQuestions((prev) => [...prev, newMcq]);
                  setNewMcq({ text: '', options: ['', '', '', ''], correctIndex: 0 });
                }}
              >
                <input
                  placeholder="Question text"
                  value={newMcq.text}
                  onChange={(e) => setNewMcq((p) => ({ ...p, text: e.target.value }))}
                  required
                />
                {new Array(4).fill(0).map((_, idx) => (
                  <input
                    key={idx}
                    placeholder={`Option ${idx + 1}`}
                    value={newMcq.options[idx]}
                    onChange={(e) =>
                      setNewMcq((p) => {
                        const options = [...p.options];
                        options[idx] = e.target.value;
                        return { ...p, options };
                      })
                    }
                    required
                  />
                ))}
                <select
                  value={newMcq.correctIndex}
                  onChange={(e) =>
                    setNewMcq((p) => ({ ...p, correctIndex: Number(e.target.value) }))
                  }
                >
                  <option value={0}>Correct: Option 1</option>
                  <option value={1}>Correct: Option 2</option>
                  <option value={2}>Correct: Option 3</option>
                  <option value={3}>Correct: Option 4</option>
                </select>
                <button type="submit">Add MCQ</button>
              </form>
              <p className="muted">MCQs added: {mcqQuestions.length} / 60</p>
            </>
          )}

          {examForm.type === 'MCQ_THEORY' && (
            <>
              <h4>Theory Questions (min 20)</h4>
              <form
                className="form-section"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTheory.text.trim()) return;
                  if (theoryQuestions.length >= 20) {
                    alert('Maximum 20 theory questions allowed.');
                    return;
                  }
                  setTheoryQuestions((prev) => [...prev, newTheory]);
                  setNewTheory({ text: '', maxMarks: 5 });
                }}
              >
                <input
                  placeholder="Theory question text"
                  value={newTheory.text}
                  onChange={(e) => setNewTheory((p) => ({ ...p, text: e.target.value }))}
                  required
                />
                <input
                  type="number"
                  placeholder="Max marks"
                  value={newTheory.maxMarks}
                  onChange={(e) => setNewTheory((p) => ({ ...p, maxMarks: e.target.value }))}
                />
                <button type="submit">Add Theory Question</button>
              </form>
              <p className="muted">Theory questions added: {theoryQuestions.length} / 20</p>
            </>
          )}

          <h4>Upload Question Paper Exam</h4>
          <form
            className="form-section"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!paperExam.file) return;
              const fd = new FormData();
              fd.append('title', paperExam.title);
              fd.append('subject', paperExam.subject);
              fd.append('totalMarks', String(paperExam.totalMarks));
              fd.append('date', paperExam.date);
              fd.append('durationMinutes', String(paperExam.durationMinutes || 60));
              fd.append('file', paperExam.file);
              await axios.post('/api/teacher/exams/upload-paper', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              setPaperExam({ title: '', subject: '', totalMarks: 100, date: '', durationMinutes: 60, file: null });
              load();
            }}
          >
            <input
              placeholder="Title"
              value={paperExam.title}
              onChange={(e) => setPaperExam((p) => ({ ...p, title: e.target.value }))}
              required
            />
            <input
              placeholder="Subject"
              value={paperExam.subject}
              onChange={(e) => setPaperExam((p) => ({ ...p, subject: e.target.value }))}
              required
            />
            <input
              type="number"
              placeholder="Total marks"
              value={paperExam.totalMarks}
              onChange={(e) => setPaperExam((p) => ({ ...p, totalMarks: e.target.value }))}
              required
            />
            <input
              type="number"
              placeholder="Duration (minutes)"
              value={paperExam.durationMinutes}
              onChange={(e) => setPaperExam((p) => ({ ...p, durationMinutes: e.target.value }))}
              required
            />
            <input
              type="date"
              value={paperExam.date}
              onChange={(e) => setPaperExam((p) => ({ ...p, date: e.target.value }))}
              required
            />
            <input
              type="file"
              onChange={(e) => setPaperExam((p) => ({ ...p, file: e.target.files?.[0] || null }))}
              required
            />
            <button type="submit">Create Upload-paper Exam</button>
          </form>
          <h4>Enter Marks</h4>
          <form className="form-section" onSubmit={handleSubmitMarks}>
            <select
              name="examId"
              value={marksForm.examId}
              onChange={handleMarksChange}
              required
            >
              <option value="">Select Exam</option>
              {exams.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title} · {e.subject}
                </option>
              ))}
            </select>
            <input
              name="studentId"
              placeholder="Student user ID"
              value={marksForm.studentId}
              onChange={handleMarksChange}
              required
            />
            <input
              type="number"
              name="marksObtained"
              placeholder="Marks"
              value={marksForm.marksObtained}
              onChange={handleMarksChange}
              required
            />
            <input
              name="grade"
              placeholder="Grade (optional)"
              value={marksForm.grade}
              onChange={handleMarksChange}
            />
            <button type="submit">Save Result</button>
          </form>
          <h4>Your Exams</h4>
          <div className="card-list">
            {exams.map((e) => (
              <div key={e._id} className="content-card">
                <div className="card-title">{e.title} · {e.subject}</div>
                <div className="card-meta">{new Date(e.date).toLocaleDateString()} · {e.totalMarks} marks</div>
                <div className="action-buttons">
                  <button
                    type="button"
                    className="btn-action"
                    onClick={async () => {
                      if (!window.confirm('Remove this exam? It will be deleted from student dashboards too.')) return;
                      await axios.delete(`/api/teacher/exams/${e._id}`);
                      load();
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="section">
          <h3 className="section-title">Attendance</h3>
          <form className="form-section" onSubmit={handleAttendanceSubmit}>
            <input
              name="studentId"
              placeholder="Student ID (e.g. MAIN240001)"
              value={attendanceForm.studentId}
              onChange={handleAttendanceChange}
              required
            />
            <input
              type="date"
              name="date"
              value={attendanceForm.date}
              onChange={handleAttendanceChange}
            />
            <select
              name="status"
              value={attendanceForm.status}
              onChange={handleAttendanceChange}
            >
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>
            <button type="submit">Mark Attendance</button>
          </form>
          <p><a href="/reports">View attendance reports →</a></p>
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

      {activeTab === 'reports' && (
        <div className="section">
          <h3 className="section-title">Reports</h3>
          <p><a href="/reports">Open Reports page →</a></p>
        </div>
      )}
    </DashboardLayout>
  );
}
