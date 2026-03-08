# Coaching Institute Management System

Full-stack management system for a coaching institute with **student management, fee tracking, attendance, exams, live classes, recorded lectures, role-based dashboards, and reports**.

Stack:
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT auth, AWS S3 (for videos)
- **Web Frontend**: React + Vite, React Router, Recharts
- **Mobile App**: React Native (Expo) companion app for quick access

---

## Features

- **Roles**: Admin (Owner), Teacher, Student, Accountant
- **Auth**:
  - Email/password login & register
  - JWT-based authentication with role stored in token
  - `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- **Admin**:
  - Manage staff & students, create users of any role
  - Activate / deactivate user access
  - Overview of user counts per role
- **Teacher**:
  - Schedule **live classes** with Zoom / Google Meet links
  - Create exams and record results
  - Mark attendance for students
- **Student**:
  - See upcoming live classes (Zoom/Meet join links)
  - Watch recorded lectures (AWS S3 URLs)
  - View attendance history & percentage
  - View exam results
  - View notifications
- **Accountant**:
  - Manage fee records for students (status: Pending, Paid, Overdue)
  - See fee summary
- **Reports** (charts via Recharts):
  - Attendance percentage per student
  - Average exam scores per exam
  - Fee status distribution (Pending / Paid / Overdue)
- **Recorded Lectures**:
  - Upload video files to AWS S3 via backend
  - Store metadata and secure URLs in MongoDB
- **Notifications**:
  - Admin can send notifications to users
  - Students can view and mark notifications as read

---

## Project Structure

```text
CoachingS/
  backend/       # Node/Express API + MongoDB
  frontend/      # React web app (Vite)
  mobile/        # React Native (Expo) app
```

---

## Backend Setup (`backend/`)

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create `.env` file (based on `.env.example`):

```bash
cp .env.example .env
```

Set at least:

- `MONGODB_URI` – your MongoDB connection string
- `JWT_SECRET` – a strong secret string
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` – for S3 uploads

3. Run MongoDB (local or Atlas), then start the API:

```bash
npm run dev
```

The backend will run at `http://localhost:5000`.

### Key API Endpoints (High-Level)

- **Auth**
  - `POST /api/auth/register` – register user (role: ADMIN/TEACHER/STUDENT/ACCOUNTANT)
  - `POST /api/auth/login` – login, returns `{ token, user }`
  - `GET /api/auth/me` – get current user profile (+ student profile if student)

- **Admin**
  - `POST /api/admin/users` – create user (any role)
  - `GET /api/admin/users?role=ROLE` – list users (optional role filter)
  - `PATCH /api/admin/users/:id/status` – activate/deactivate user
  - `GET /api/admin/dashboard-summary` – counts by role

- **Teacher**
  - `POST /api/teacher/live-classes` – create live class (Zoom/Meet link)
  - `GET /api/teacher/live-classes` – list teacher’s classes
  - `POST /api/teacher/exams` – create exam
  - `GET /api/teacher/exams` – list exams
  - `POST /api/teacher/exams/:examId/results` – upsert exam result per student
  - `POST /api/teacher/attendance` – mark attendance for students

- **Student**
  - `GET /api/student/live-classes`
  - `GET /api/student/recorded-lectures`
  - `GET /api/student/attendance`
  - `GET /api/student/exam-results`
  - `GET /api/student/notifications`

- **Accountant**
  - `POST /api/accountant/fees`
  - `PATCH /api/accountant/fees/:id`
  - `GET /api/accountant/fees`

- **Classes / Lectures**
  - `GET /api/classes/live` – public upcoming classes
  - `GET /api/classes/recorded` – list recorded lectures
  - `POST /api/classes/recorded` – add lecture (when S3 URL is already known)
  - `POST /api/classes/recorded/upload` – upload video (multipart `video` field) to S3 and create lecture

- **Reports**
  - `GET /api/reports/attendance-summary`
  - `GET /api/reports/exam-performance`
  - `GET /api/reports/fee-status`

- **Notifications**
  - `POST /api/notifications` – admin sends notification to a user
  - `GET /api/notifications` – current user notifications

---

## Web Frontend Setup (`frontend/`)

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the dev server:

```bash
npm run dev
```

By default, Vite runs on `http://localhost:5173` and proxies `/api` to `http://localhost:5000`.

### Web App Highlights

- **Auth pages**:
  - `LoginPage` – email/password login
  - `RegisterPage` – registration with role selection; student extra fields (batch, course, roll no.)
- **Role-based dashboards**:
  - `AdminDashboard` – user management, status control, quick overview
  - `TeacherDashboard` – create live classes & exams, see upcoming classes & exams
  - `StudentDashboard` – attendance %, live classes, recorded lectures, exam results, notifications
  - `AccountantDashboard` – fee creation & list with quick summary
- **Reports**:
  - `ReportsPage` – attendance, exam, and fee charts via Recharts
- **Navigation**:
  - Role-based redirects on login/register
  - Protected routes based on JWT and role

---

## Mobile App Setup (`mobile/`)

The mobile app is a **simple React Native (Expo) companion** that logs in and shows basic role info.

1. Install Expo CLI globally (if not already):

```bash
npm install -g expo-cli
```

2. Install mobile dependencies:

```bash
cd mobile
npm install
```

3. Make sure the backend is running and reachable from the device/emulator.

   In `mobile/App.js`, the base URL is:

```js
const API_BASE_URL = 'http://10.0.2.2:5000'; // Android emulator -> host machine
```

- For Android emulator: `10.0.2.2` is correct.
- For iOS simulator: use `http://localhost:5000`.
- For physical device: replace with your PC’s LAN IP, e.g. `http://192.168.1.10:5000`.

4. Start the app:

```bash
npm start
```

Scan the QR code with the Expo Go app (or run in emulator).

---

## Next Steps / Customization

- Add richer mobile screens for:
  - Upcoming classes, attendance view, exam results, and fee status
- Plug in real Zoom / Google Meet API integrations (currently you paste links)
- Harden security (password rules, rate limiting, audit logs)
- Add pagination, search, and filters on admin/user and fee lists

