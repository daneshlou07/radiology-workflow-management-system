# HealthGrid IQ

**Clinical Imaging & Diagnostic Platform**
by Theta Edge Berhad — Technology & Telecommunication

---

## Overview

HealthGrid IQ is an enterprise-grade, HIPAA-compliant clinical imaging platform that coordinates patient registration, diagnostic imaging referrals, AI-powered scheduling, radiological reporting, and system administration across regional healthcare facilities.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **Styling**: Tailwind CSS 3 (custom enterprise design system)
- **Database**: Firebase Firestore (with localStorage mock fallback)
- **Authentication**: Firebase Auth (with demo role-based fallback)
- **Mapping**: Leaflet + Google Maps Platform (with OSRM fallback)
- **Icons**: Lucide React

## Documentation

| Document | Description |
| :--- | :--- |
| **[`DOCUMENTATION.md`](./DOCUMENTATION.md)** | Comprehensive system architecture, modules, and component specifications. |
| **[`PRODUCTION_DEPLOYMENT.md`](./PRODUCTION_DEPLOYMENT.md)** | Production deployment instructions and environment configuration. |
| **[`IAS_INTEGRATION.md`](./IAS_INTEGRATION.md)** | Intelligent Appointment Scheduling integration specifications. |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file (optional — works without Firebase)
cp .env.example .env

# 3. Start development server
npm run dev

# 4. Open in browser
# http://localhost:5173
```

## Demo Accounts

The app runs in demo mode without Firebase configuration. Use the Quick Access buttons on the login page to switch between roles:

| Role | Email | Capabilities |
|------|-------|------|
| Doctor | sarah.chen@healthgrid.my | Register patients, create referrals, view reports |
| Radiographer | ahmad.razak@healthgrid.my | View scan queue, upload images |
| Radiologist | priya.nair@healthgrid.my | Review scans, write reports, sign off |
| Radiology Dept | nurul.aisyah@healthgrid.my | Register cases, track status |
| Administrator | weiming.tan@healthgrid.my | Full system access, AI Scheduler |

## Project Structure

```
src/
├── components/
│   ├── layout/          # Sidebar, Header, MainLayout
│   ├── scheduling/      # AI Scheduler components
│   ├── ui/              # StatusBadge, StatsCard, Modal, TabFilter, etc.
│   └── ux/              # Toast, SearchPalette, ErrorBoundary, etc.
├── context/
│   ├── AuthContext.tsx   # Authentication & session management
│   ├── DataContext.tsx   # Centralized state + localStorage persistence
│   └── NotificationContext.tsx
├── pages/
│   ├── admin/           # System Administration (12 modules)
│   ├── department/      # Radiology Department (4 modules)
│   ├── doctor/          # Doctor workspace
│   ├── radiographer/    # Radiographer workspace
│   ├── radiologist/     # Radiologist workspace
│   └── shared/          # CaseDetail, PatientDetail
├── services/
│   ├── dataService.ts   # CRUD operations (Firestore or mock)
│   ├── firebase.ts      # Firebase lazy initialization
│   ├── mockData.ts      # Demo data (patients, cases, clinics)
│   └── routingService.ts # Geocoding + OSRM routing
└── types/
    └── index.ts         # All TypeScript interfaces
```

## Key Features

- **AI Scheduler** — Automated healthcare centre recommendation based on patient location, equipment, and radiographer availability
- **MyKad NRIC Validation** — Automatic DOB and gender extraction from Malaysian IC
- **Kanban Track Status** — Visual case pipeline (Scheduled → Completed → Report Ready)
- **PDF Report Printing** — Styled diagnostic report with electronic signature
- **SLA Monitoring** — Countdown timers on cases with urgency escalation
- **Case Communication** — Inter-departmental messaging per case
- **Cross-Tab Sync** — Changes in one browser tab propagate to all others
- **Session Timeout** — Auto-logout after 30 minutes of inactivity

## Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## Deployment

Deploy the `dist/` folder to any static hosting:

- Firebase Hosting
- Vercel
- Netlify
- AWS S3 + CloudFront

## Security

- Role-Based Access Control (RBAC) on all routes
- Write-once immutable audit logs
- Report locking after sign-off
- Login rate limiting (5 attempts, 60s lockout)
- Input sanitization on all user-facing content
- Firestore security rules defined in `firestore.rules`

## License

Proprietary — Theta Edge Berhad. All rights reserved.
