# UIU Alumni Portal — Real Backend REST API Contract

Base URL: `/api`  
Authentication: HttpOnly Cookie (`token`)  
Error Format: `{ "error": { "code": "STRING", "message": "STRING", "details": [ { "field": "string", "message": "string" } ] } }`

---

## Changes the Frontend Must Adopt

1. **Cookie-based Session & Authentication**:
   - Authentication tokens are stored in HttpOnly cookies (`token`). No token is returned or stored in `localStorage`.
   - Call `GET /auth/me` on page initialization to retrieve the authenticated user session.
   - On `401` or `403 ACCOUNT_*`, session ends and redirects to login.

2. **Standardized Error Format**:
   - All errors return standard JSON: `{ error: { code, message, details } }`.
   - `details` contains field-level validation errors array: `[{ field, message }]`.

3. **Admin Paginated Lists**:
   - Admin endpoints (`GET /admin/users`, `GET /admin/jobs`, `GET /donations`) return `{ items, total, page, limit }`.

4. **Event State DTO**:
   - `registeredUserIds` array is removed from public payload.
   - Events endpoints return `registeredCount` (number), `isRegistered` (boolean), and `isPast` (boolean).

5. **Job Application Multipart Payload**:
   - `POST /jobs/:id/apply` is `multipart/form-data`.
   - Fields: `cv` (PDF file, required), `portfolio` (url, optional), `github` (url, optional), `coverNote` (text, optional).

6. **Single Job Lookup**:
   - Added `GET /jobs/:id` for detailed job view.

7. **Donations Summary**:
   - Added `GET /donations/summary` for public fund cards showing total collected per fund.

8. **Password Change**:
   - Added `PUT /auth/password` (`{ currentPassword, newPassword }`).

9. **Chat Cleaned (No Attachments)**:
   - Backend chat is text-only (`{ text }`). Attachments are not supported.

---

## 1. Authentication & Session (`/auth`)

### `POST /api/auth/register`
- **Auth**: Guest
- **Body**: `{ name, email, password, role, studentId, phone?, department?, program?, graduationYear?, currentSemester?, expectedGraduation?, company?, jobTitle?, city?, linkedin? }`
- **Success (201)**: `{ "id": "uuid", "email": "...", "status": "pending", ... }`
- **Error Codes**: `400 VALIDATION_ERROR`, `409 EMAIL_EXISTS`, `409 STUDENT_ID_EXISTS`

### `POST /api/auth/login`
- **Auth**: Guest
- **Body**: `{ email, password }`
- **Success (200)**: Sets HttpOnly cookie `token`. Returns `{ "user": { "id": "...", "email": "...", "role": "...", "status": "approved" } }`
- **Error Codes**: `401 INVALID_CREDENTIALS`, `403 ACCOUNT_PENDING`, `403 ACCOUNT_REJECTED`, `403 ACCOUNT_SUSPENDED`, `429 TOO_MANY_REQUESTS`

### `GET /api/auth/me`
- **Auth**: Required (`student`, `alumni`, `admin`)
- **Success (200)**: `{ "user": { "id": "...", "email": "...", "role": "...", "name": "..." } }`
- **Error Codes**: `401 NOT_AUTHENTICATED`, `403 ACCOUNT_SUSPENDED`, `403 ACCOUNT_REJECTED`, `403 ACCOUNT_PENDING`

### `POST /api/auth/logout`
- **Auth**: Optional
- **Success (200)**: Clears `token` cookie. `{ "message": "Logged out successfully" }`

### `PUT /api/auth/password`
- **Auth**: Required
- **Body**: `{ currentPassword, newPassword }`
- **Success (200)**: `{ "message": "Password updated successfully" }`
- **Error Codes**: `400 INVALID_CREDENTIALS` (wrong current password), `400 VALIDATION_ERROR`

---

## 2. Users & Profiles (`/users`)

### `GET /api/users/stats`
- **Auth**: Guest / Public
- **Success (200)**: `{ "totalAlumni": 10, "totalStudents": 15, "activeJobs": 5, "upcomingEvents": 3 }`

### `GET /api/users/mentors`
- **Auth**: Required (`student`, `alumni`, `admin`)
- **Query**: `?q=search&department=CSE&graduationYear=2024`
- **Success (200)**: `[{ "id": "...", "name": "...", "willingToMentor": true, "mentorExpertise": [...] }]`

### `GET /api/users/:id`
- **Auth**: Optional for Alumni profile; Required (`student`, `alumni`, `admin`) for Student profile.
- **Success (200)**: `{ "id": "...", "name": "...", "role": "...", ... }`
- **Error Codes**: `404 USER_NOT_FOUND`, `403 FORBIDDEN` (guest requesting student profile)

### `PUT /api/users/:id`
- **Auth**: Required (Self profile only)
- **Body**: `{ name, phone, city, bio, department, program, graduationYear, currentSemester, expectedGraduation, company, jobTitle, github, linkedin, portfolio, website, willingToMentor, mentorExpertise, careerTimeline }`
- **Success (200)**: Returns updated user profile DTO.
- **Error Codes**: `403 FORBIDDEN` (editing another user), `400 FORBIDDEN_FIELDS` (trying to edit email/role/status/verified)

---

## 3. Mentorship (`/mentorship`)

### `GET /api/mentorship/requests`
- **Auth**: Required (`student`, `alumni`)
- **Success (200)**: `[{ "id": "...", "mentorId": "...", "requesterId": "...", "status": "pending|accepted|declined|cancelled|ended", "topic": "...", "message": "..." }]`

### `POST /api/mentorship/requests`
- **Auth**: Required (`student`, `alumni`)
- **Body**: `{ mentorId, topic, message }`
- **Success (201)**: Returns created request.
- **Error Codes**: `409 DUPLICATE_REQUEST` (active request already exists with this mentor)

### `PUT /api/mentorship/requests/:id`
- **Auth**: Required (Mentor only)
- **Body**: `{ status: "accepted" | "declined" }`
- **Success (200)**: Returns updated request.
- **Error Codes**: `403 FORBIDDEN`

### `DELETE /api/mentorship/requests/:id`
- **Auth**: Required (Requester or Mentor)
- **Success (200)**: Updates status to `cancelled` (if pending) or `ended` (if accepted).

---

## 4. Jobs (`/jobs`)

### `GET /api/jobs`
- **Auth**: Optional
- **Query**: `?q=search&type=Full-time`
- **Success (200)**: `[{ "id": "...", "title": "...", "company": "...", "hasApplied": false, ... }]`

### `GET /api/jobs/mine`
- **Auth**: Required (`alumni`)
- **Success (200)**: Posted jobs list with applicant counts and rejection reasons.

### `GET /api/jobs/applications/mine`
- **Auth**: Required (`student`)
- **Success (200)**: Student's job application history.

### `GET /api/jobs/:id`
- **Auth**: Optional
- **Success (200)**: Single job object with `hasApplied`.

### `POST /api/jobs`
- **Auth**: Required (`alumni` only)
- **Body**: `{ title, company, location, type, salary?, description, requirements?, deadline, recruiterEmail }`
- **Success (201)**: Returns created job (status `pending`).

### `POST /api/jobs/:id/apply`
- **Auth**: Required (`student`, `alumni`)
- **Body**: `multipart/form-data` with `cv` (PDF file, required), `portfolio?`, `github?`, `coverNote?`
- **Success (201)**: `{ "id": "...", "emailSent": true|false }`
- **Error Codes**: `409 ALREADY_APPLIED`, `400 CANNOT_APPLY_OWN_JOB`, `400 INVALID_FILE_TYPE`

---

## 5. Events (`/events`)

### `GET /api/events`
- **Auth**: Optional
- **Success (200)**: `[{ "id": "...", "title": "...", "capacity": 100, "registeredCount": 10, "isRegistered": false, "isPast": false }]`

### `GET /api/events/:id`
- **Auth**: Optional
- **Success (200)**: Single event DTO.

### `POST /api/events` *(Admin only)*
- **Auth**: Required (`admin`)
- **Body**: `{ title, description, date, time, venue, type, capacity? }`
- **Success (201)**: Returns created event.

### `PUT /api/events/:id` *(Admin only)*
- **Auth**: Required (`admin`)
- **Body**: Event edit fields.

### `DELETE /api/events/:id` *(Admin only)*
- **Auth**: Required (`admin`)

### `POST /api/events/:id/register`
- **Auth**: Required (`student`, `alumni`)
- **Success (200)**: Registers user.
- **Error Codes**: `409 ALREADY_REGISTERED`, `409 EVENT_FULL`, `400 EVENT_PAST`

### `DELETE /api/events/:id/register`
- **Auth**: Required (`student`, `alumni`)
- **Success (200)**: Cancels user registration.

---

## 6. Donations (`/donations`)

### `GET /api/donations/summary`
- **Auth**: Public
- **Success (200)**: `[{ "purpose": "General Fund", "total": 5000 }, ...]`

### `POST /api/donations`
- **Auth**: Required (`student`, `alumni`)
- **Body**: `{ amount, purpose, message?, isAnonymous? }`
- **Success (201)**: Created donation record.

### `GET /api/donations`
- **Auth**: Required
- **For Non-Admin**: User's own donations array.
- **For Admin**: `{ items: [...], total, totalAmount, page, limit }` (shows real donor names).

---

## 7. Chat (`/chat`)

### `GET /api/chat/conversations`
- **Auth**: Required (`student`, `alumni`)
- **Success (200)**: `[{ "userId": "...", "name": "...", "lastMessageText": "...", "lastMessageAt": "...", "unreadCount": 0 }]`

### `GET /api/chat/conversations/:userId/messages`
- **Auth**: Required (`student`, `alumni`)
- **Query**: `?after=<message_uuid>`
- **Success (200)**: `[{ "id": "...", "senderId": "...", "recipientId": "...", "text": "...", "createdAt": "..." }]`

### `POST /api/chat/conversations/:userId/messages`
- **Auth**: Required (`student`, `alumni`)
- **Body**: `{ text }`
- **Success (201)**: Created message object.

### `DELETE /api/chat/messages/:id`
- **Auth**: Required (Sender only)
- **Success (200)**: Unsends message (`text` cleared).

### `DELETE /api/chat/conversations/:userId`
- **Auth**: Required
- **Success (200)**: Clears conversation view for caller.

---

## 8. Admin Panel (`/admin`)

### `GET /api/admin/stats`
- **Auth**: Required (`admin`)
- **Success (200)**: `{ pendingApprovalsCount, totalAlumniCount, totalStudentsCount, pendingJobsCount, upcomingEventsCount, totalDonationsAmount }`

### `GET /api/admin/users`
- **Auth**: Required (`admin`)
- **Query**: `?q=search&role=student&status=pending&page=1&limit=10`
- **Success (200)**: `{ items: [...], total: 25, page: 1, limit: 10 }`

### `GET /api/admin/users/:id`
- **Auth**: Required (`admin`)
- **Success (200)**: Complete user record.

### `PUT /api/admin/users/:id`
- **Auth**: Required (`admin`)
- **Body**: `{ status: "approved"|"rejected"|"suspended"|"pending", rejectionReason?, verified? }`
- **Success (200)**: Updated user object.

### `GET /api/admin/jobs`
- **Auth**: Required (`admin`)
- **Query**: `?status=pending&page=1&limit=10`
- **Success (200)**: `{ items: [...], total: 5, page: 1, limit: 10 }`

### `PUT /api/admin/jobs/:id`
- **Auth**: Required (`admin`)
- **Body**: `{ status: "approved" | "rejected", reason? }`
- **Success (200)**: Updated job object.

### `GET /api/admin/events/:id/registrations`
- **Auth**: Required (`admin`)
- **Success (200)**: Registrants list for event.

### `GET /api/admin/events/:id/registrations.csv`
- **Auth**: Required (`admin`)
- **Success (200)**: CSV file stream.

### `GET /api/admin/donations.csv`
- **Auth**: Required (`admin`)
- **Success (200)**: CSV file stream.
