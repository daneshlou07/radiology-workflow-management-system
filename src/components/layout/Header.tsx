import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import type { Case } from '../../types';
import { useSearchPalette } from '../ux/SearchPalette';
import { useToast } from '../ux/Toast';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, User, Lock, LogOut, ChevronDown, Camera, AlertTriangle, Clock, Megaphone, Info, Globe, BookOpen, PanelLeftClose, PanelLeft, ShieldCheck, Bot, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import Modal from '../ui/Modal';
import ClinicalGlossaryModal from '../ui/ClinicalGlossaryModal';

// Notification categories / priorities used by the HealthGrid IQ notification center.
type NotifCategory =
  | 'critical'
  | 'reports'
  | 'scheduling'
  | 'patient_requests'
  | 'equipment'
  | 'system'
  | 'announcements';

type NotifPriority = 'critical' | 'high' | 'normal' | 'low';

type NotificationView = {
  id: string;
  title: string;
  message: string;
  type?: string;
  category?: NotifCategory;
  priority?: NotifPriority;
  read: boolean;
  createdAt: string;
  actionType?: 'navigate' | 'critical' | 'none';
  actionTarget?: string;
};

const CATEGORY_META: Record<NotifCategory, { label: string; color: string; icon: React.ReactNode; order: number }> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
    order: 0,
  },
  reports: {
    label: 'Reports',
    color: 'text-purple-600',
    icon: <Clock className="w-3.5 h-3.5 text-purple-500" />,
    order: 1,
  },
  scheduling: {
    label: 'Scheduling',
    color: 'text-blue-600',
    icon: <Clock className="w-3.5 h-3.5 text-blue-500" />,
    order: 2,
  },
  patient_requests: {
    label: 'Patient Requests',
    color: 'text-orange-600',
    icon: <Info className="w-3.5 h-3.5 text-orange-500" />,
    order: 3,
  },
  equipment: {
    label: 'Equipment',
    color: 'text-emerald-600',
    icon: <Bot className="w-3.5 h-3.5 text-emerald-500" />,
    order: 4,
  },
  system: {
    label: 'System',
    color: 'text-slate-600',
    icon: <Info className="w-3.5 h-3.5 text-slate-400" />,
    order: 5,
  },
  announcements: {
    label: 'Announcements',
    color: 'text-amber-600',
    icon: <Megaphone className="w-3.5 h-3.5 text-amber-500" />,
    order: 6,
  },
};

const PRIORITY_ORDER: Record<NotifPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function inferNotificationCategory(notification: NotificationView): NotifCategory {
  if (notification.category) return notification.category;

  const text = `${notification.title} ${notification.message}`.toLowerCase();

  if (notification.type === 'error' || text.includes('critical') || text.includes('emergency')) {
    return 'critical';
  }

  if (
    text.includes('patient request') ||
    text.includes('profile update request') ||
    text.includes('archive request')
  ) {
    return 'patient_requests';
  }

  if (
    text.includes('report') ||
    text.includes('radiologist') ||
    text.includes('diagnostic')
  ) {
    return 'reports';
  }

  if (
    text.includes('schedule') ||
    text.includes('assigned') ||
    text.includes('appointment') ||
    notification.type === 'warning'
  ) {
    return 'scheduling';
  }

  if (
    text.includes('equipment') ||
    text.includes('pacs') ||
    text.includes('machine')
  ) {
    return 'equipment';
  }

  if (
    text.includes('announcement') ||
    text.includes('new feature')
  ) {
    return 'announcements';
  }

  return 'system';
}

function inferNotificationPriority(notification: NotificationView, category: NotifCategory): NotifPriority {
  if (notification.priority) return notification.priority;
  if (category === 'critical' || notification.type === 'error') return 'critical';
  if (category === 'patient_requests') return 'high';
  return 'normal';
}

function inferNotificationAction(notification: NotificationView, category: NotifCategory) {
  if (notification.actionType || notification.actionTarget) {
    return {
      actionType: notification.actionType || 'navigate',
      actionTarget: notification.actionTarget,
    } as const;
  }

  const text = `${notification.title} ${notification.message}`.toLowerCase();

  if (category === 'critical') {
    return { actionType: 'critical' as const, actionTarget: undefined };
  }

  // These paths match the main HealthGrid IQ workflows used by the current demo.
  if (category === 'patient_requests') {
    return { actionType: 'navigate' as const, actionTarget: '/patient-requests' };
  }

  if (category === 'scheduling') {
    return { actionType: 'navigate' as const, actionTarget: '/scheduler' };
  }

  if (category === 'equipment') {
    return { actionType: 'navigate' as const, actionTarget: '/mobile-pacs' };
  }

  if (category === 'reports') {
    const caseMatch = text.match(/(?:case|study)\s+([a-z0-9-]+)/i);
    return {
      actionType: 'navigate' as const,
      actionTarget: caseMatch?.[1] ? `/reports/${caseMatch[1]}` : '/reports',
    };
  }

  return { actionType: 'none' as const, actionTarget: undefined };
}

function formatNotificationTime(date: string) {
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return '—';

  const diff = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;

  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: new Date(date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

interface HeaderProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const { currentUser, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const { cases, editCase, addAuditLog, getScopedCases } = useData();
  const scopedCases = getScopedCases ? getScopedCases() : cases;
  const { open: openSearch } = useSearchPalette();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);

  const criticalCases = scopedCases.filter((c: Case) => c.isCriticalFinding && c.status !== 'FINALIZED' && !c.criticalFindingAcknowledged);
  const [showCriticalModal, setShowCriticalModal] = useState(false);

  const handleAcknowledgeCritical = async (c: Case) => {
    if (!currentUser) return;
    await editCase(c.id, {
      criticalFindingAcknowledged: true,
      criticalFindingAcknowledgedAt: new Date().toISOString(),
    });

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CRITICAL_FINDING_ACKNOWLEDGED',
      target: `cases/${c.id}`,
      details: `Acknowledged emergency critical finding for ${c.caseNumber}`,
      timestamp: new Date().toISOString(),
    });

    toast.success(`Acknowledged Critical Red Flag Alert for ${c.caseNumber}`);
  };
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [editablePhone, setEditablePhone] = useState('');
  const [editableEmail, setEditableEmail] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`healthgrid_profile_pic_${currentUser?.id}`);
    if (saved) setProfilePic(saved);
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      setEditablePhone(localStorage.getItem(`healthgrid_phone_${currentUser.id}`) || '+60 ');
      setEditableEmail(currentUser.email);
    }
  }, [currentUser]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!currentUser) return null;

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setProfilePic(base64);
      localStorage.setItem(`healthgrid_profile_pic_${currentUser.id}`, base64);
      toast.success('Profile picture updated');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    localStorage.setItem(`healthgrid_phone_${currentUser.id}`, editablePhone);
    toast.success('Profile updated');
  };

  const handleChangePassword = () => {
    setPasswordError('');
    if (!passwordForm.current) { setPasswordError('Current password is required'); return; }
    if (passwordForm.newPass.length < 8) { setPasswordError('New password must be at least 8 characters'); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { setPasswordError('New passwords do not match'); return; }
    if (passwordForm.current === passwordForm.newPass) { setPasswordError('New password must be different from current'); return; }
    toast.success('Password changed successfully');
    setShowPasswordModal(false);
    setPasswordForm({ current: '', newPass: '', confirm: '' });
  };

  const avatarElement = profilePic ? (
    <img src={profilePic} alt="" className="w-full h-full object-cover rounded-full" />
  ) : (
    <span className="text-[11px] font-bold text-navy-700">{currentUser.name.charAt(0)}</span>
  );

  // Normalize notification data so the UI remains compatible with existing NotificationContext data.
  const normalizedNotifications: NotificationView[] = notifications.map((notification) => {
    const view = notification as NotificationView;
    const category = inferNotificationCategory(view);
    const priority = inferNotificationPriority(view, category);
    const action = inferNotificationAction(view, category);

    return {
      ...view,
      category,
      priority,
      actionType: action.actionType,
      actionTarget: action.actionTarget,
    };
  });

  // Clinical priority first, then category order, then newest first.
  const sortedNotifications = [...normalizedNotifications].sort((a, b) => {
    const priorityDifference = PRIORITY_ORDER[a.priority || 'normal'] - PRIORITY_ORDER[b.priority || 'normal'];
    if (priorityDifference !== 0) return priorityDifference;

    const categoryDifference = CATEGORY_META[a.category || 'system'].order - CATEGORY_META[b.category || 'system'].order;
    if (categoryDifference !== 0) return categoryDifference;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const groupedNotifs = sortedNotifications.reduce<Record<NotifCategory, NotificationView[]>>((acc, notification) => {
    const category = notification.category || 'system';
    if (!acc[category]) acc[category] = [];
    acc[category].push(notification);
    return acc;
  }, {} as Record<NotifCategory, NotificationView[]>);

  const orderedCategories = (Object.keys(groupedNotifs) as NotifCategory[]).sort(
    (a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order,
  );

  const handleNotificationClick = (notification: NotificationView) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    setShowNotifications(false);

    if (notification.actionType === 'critical') {
      setShowCriticalModal(true);
      return;
    }

    if (notification.actionType === 'navigate' && notification.actionTarget) {
      navigate(notification.actionTarget);
    }
  };

  return (
    <>
      <header className="h-16 bg-[#FAFCFB] border-b border-[#D8E5E1] flex items-center px-4 md:px-6 gap-3 shrink-0">
        <div className="flex-1 max-w-xl min-w-0">
          <button
            onClick={openSearch}
            className="w-full flex items-center gap-2 px-2.5 sm:px-3 py-1.5
    bg-white
    border border-[#D8E5E1]
    rounded-lg
    text-xs text-[#2C524B]
    hover:border-[#C0D3CD]
    transition-colors
    text-left"
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0 text-[#3B665E]" />

            <span className="flex-1 truncate">
              Search patients, cases, reports...
            </span>

            <kbd
              className="hidden sm:inline-flex px-1.5 py-0.5
      bg-[#F8FAF9]
      border border-[#D8E5E1]
      rounded
      text-[9px]
      font-mono
      text-surface-400"
            >
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Emergency Critical Findings Banner */}
        {criticalCases.length > 0 && (
          <button
            onClick={() => setShowCriticalModal(true)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold animate-pulse shadow-md transition-all cursor-pointer shrink-0"
            title="Click to view & acknowledge emergency critical findings"
          >
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="hidden sm:inline">{criticalCases.length} CRITICAL RED FLAG FINDING(S)!</span>
            <span className="sm:hidden">{criticalCases.length} CRITICAL</span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }} className="relative p-2 text-surface-500 hover:text-navy-600 hover:bg-surface-100 rounded-lg transition-colors" aria-label="Notifications">
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="fixed sm:absolute inset-x-2 top-16 sm:inset-x-auto sm:right-0 sm:top-12 w-auto sm:w-[420px] max-w-[calc(100vw-16px)] bg-white border border-surface-200 rounded-2xl shadow-elevated z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-surface-200 bg-white">
                  <div>
                    <h3 className="text-sm font-semibold text-navy-800">Notifications</h3>
                    <p className="text-[10px] text-surface-400 mt-0.5">
                      {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-navy-600 font-semibold hover:text-navy-800 hover:underline transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-[430px] overflow-y-auto">
                  {sortedNotifications.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-surface-50 flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-5 h-5 text-surface-300" />
                      </div>
                      <p className="text-sm font-medium text-surface-600">No notifications</p>
                      <p className="text-xs text-surface-400 mt-1">You're all caught up.</p>
                    </div>
                  ) : (
                    orderedCategories.map((category) => {
                      const categoryNotifications = groupedNotifs[category];
                      const unreadInCategory = categoryNotifications.filter((notification) => !notification.read).length;
                      const meta = CATEGORY_META[category];

                      return (
                        <div key={category}>
                          {/* Category header */}
                          <div className="sticky top-0 z-10 px-4 py-2 bg-surface-50/95 backdrop-blur-sm border-b border-surface-100 flex items-center gap-2">
                            {meta.icon}
                            <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${meta.color}`}>
                              {meta.label}
                            </span>
                            {unreadInCategory > 0 && (
                              <span className="ml-auto text-[9px] font-semibold text-surface-400">
                                {unreadInCategory} unread
                              </span>
                            )}
                          </div>

                          {/* Notifications */}
                          {categoryNotifications.map((notification) => {
                            const isUnread = !notification.read;
                            const isCritical = notification.priority === 'critical';
                            const hasAction =
                              notification.actionType === 'navigate' && Boolean(notification.actionTarget);

                            return (
                                <button
                                key={notification.id}
                                type="button"
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full text-left px-4 py-3.5 border-b border-surface-100 transition-colors group ${isUnread ? 'bg-emerald-50/25 hover:bg-emerald-50/50' : 'bg-white hover:bg-surface-50'
                                  } ${isCritical ? 'border-l-2 border-l-red-500' : ''}`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isCritical
                                        ? 'bg-red-500'
                                        : isUnread
                                          ? 'bg-emerald-500'
                                          : 'bg-surface-300'
                                      }`}
                                    aria-hidden="true"
                                  />

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                      <p className={`text-sm leading-5 ${isUnread ? 'font-semibold text-surface-900' : 'font-medium text-surface-700'}`}>
                                        {notification.title}
                                      </p>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] text-surface-400 whitespace-nowrap pt-0.5">
                                          {formatNotificationTime(notification.createdAt)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeNotification(notification.id);
                                          }}
                                          className="p-0.5 rounded hover:bg-surface-200 text-surface-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                          title="Dismiss notification"
                                          aria-label="Dismiss notification"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    <p className="text-xs leading-5 text-surface-500 mt-0.5 line-clamp-2">
                                      {notification.message}
                                    </p>

                                    {hasAction && (
                                      <p className="text-[10px] font-semibold text-navy-600 mt-1.5 group-hover:text-navy-800 transition-colors">
                                        View details →
                                      </p>
                                    )}

                                    {isCritical && (
                                      <p className="text-[10px] font-semibold text-red-600 mt-1.5">
                                        Requires acknowledgement
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-surface-200 bg-white p-2 flex items-center gap-2">
                  {sortedNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAll();
                      }}
                      className="flex-1 py-2 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="flex-1 py-2 text-xs font-semibold text-navy-600 hover:text-navy-800 hover:bg-surface-50 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center overflow-hidden">
                {avatarElement}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-surface-800 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-surface-500 leading-tight">{currentUser.role}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-surface-400 hidden md:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 w-56 bg-white border border-surface-300 rounded-xl shadow-elevated z-50 py-1">
                <div className="px-4 py-3 border-b border-surface-200">
                  <p className="text-sm font-medium text-surface-800">{currentUser.name}</p>
                  <p className="text-xs text-surface-500">{currentUser.email}</p>
                </div>
                <div className="py-1">
                  <button onClick={() => { setShowProfile(false); setShowProfileModal(true); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-surface-700 hover:bg-surface-100 transition-colors text-left">
                    <User className="w-4 h-4 text-surface-400" /> My Profile
                  </button>
                  <Link to="/onboarding" onClick={() => setShowProfile(false)} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-surface-700 hover:bg-surface-100 transition-colors text-left">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Clinical Credentials
                  </Link>
                  <button onClick={() => { setShowProfile(false); setShowPasswordModal(true); setPasswordForm({ current: '', newPass: '', confirm: '' }); setPasswordError(''); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-surface-700 hover:bg-surface-100 transition-colors text-left">
                    <Lock className="w-4 h-4 text-surface-400" /> Change Password
                  </button>
                </div>
                <div className="border-t border-surface-200 py-1">
                  <button onClick={logout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* My Profile Modal */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="My Profile" size="lg">
        <div className="space-y-6">
          {/* Avatar + Editable Section */}
          <div className="flex items-start gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 bg-navy-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-surface-300">
                {profilePic ? <img src={profilePic} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-navy-700">{currentUser.name.charAt(0)}</span>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 bg-navy-600 text-white rounded-full flex items-center justify-center hover:bg-navy-700 transition-colors shadow-md" title="Change photo">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfilePicUpload} className="hidden" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs text-surface-500 mb-0.5">Phone Number</label>
                <input value={editablePhone} onChange={(e) => setEditablePhone(e.target.value)} className="input-field text-sm" placeholder="+60 12-345-6789" />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-0.5">Email Address</label>
                <input value={editableEmail} onChange={(e) => setEditableEmail(e.target.value)} className="input-field text-sm" />
              </div>
              <button onClick={handleSaveProfile} className="btn-primary text-xs">Save Changes</button>
            </div>
          </div>

          {/* Credentials & Registration Section */}
          <div className="pt-4 border-t border-surface-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Professional Credentials &amp; Registration</span>
              </div>
              <Link to="/onboarding" onClick={() => setShowProfileModal(false)} className="text-xs font-semibold text-navy-600 hover:text-navy-800 hover:underline">
                View Full Page &rarr;
              </Link>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Medical Registration:</span>
                <span className="font-semibold text-slate-800">
                  {currentUser.role === 'Radiologist' ? 'Malaysian Medical Council & NSR' : currentUser.role === 'Medical Officer' ? 'Malaysian Medical Council (MMC)' : 'Allied Health Professions Council'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Registration Number:</span>
                <span className="font-mono font-bold text-slate-900">
                  {currentUser.mmcNumber || (currentUser.role === 'Radiologist' ? 'NSR-129481 / MMC-48291' : currentUser.role === 'Medical Officer' ? 'MMC-84920' : 'MAHPC-99104')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Clinical Authorization:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified &amp; Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Digital Signature:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Active for Requisitions &amp; Reports
                </span>
              </div>
            </div>
          </div>

          {/* Admin-managed fields */}
          <div className="pt-4 border-t border-surface-200">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-3.5 h-3.5 text-surface-400" />
              <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Administrator Managed</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-[10px] text-surface-400 uppercase">Full Name</span><p className="text-surface-800 font-medium">{currentUser.name}</p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Role</span><p className="text-surface-800">{currentUser.role}</p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Shift</span><p className="text-surface-800">{currentUser.shift || '—'}</p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Specialty</span><p className="text-surface-800">{currentUser.specialty || '—'}</p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Employment Status</span><p><span className="badge-success text-[10px]">{currentUser.status}</span></p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Leave Status</span><p className="text-surface-800">{currentUser.leaveStatus || 'Active'}</p></div>
              {currentUser.supportedModalities && currentUser.supportedModalities.length > 0 && (
                <div className="col-span-2 md:col-span-3"><span className="text-[10px] text-surface-400 uppercase">Certified Modalities</span>
                  <div className="flex flex-wrap gap-1 mt-1">{currentUser.supportedModalities.map((m) => <span key={m} className="badge-info text-[9px]">{m}</span>)}</div>
                </div>
              )}
              <div><span className="text-[10px] text-surface-400 uppercase">Member Since</span><p className="text-surface-800">{new Date(currentUser.createdAt).toLocaleDateString()}</p></div>
            </div>
            <p className="text-[10px] text-surface-400 mt-3 italic">These fields can only be modified by a system administrator.</p>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{passwordError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Current Password *</label>
            <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="input-field" placeholder="Enter current password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">New Password *</label>
            <input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} className="input-field" placeholder="Min. 8 characters" />
            {passwordForm.newPass && passwordForm.newPass.length < 8 && (
              <p className="text-[10px] text-amber-600 mt-1">Password must be at least 8 characters</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Confirm New Password *</label>
            <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="input-field" placeholder="Re-enter new password" />
            {passwordForm.newPass && passwordForm.confirm && passwordForm.newPass !== passwordForm.confirm && (
              <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          <div className="p-3 bg-surface-50 border border-surface-200 rounded-lg text-[10px] text-surface-500 space-y-1">
            <p className="font-medium text-surface-600">Password Requirements:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Minimum 8 characters</li>
              <li>Must differ from current password</li>
              <li>Both new password fields must match</li>
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowPasswordModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleChangePassword} disabled={!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm} className="btn-primary disabled:opacity-50">Update Password</button>
          </div>
        </div>
      </Modal>

      {/* Emergency Critical Findings Modal */}
      <Modal isOpen={showCriticalModal} onClose={() => setShowCriticalModal(false)} title="Emergency Critical Red Flag Findings">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            The following cases contain active emergency critical findings requiring urgent clinical attention:
          </p>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {criticalCases.map((c) => (
              <div key={c.id} className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-red-900">{c.caseNumber}</span>
                  <span className="text-xs font-semibold text-slate-800">{c.patientName}</span>
                </div>
                <p className="text-xs text-red-700 font-medium">
                  Note: {c.criticalFindingNote || 'Critical pathology flagged during diagnostic review.'}
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleAcknowledgeCritical(c)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    ✓ Acknowledge &amp; Clear Alert
                  </button>
                </div>
              </div>
            ))}
            {criticalCases.length === 0 && (
              <p className="text-center py-6 text-xs text-slate-400">All critical findings have been acknowledged!</p>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setShowCriticalModal(false)} className="btn-secondary text-xs">Close</button>
          </div>
        </div>
      </Modal>

      {/* Clinical Terms Glossary Dictionary Modal */}
      <ClinicalGlossaryModal
        isOpen={showGlossaryModal}
        onClose={() => setShowGlossaryModal(false)}
      />
    </>
  );
}
