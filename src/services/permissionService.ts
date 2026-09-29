import type { UserRole } from '../types';

export interface NavModuleDefinition {
  id: string;
  label: string;
  category: 'Clinical Core' | 'Imaging & Technical' | 'Administration & Governance' | 'Operations & Fleet' | 'Equipment Marketplace';
  description: string;
  defaultPath: string;
  iconName: string;
}

export const ALL_NAV_MODULES: NavModuleDefinition[] = [
  // Clinical Core
  {
    id: 'dashboard',
    label: 'Dashboard & KPIs',
    category: 'Clinical Core',
    description: 'Main operational overview, active queue stats, and daily performance metrics.',
    defaultPath: '/dashboard',
    iconName: 'House',
  },
  {
    id: 'patients',
    label: 'Patient Registry',
    category: 'Clinical Core',
    description: 'Patient directory, demographics, and clinical history repository.',
    defaultPath: '/patients',
    iconName: 'Users',
  },
  {
    id: 'register_patient',
    label: 'Register New Patient',
    category: 'Clinical Core',
    description: 'Form for registering new patients into the MOH HealthGrid database.',
    defaultPath: '/patients/register',
    iconName: 'UserPlus',
  },
  {
    id: 'new_case',
    label: 'New Case Registration',
    category: 'Clinical Core',
    description: 'Clinical order intake form to request diagnostic imaging for a patient.',
    defaultPath: '/cases/new',
    iconName: 'FilePlus2',
  },
  {
    id: 'cases',
    label: 'All Medical Cases',
    category: 'Clinical Core',
    description: 'Searchable clinical case repository with status, modality, and facility filters.',
    defaultPath: '/cases',
    iconName: 'FolderOpen',
  },
  {
    id: 'reporting',
    label: 'Diagnostic Hub & Reports',
    category: 'Clinical Core',
    description: '3-in-1 triage queue, PACS diagnostic desk, diagnostic reporting, and signed reports archive.',
    defaultPath: '/review-queue',
    iconName: 'FileText',
  },
  {
    id: 'patient_requests',
    label: 'Patient Transfer Requests',
    category: 'Clinical Core',
    description: 'Queue for patient records modification and transfer requests between centers.',
    defaultPath: '/requests',
    iconName: 'ClipboardList',
  },
  {
    id: 'track_status',
    label: 'Track Case Status',
    category: 'Clinical Core',
    description: 'Real-time patient journey tracker across registration, scanning, and diagnosis.',
    defaultPath: '/track-status',
    iconName: 'ArrowRightLeft',
  },

  // Imaging & Technical
  {
    id: 'scan_queue',
    label: 'My Cases',
    category: 'Imaging & Technical',
    description: 'Unified radiographer workspace with appointment worklist, hourly timetable, and scan queue.',
    defaultPath: '/scan-queue',
    iconName: 'Calendar',
  },
  {
    id: 'upload_scans',
    label: 'Upload Scans',
    category: 'Imaging & Technical',
    description: 'Clinical image acquisition, exposure factors, and PACS upload workspace.',
    defaultPath: '/upload',
    iconName: 'Upload',
  },
  {
    id: 'credentials',
    label: 'My Credentials & License',
    category: 'Imaging & Technical',
    description: 'MOH practitioner credentialing, professional licensing, and profile onboarding.',
    defaultPath: '/onboarding',
    iconName: 'ShieldCheck',
  },

  // Operations & Fleet
  {
    id: 'bems',
    label: 'BEMS Referral Portal',
    category: 'Operations & Fleet',
    description: 'Biomedical engineering portal for managing machine breakdowns and facility routing.',
    defaultPath: '/bems',
    iconName: 'Wrench',
  },
  {
    id: 'public_admin',
    label: 'Public Hospital Intake',
    category: 'Operations & Fleet',
    description: 'Intake workspace for public hospital administrators to review referrals and assign imaging staff.',
    defaultPath: '/public-admin',
    iconName: 'Building2',
  },
  {
    id: 'private_admin',
    label: 'Private Hospital Intake',
    category: 'Operations & Fleet',
    description: 'Intake workspace for private hospital administrators to assign their imaging staff.',
    defaultPath: '/private-admin',
    iconName: 'Building2',
  },
  {
    id: 'external_radiographer',
    label: 'External Radiographer Hub',
    category: 'Operations & Fleet',
    description: 'Clinical routing hub for external and public/private outsourced radiographers.',
    defaultPath: '/external-radiographer',
    iconName: 'ClipboardList',
  },
  {
    id: 'ai_scheduler',
    label: 'AI Resource Scheduler',
    category: 'Operations & Fleet',
    description: 'Intelligent schedule optimization for mobile PACS vans and clinical shifts.',
    defaultPath: '/ai-scheduler',
    iconName: 'Sparkles',
  },
  {
    id: 'fleet',
    label: 'Mobile Fleet Management',
    category: 'Operations & Fleet',
    description: 'Track, deploy, and service mobile PACS diagnostic imaging vans.',
    defaultPath: '/fleet',
    iconName: 'Truck',
  },
  {
    id: 'clinics',
    label: 'Clinic Management',
    category: 'Operations & Fleet',
    description: 'Manage clinic locations, opening hours, facilities, and contact details.',
    defaultPath: '/clinics',
    iconName: 'Building',
  },

  // Administration & Governance
  {
    id: 'users',
    label: 'User Directory',
    category: 'Administration & Governance',
    description: 'Manage staff accounts, credentials, system roles, and clinical assignments.',
    defaultPath: '/users',
    iconName: 'Users',
  },
  {
    id: 'announcements',
    label: 'System Broadcasts',
    category: 'Administration & Governance',
    description: 'Broadcast urgent clinical alerts and system announcements to staff.',
    defaultPath: '/announcements',
    iconName: 'ScrollText',
  },
  {
    id: 'analytics',
    label: 'Operations Analytics',
    category: 'Administration & Governance',
    description: 'View clinical KPIs, modality utilization, and diagnostic throughput trends.',
    defaultPath: '/analytics',
    iconName: 'BarChart3',
  },
  {
    id: 'audit_logs',
    label: 'Audit & Compliance Logs',
    category: 'Administration & Governance',
    description: 'Immutable, tamper-evident record of all system events and patient record access.',
    defaultPath: '/audit-logs',
    iconName: 'ShieldCheck',
  },
  {
    id: 'recycle_bin',
    label: 'Recycle Bin',
    category: 'Administration & Governance',
    description: 'Recover or permanently purge soft-deleted patient records, cases, and clinics.',
    defaultPath: '/recycle-bin',
    iconName: 'Trash2',
  },
  {
    id: 'tech_stack',
    label: 'Technology Stack',
    category: 'Administration & Governance',
    description: 'System architecture specifications and operational software version details.',
    defaultPath: '/tech-stack',
    iconName: 'Wrench',
  },

  // Equipment Marketplace
  {
    id: 'marketplace_medical',
    label: 'Medical Imaging Catalogue',
    category: 'Equipment Marketplace',
    description: 'Explore diagnostic imaging systems, X-Ray, CT, MRI, and ultrasound units.',
    defaultPath: '/marketplace/medical',
    iconName: 'Package',
  },
  {
    id: 'marketplace_non_medical',
    label: 'Hospital Infrastructure & Support',
    category: 'Equipment Marketplace',
    description: 'View facility equipment, UPS, lead-shielding, HVAC, and healthcare support systems.',
    defaultPath: '/marketplace/non-medical',
    iconName: 'Building2',
  },
  {
    id: 'marketplace_orders',
    label: 'RFQ Quotations & Orders',
    category: 'Equipment Marketplace',
    description: 'Track procurement status, formal pricing proposals, and equipment order dispatch.',
    defaultPath: '/marketplace/orders',
    iconName: 'FileText',
  },
  {
    id: 'marketplace_manage',
    label: 'Listing Management',
    category: 'Equipment Marketplace',
    description: 'Super Admin and vendor management for commercial equipment inventories.',
    defaultPath: '/marketplace/manage',
    iconName: 'SlidersHorizontal',
  },
  {
    id: 'marketplace_all',
    label: 'Browse All Equipment',
    category: 'Equipment Marketplace',
    description: 'Unified commercial marketplace catalog across all hospital categories.',
    defaultPath: '/marketplace',
    iconName: 'ShoppingBag',
  },
];

export type RoleNavigationConfig = Partial<Record<UserRole, string[]>>;

export const DEFAULT_ROLE_NAV_CONFIG: RoleNavigationConfig = {
  'Medical Officer': [
    'dashboard',
    'patients',
    'register_patient',
    'new_case',
    'cases',
    'patient_requests',
    'track_status',
    'reporting',
    'credentials',
  ],
  'Radiographer': [
    'dashboard',
    'scan_queue',
    'upload_scans',
    'credentials',
  ],
  'Public Hospital Radiographer': [
    'dashboard',
    'scan_queue',
    'upload_scans',
    'credentials',
  ],
  'Private Hospital Radiographer': [
    'dashboard',
    'scan_queue',
    'upload_scans',
    'credentials',
  ],
  'Radiologist': [
    'dashboard',
    'reporting',
    'credentials',
  ],
  'BEMS Officer': [
    'dashboard',
  ],
  'BEMS': [
    'dashboard',
  ],
  'BEMZ': [
    'dashboard',
  ],
  'Public Hospital Admin': [
    'dashboard',
    'public_admin',
    'track_status',
  ],
  'Private Hospital Admin': [
    'dashboard',
    'private_admin',
    'track_status',
  ],
  'Administrator': [
    'dashboard',
    'clinics',
    'patients',
    'cases',
    'patient_requests',
    'bems',
    'public_admin',
    'private_admin',
    'external_radiographer',
    'reports',
    'users',
    'recycle_bin',
    'audit_logs',
  ],
  'Super Admin': [
    'dashboard',
    'clinics',
    'ai_scheduler',
    'patients',
    'cases',
    'patient_requests',
    'bems',
    'public_admin',
    'private_admin',
    'external_radiographer',
    'marketplace_medical',
    'marketplace_non_medical',
    'marketplace_orders',
    'marketplace_manage',
    'marketplace_all',
    'reports',
    'users',
    'recycle_bin',
    'audit_logs',
  ],
};

const STORAGE_KEY = 'healthgrid_role_navigation_config';

export function loadRoleNavConfig(): RoleNavigationConfig {
  const validModuleIds = new Set(ALL_NAV_MODULES.map((m) => m.id));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ROLE_NAV_CONFIG };
    const parsed = JSON.parse(raw);
    const merged: RoleNavigationConfig = { ...DEFAULT_ROLE_NAV_CONFIG };
    for (const [role, keys] of Object.entries(parsed)) {
      if (Array.isArray(keys)) {
        const filtered = keys.filter((k: string) => validModuleIds.has(k));
        if (
          (role === 'Radiographer' || role === 'Public Hospital Radiographer' || role === 'Private Hospital Radiographer') &&
          !filtered.includes('upload_scans')
        ) {
          const sqIdx = filtered.indexOf('scan_queue');
          if (sqIdx !== -1) {
            filtered.splice(sqIdx + 1, 0, 'upload_scans');
          } else {
            filtered.splice(1, 0, 'upload_scans');
          }
        }
        if (role === 'Radiologist') {
          // Ensure reporting is immediately after dashboard
          const rIdx = filtered.indexOf('reporting');
          const dIdx = filtered.indexOf('dashboard');
          if (rIdx !== -1 && dIdx !== -1 && rIdx !== dIdx + 1) {
            filtered.splice(rIdx, 1);
            filtered.splice(dIdx + 1, 0, 'reporting');
          }
        }
        merged[role as UserRole] = filtered;
      }
    }
    return merged;
  } catch {
    return { ...DEFAULT_ROLE_NAV_CONFIG };
  }
}

export function saveRoleNavConfig(config: RoleNavigationConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to persist role navigation config:', e);
  }
}
