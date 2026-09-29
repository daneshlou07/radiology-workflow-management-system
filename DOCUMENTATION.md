# HealthGrid IQ — Complete System Documentation

**Version**: 1.0.0
**Platform**: Clinical Imaging & Diagnostic Platform
**Owner**: Theta Edge Berhad — Technology & Telecommunication
**Last Updated**: July 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Complete Workflow](#2-complete-workflow)
3. [User Roles & Responsibilities](#3-user-roles--responsibilities)
4. [Project Structure](#4-project-structure)
5. [State Management & Data Flow](#5-state-management--data-flow)
6. [Key Components Guide](#6-key-components-guide)
7. [AI Scheduler Deep Dive](#7-ai-scheduler-deep-dive)
8. [Security Guide](#8-security-guide)
9. [Common Maintenance Tasks](#9-common-maintenance-tasks)
10. [Troubleshooting](#10-troubleshooting)
11. [Deployment Guide](#11-deployment-guide)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. System Overview

HealthGrid IQ is a full-stack single-page application (SPA) that manages the lifecycle of diagnostic imaging cases — from a doctor's referral to a finalized radiological report.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 (TypeScript strict mode) |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 (custom design tokens) |
| Routing | React Router v6 |
| State | React Context API + localStorage |
| Database | Firebase Firestore (mock fallback) |
| Auth | Firebase Auth (mock fallback) |
| Maps | Leaflet + Google Maps Platform (with OSRM fallback) |
| Icons | Lucide React |

### How Data Persistence Works

The app runs in **demo mode** by default (no Firebase config needed). All data is:
1. Loaded from mock arrays on first visit (`src/services/mockData.ts`)
2. Stored in `localStorage` under key `healthgrid_data`
3. Synced across browser tabs via `BroadcastChannel` API
4. Debounced (300ms) to avoid excessive writes

**To reset all data**: Open browser console → `localStorage.clear()` → refresh page.

---

## 2. Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLINICAL WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────┐    ┌──────────────────┐    ┌───────────────────┐      │
│  │  DOCTOR  │───▶│ RADIOLOGY DEPT   │───▶│  ADMINISTRATOR    │      │
│  │          │    │                  │    │                   │      │
│  │ 1. Register  │ 2. Receives       │    │ 3. AI Scheduler   │      │
│  │    Patient   │    referral       │    │    assigns:       │      │
│  │ 2. Create    │    into system    │    │    • Centre       │      │
│  │    Referral  │ 3. Monitors       │    │    • Radiographer  │      │
│  │          │    │    pipeline      │    │    • Appointment   │      │
│  └──────────┘    └──────────────────┘    └───────────────────┘      │
│                                                     │                │
│                                                     ▼                │
│  ┌──────────┐    ┌──────────────────┐    ┌───────────────────┐      │
│  │  DOCTOR  │◀───│   RADIOLOGIST    │◀───│  RADIOGRAPHER     │      │
│  │          │    │                  │    │                   │      │
│  │ 6. Views     │ 5. Reviews scan   │    │ 4. Performs scan   │      │
│  │    report    │    Writes report  │    │    Uploads images  │      │
│  │    Shows to  │    Signs off      │    │    Status: SCANNED │      │
│  │    patient   │    Status: FINAL  │    │                   │      │
│  └──────────┘    └──────────────────┘    └───────────────────┘      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Case Status Flow

```
CREATED ──▶ SCHEDULED ──▶ SCANNED ──▶ FINALIZED
   │              │            │            │
   │              │            │            └── Report signed by Radiologist
   │              │            └── Scan uploaded by Radiographer
   │              └── Admin confirmed via AI Scheduler
   └── Doctor/Dept created the referral
```

### Step-by-Step

| Step | Who | Action | Status Change |
|------|-----|--------|---------------|
| 1 | Doctor | Registers patient in Patient Registry | — |
| 2 | Doctor OR Radiology Dept | Creates imaging referral | → CREATED |
| 3 | Radiology Dept | Monitors that the case enters the queue | — |
| 4 | Administrator | Opens AI Scheduler → selects case → system recommends centre + radiographer → admin confirms | → SCHEDULED |
| 5 | Radiographer | Performs imaging → uploads scan images | → SCANNED |
| 6 | Radiologist | Reviews images → writes findings + impression → signs off report | → FINALIZED |
| 7 | Doctor | Views finalized report → discusses with patient | — |

---

## 3. User Roles & Responsibilities

### Doctor
**Purpose**: Primary care physician who requests diagnostic imaging.

| Module | What it does |
|--------|------|
| Dashboard | Stats overview: total cases, pending, scheduled, completed |
| My Cases | All cases this doctor created — with tab filters |
| Reports | View/print finalized diagnostic reports |
| Patients | Patient list with clickable profiles |
| New Referral | Create imaging request (disease, modality, body region, severity) |
| Register Patient | Add new patient with MyKad NRIC auto-extraction |
| My Requests | Submit profile update requests for admin approval |

### Radiographer
**Purpose**: Performs diagnostic scans (X-Ray, CT, MRI, Ultrasound).

| Module | What it does |
|--------|------|
| Dashboard | Today's stats: scheduled, completed, pending upload |
| My Schedule | Calendar view of assigned appointments |
| My Cases | Scan queue — cases assigned to this radiographer |
| Upload Scans | Upload images → case status changes to SCANNED |
| Onboarding | License verification, certifications checklist |

### Radiologist
**Purpose**: Reviews scanned images and writes diagnostic reports.

| Module | What it does |
|--------|------|
| Dashboard | Pending reports, SLA compliance %, overdue count |
| Inbox | Cases awaiting report (sorted by urgency/severity) |
| Imaging Completed | All signed reports |
| Onboarding | Medical license, board certification checklist |

### Radiology Department
**Purpose**: Clinical operations staff — receives referrals, monitors pipeline, flags delays.

| Module | What it does |
|--------|------|
| Dashboard | Case stats + overdue SLA alerts |
| Register New Case | Input referrals received from doctors at the counter |
| Track Status | 4-column Kanban: Pending → Scheduled → Imaging Done → Finalized |
| Cases | Full case list with tabs and search |

### Administrator
**Purpose**: System administrator — full CRUD, AI Scheduler, system configuration.

| Module | What it does |
|--------|------|
| Dashboard | System overview + pending scheduling alerts |
| User Management | Create/edit/activate/deactivate/delete users |
| Clinic Management | Create/edit/activate/deactivate/delete clinics |
| Imaging Equipment | Register/edit/assign/maintenance/delete mobile PACS vans |
| Patient Registry | View/edit/archive/restore patient records |
| Patient Requests | Approve/reject doctor-submitted profile changes |
| AI Scheduler | Map-based scheduling: patient → route → radiographer → confirm |
| Analytics | Case metrics, modality breakdown, processing stats |
| Announcements | Create/publish/edit/delete system announcements |
| System Settings | Firebase connection, security config |
| Audit Trail | Immutable log of all system events (read-only) |
| Recycle Bin | Restore or permanently delete soft-deleted items |
| Infrastructure | Service status, API health, storage breakdown |

---

## 4. Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Top bar: search, notifications, profile dropdown
│   │   ├── Sidebar.tsx         # Role-based navigation with grouped sections
│   │   └── MainLayout.tsx      # Shell: sidebar + header + content + suspense
│   ├── scheduling/
│   │   └── RadiograperSelector.tsx  # AI Scheduler radiographer card + scoring
│   ├── ui/
│   │   ├── CaseLink.tsx        # Clickable case number → /case/:id
│   │   ├── Modal.tsx           # Reusable modal with size variants
│   │   ├── PatientLink.tsx     # Clickable patient name → /patient/:id
│   │   ├── SeverityBadge.tsx   # Mild/Moderate/Severe/Critical badge
│   │   ├── StatsCard.tsx       # Dashboard stat card with icon
│   │   ├── StatusBadge.tsx     # CREATED/SCHEDULED/SCANNED/FINALIZED badge
│   │   └── TabFilter.tsx       # Horizontal tab filter bar
│   └── ux/
│       ├── Breadcrumb.tsx      # Auto-generated route breadcrumb
│       ├── ConfirmDialog.tsx   # Promise-based confirm modal (replaces window.confirm)
│       ├── EmptyState.tsx      # Placeholder for empty lists
│       ├── EnhancedDataTable.tsx  # Sort, paginate, column toggle, CSV export
│       ├── ErrorBoundary.tsx   # Crash recovery with retry button
│       ├── KeyboardShortcuts.tsx  # Press ? for shortcuts overlay
│       ├── LoadingButton.tsx   # Button with spinner state
│       ├── SearchPalette.tsx   # Ctrl+K command palette
│       ├── SessionTimeout.tsx  # 30-min inactivity warning
│       └── Toast.tsx           # Global notification toasts
├── context/
│   ├── AuthContext.tsx         # Login/logout, role-based session
│   ├── DataContext.tsx         # Central state: all entities + persistence + sync
│   └── NotificationContext.tsx # In-app notifications (bell icon)
├── pages/
│   ├── admin/                  # All admin pages (12 modules)
│   ├── department/             # Radiology Dept pages (4 modules)
│   ├── doctor/                 # Doctor pages (7 modules)
│   ├── radiographer/           # Radiographer pages (5 modules)
│   ├── radiologist/            # Radiologist pages (5 modules)
│   ├── shared/                 # CaseDetail, PatientDetail, NotFound
│   ├── DashboardRouter.tsx     # Routes to correct dashboard by role
│   └── LoginPage.tsx           # Auth + forgot password flow
├── services/
│   ├── dataService.ts          # CRUD functions (Firestore or mock)
│   ├── firebase.ts             # Lazy Firebase initialization
│   ├── mockData.ts             # All demo data (patients, cases, clinics, etc.)
│   └── routingService.ts       # Geocoding + OSRM routing + Haversine
├── types/
│   └── index.ts                # All TypeScript interfaces and enums
├── utils/
│   └── sanitize.ts             # Input sanitization (XSS, CSV injection)
├── App.tsx                     # Root: providers + lazy routes
├── main.tsx                    # ReactDOM entry point
└── index.css                   # Tailwind + component classes
```

---

## 5. State Management & Data Flow

### DataContext (src/context/DataContext.tsx)

This is the **single source of truth** for all entity data. Every page reads from here.

```typescript
// Reading data (in any component):
const { cases, patients, clinics, users, reports } = useData();

// Creating data:
await addCase({ ...caseData });        // Adds to state + persists
await addPatient({ ...patientData });

// Updating data:
await editCase(id, { status: 'SCHEDULED' });
await editPatient(id, { phone: '...' });

// Deleting data (soft delete):
softDelete('clinic', clinicId, currentUserName);
// Item moves to trash[] and is removed from clinics[]

// Restoring:
restoreFromTrash(trashItemId);

// Permanent delete:
permanentDelete(trashItemId);
```

### Data Persistence Chain

```
User Action (e.g., creates a case)
    ↓
DataContext mutation (addCase)
    ↓
React state update (setCases)
    ↓
useEffect fires (debounced 300ms)
    ↓
localStorage.setItem('healthgrid_data', JSON.stringify(allState))
    ↓
BroadcastChannel.postMessage('DATA_UPDATED')
    ↓
Other tabs receive message → reload from localStorage
```

### Key Storage Keys

| Key | What it stores |
|-----|------|
| `healthgrid_data` | All entities (users, cases, patients, etc.) |
| `healthgrid_user` | Currently logged-in user |
| `healthgrid_last_login` | Last login timestamp |
| `healthgrid_comments` | Case communication threads |
| `healthgrid_recent` | Recently viewed items (max 10) |
| `healthgrid_trash` | Soft-deleted items (recycle bin) |
| `healthgrid_profile_pic_<userId>` | Base64 profile picture |
| `healthgrid_login_attempts` | Failed login counter |
| `healthgrid_login_lock` | Lockout timestamp |

---

## 6. Key Components Guide

### Adding a New Page

1. Create file: `src/pages/<role>/NewPage.tsx`
2. Add lazy import in `src/App.tsx`:
   ```typescript
   const NewPage = lazy(() => import('./pages/<role>/NewPage'));
   ```
3. Add route inside the `<Route element={<MainLayout />}>` block:
   ```typescript
   <Route path="/new-page" element={<ProtectedRoute allowedRoles={['Administrator']}><NewPage /></ProtectedRoute>} />
   ```
4. Add to sidebar: `src/components/layout/Sidebar.tsx` → find the role's `getNavGroups` section

### Adding a New Entity Type

1. Define the interface in `src/types/index.ts`
2. Add mock data in `src/services/mockData.ts`
3. Add CRUD functions in `src/services/dataService.ts`
4. Add state + mutations in `src/context/DataContext.tsx`
5. Add to the `PersistedData` interface and `saveToStorage`/`loadFromStorage`

### Modifying the Design System

- **Colors**: `tailwind.config.js` → `theme.extend.colors`
- **Component classes**: `src/index.css` → `@layer components`
- **Shadows/borders**: `tailwind.config.js` → `theme.extend.boxShadow`
- **Key classes**: `btn-primary`, `btn-secondary`, `card`, `input-field`, `select-field`, `badge-*`, `table-header`, `table-cell`, `page-title`, `page-subtitle`, `section-title`

---

## 7. AI Scheduler Deep Dive

**File**: `src/pages/department/AISchedulerMap.tsx`

### How It Works

1. **Case Selection**: Shows all cases with status `CREATED`
2. **Patient Geocoding**: If patient has no lat/lng, geocodes their address via:
   - Nominatim API (5s timeout)
   - Keyword fallback (Malaysian locations)
3. **Nearest Clinic**: Haversine distance calculation across all active clinics
4. **Route Calculation**: OSRM API with simulated polyline fallback
5. **Radiographer Scoring**: Algorithm considers:
   - Modality certification match
   - Days until earliest available slot
   - Current workload ratio
   - Leave status
6. **Admin Confirmation**: Reviews recommendation → confirms → case status → SCHEDULED

### Scoring Algorithm (`RadiograperSelector.tsx`)

```typescript
score = (daysAway * 100) + (workloadRatio * 50)
// Lower score = better candidate
// Infinity = ineligible (on leave or wrong modality)
```

### Geocoding Service (`routingService.ts`)

Priority order:
1. Nominatim (live geocoding — requires internet)
2. Keyword matching (27+ Malaysian locations hardcoded)
3. Central Selangor fallback with random offset

---

## 8. Security Guide

### Current Security Measures

| Feature | Implementation |
|---------|------|
| Role-Based Access | `ProtectedRoute` component checks `allowedRoles` prop |
| Immutable Audit Logs | `audit_logs` can only be appended, never updated/deleted |
| Login Rate Limiting | 5 attempts → 60s lockout (localStorage-based) |
| Session Timeout | 30 min inactivity → auto-logout |
| Soft Delete | Items go to Recycle Bin, not permanently deleted |
| Report Locking | Signed reports cannot be modified |
| Input Sanitization | `src/utils/sanitize.ts` — HTML escape, CSV injection prevention |
| Firestore Rules | `firestore.rules` — full RBAC defined |

### Security Risks to Monitor

| Risk | Current Status | How to Fix |
|------|------|------|
| No real password hashing | Passwords not validated (demo mode) | Connect Firebase Auth |
| localStorage is client-side | Anyone with DevTools can modify data | Use Firestore with security rules |
| No HTTPS enforcement | Dev server is HTTP | Deploy behind HTTPS (automatic on Firebase Hosting) |
| Profile pics as base64 | Could be large, stored in localStorage | Move to Firebase Storage |
| Reset token is client-side | Simulated — not cryptographically secure | Implement server-side token generation |
| No CORS restrictions | Not applicable in SPA mode | Configure Firebase functions if adding API |

### When Connecting Real Firebase

1. Fill in `.env` from `.env.example`
2. The app will automatically switch from mock data to Firestore (check `isFirebaseConfigured()` in `firebase.ts`)
3. Deploy `firestore.rules` via Firebase CLI: `firebase deploy --only firestore:rules`
4. Enable Firebase Auth → Email/Password provider
5. Create users in Firebase Console matching mock user emails

---

## 9. Common Maintenance Tasks

### Adding a New Mock Patient

File: `src/services/mockData.ts`

```typescript
{
  id: 'patient-XXX',
  name: 'Patient Name',
  dob: '1990-01-15',
  gender: 'Male',
  phone: '+60 12-345-6789',
  email: 'email@example.com',
  address: 'Full address, City, Postcode State',
  medicalHistory: ['Condition 1', 'Condition 2'],
  nric: '900115-10-1234',
  mrn: 'MRN-2026-XXXX',
},
```

### Adding a New Clinic

File: `src/services/mockData.ts` → `mockClinics` array

Also add to geocoding fallback in `src/services/routingService.ts` → `locations` array (if it's a new area).

### Changing the Color Theme

File: `tailwind.config.js`

```javascript
colors: {
  navy: { 600: '#1B2B5B', ... },    // Primary
  purple: { 500: '#8B2F8F', ... },   // Accent
  emerald: { 500: '#10B981', ... },  // Success/Green
  surface: { ... },                   // Neutrals
}
```

### Resetting Demo Data

In browser console:
```javascript
localStorage.clear();
location.reload();
```

### Adding a New Route

1. Create the page component
2. In `src/App.tsx`, add a lazy import:
   ```typescript
   const MyPage = lazy(() => import('./pages/admin/MyPage'));
   ```
3. Add the `<Route>` inside the MainLayout block
4. Add sidebar link in `src/components/layout/Sidebar.tsx`

---

## 10. Troubleshooting

### "Page Not Found" on first load
**Cause**: Browser cached old version without the `/` → `/dashboard` redirect.
**Fix**: Hard refresh (Ctrl+Shift+R) or clear browser cache.

### "Something went wrong" error boundary
**Cause**: A component threw during render (likely a data issue).
**Fix**: Click "Retry". If persistent, check browser console for the error message. Usually caused by accessing a property on `undefined` (e.g., deleted entity still referenced somewhere).

### Data not syncing between pages
**Cause**: The page uses old `dataService` imports instead of `useData()`.
**Fix**: Change the page to import `useData` from DataContext. Look for patterns like:
```typescript
// BAD (doesn't sync):
import { getCases } from '../../services/dataService';
useEffect(() => { getCases().then(setCases); }, []);

// GOOD (syncs everywhere):
import { useData } from '../../context/DataContext';
const { cases } = useData();
```

### Deleted items still appearing
**Cause**: The page loads data directly from `dataService` which reads from mock arrays (not localStorage).
**Fix**: Ensure the page uses `useData()` from DataContext.

### AI Scheduler shows "Calculating route..." forever
**Cause**: OSRM API is unreachable and the geocoding fallback also failed.
**Fix**: Check internet connection. The system falls back to Haversine distance if OSRM is unavailable, but geocoding still needs either Nominatim or a keyword match for the address.

### Build fails with TypeScript errors
**Fix**: Run `npx tsc --noEmit` to see all errors. Common causes:
- Missing import
- Property doesn't exist on type (check `src/types/index.ts`)
- Using old function name after refactor

---

## 11. Deployment Guide

### Build for Production

```bash
npm run build
```

Output goes to `dist/` folder.

### Deploy to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (select Hosting, use 'dist' as public directory, configure as SPA)
firebase init

# Deploy
firebase deploy
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Deploy to Netlify

1. Connect GitHub repo to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add redirect rule in `netlify.toml`:
   ```toml
   [[redirects]]
   from = "/*"
   to = "/index.html"
   status = 200
   ```

### Environment Variables (for real Firebase)

```env
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 12. Future Enhancements

### High Priority (if continuing development)

1. **Connect Firebase** — Replace mock data with real Firestore for multi-user persistence
2. **Real authentication** — Firebase Auth with email verification
3. **DICOM image viewer** — Render actual medical images (not just thumbnails)
4. **Email notifications** — SendGrid/SES for case status updates
5. **Mobile responsive** — Optimize for tablet use in hospital wards
6. **Report versioning** — Draft → Review → Amend → Final workflow
7. **Bulk scheduling** — Schedule multiple cases at once in AI Scheduler

### Medium Priority

8. **PWA / Service Worker** — Offline support for rural clinics
9. **Real-time collaboration** — Firebase Realtime listeners for live updates
10. **PDF templates** — Customizable report templates per hospital
11. **i18n** — Malay language support (Bahasa Malaysia)
12. **Analytics dashboard** — Chart.js visualizations for trends
13. **Integration with HIS** — HL7/FHIR interoperability layer

### Low Priority

14. **Dark mode** — Theme toggle
15. **Custom workflows** — Configurable status flow per hospital
16. **Automated testing** — Playwright E2E tests for critical paths
17. **Logging service** — Sentry/DataDog error monitoring
18. **API layer** — Firebase Functions for server-side logic

---

## Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open global search |
| `?` | Show keyboard shortcuts |
| `Esc` | Close modal/dialog |

### Important Files to Know

| File | Purpose |
|------|---------|
| `src/App.tsx` | All routes + providers |
| `src/context/DataContext.tsx` | Central state (THE most important file) |
| `src/components/layout/Sidebar.tsx` | Navigation for all roles |
| `src/services/mockData.ts` | All demo/seed data |
| `src/types/index.ts` | All TypeScript interfaces |
| `tailwind.config.js` | Design system colors + tokens |
| `src/index.css` | Component utility classes |
| `firestore.rules` | Database security rules |

### Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npx tsc --noEmit # Type-check without building
```

---

*This documentation was generated for HealthGrid IQ v1.0.0. For questions, contact the development team or refer to the codebase directly.*
