import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useLanguage } from '../../context/LanguageContext';
import type { Case, Report } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import PacsImageViewer from '../../components/ui/PacsImageViewer';
import Modal from '../../components/ui/Modal';
import { loadImages } from '../../services/imageStorage';
import { generateAiReportDraft } from '../../services/aiReportingCopilot';
import { analyzeImageWithVisionAi } from '../../services/visionAiAnalyzer';
import { generateReportToken } from '../../utils/reportToken';
import { getCaseRegistrar, getCaseIndication } from '../../utils/caseDisplay';
import {
  FileText,
  Eye,
  Printer,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Send,
  Building2,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  Search,
  CheckCircle,
  FileCheck2,
  User,
  X,
  Lock,
  PlusCircle,
  History,
} from 'lucide-react';

/** Inline image loader for report thumbnails in the Archive tab */
function ReportImages({ imageKeys }: { imageKeys?: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageKeys || imageKeys.length === 0) {
      setUrls([]);
      return;
    }
    setLoading(true);
    loadImages(imageKeys).then((loaded) => {
      setUrls(loaded);
      setLoading(false);
    });
  }, [imageKeys?.join(',')]);

  if (!imageKeys || imageKeys.length === 0) return null;
  if (loading) return <p className="text-xs text-slate-400 py-2">Loading images…</p>;
  if (urls.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">Scan Captures</p>
      <div className="grid grid-cols-2 gap-2">
        {urls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={`Scan ${i + 1}`}
              className="w-full rounded-lg border border-slate-200 object-contain bg-black max-h-44 cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Escapes HTML special characters to prevent XSS in print templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function handlePrintReport(report: Report) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const safe = {
    caseNumber: escapeHtml(report.caseNumber || ''),
    patientName: escapeHtml(report.patientName || ''),
    radiologistName: escapeHtml(report.radiologistName || ''),
    status: escapeHtml(report.status || ''),
    findings: escapeHtml(report.findings || ''),
    impression: escapeHtml(report.impression || ''),
    suggestions: escapeHtml(report.suggestions || ''),
    signedAt: escapeHtml(report.signedAt ? new Date(report.signedAt).toLocaleString() : ''),
  };

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Diagnostic Report - ${safe.caseNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #0F172A; font-size: 13px; line-height: 1.5; }
          .header { border-bottom: 2px solid #0F4C42; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 18px; font-weight: bold; color: #0F4C42; margin-bottom: 4px; }
          .sub { color: #64748B; font-size: 11px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; }
          .meta-item { font-size: 12px; }
          .meta-label { font-weight: bold; color: #475569; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: bold; color: #0F4C42; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
          .section-content { white-space: pre-wrap; color: #1E293B; font-size: 13px; }
          .footer { margin-top: 40px; border-top: 1px solid #CBD5E1; padding-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; }
          .stamp { border: 1px dashed #0F4C42; padding: 8px 16px; text-align: center; color: #0F4C42; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">HEALTHGRID IQ &mdash; CLINICAL DIAGNOSTIC REPORT</div>
          <div class="sub">Ministry of Health (KKM) Teleradiology Network</div>
        </div>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Case Number:</span> ${safe.caseNumber}</div>
          <div class="meta-item"><span class="meta-label">Patient Name:</span> ${safe.patientName}</div>
          <div class="meta-item"><span class="meta-label">Diagnostician / Radiologist:</span> ${safe.radiologistName}</div>
          <div class="meta-item"><span class="meta-label">Signed At:</span> ${safe.signedAt}</div>
        </div>
        <div class="section">
          <div class="section-title">Clinical Findings</div>
          <div class="section-content">${safe.findings || 'No findings recorded.'}</div>
        </div>
        <div class="section">
          <div class="section-title">Diagnostic Impression</div>
          <div class="section-content">${safe.impression || 'No impression recorded.'}</div>
        </div>
        ${safe.suggestions ? `
        <div class="section">
          <div class="section-title">Recommendations & Suggestions</div>
          <div class="section-content">${safe.suggestions}</div>
        </div>` : ''}
        <div class="footer">
          <div>Report generated via HealthGrid IQ Diagnostics Engine</div>
          <div class="stamp">OFFICIALLY SIGNED & VERIFIED</div>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

interface DiagnosticHubProps {
  initialTab?: 'incoming' | 'escalated' | 'reporting' | 'archive' | 'queue' | 'reports';
}

export default function DiagnosticHub({ initialTab }: DiagnosticHubProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get('caseId');
  const tabFromUrl = searchParams.get('tab');

  const { currentUser } = useAuth();
  const {
    cases,
    reports,
    users,
    patients,
    crossOrgReferrals,
    addReport,
    addReportAddendum,
    editCase,
    addAuditLog,
    getScopedCases,
    signCrossOrgReferralReport,
  } = useData();
  const scopedCases = getScopedCases ? getScopedCases() : cases;
  const toast = useToast();

  const isRadiologist = currentUser?.role === 'Radiologist';
  const isDoctor = currentUser?.role === 'Medical Officer';

  const userCenterId = currentUser?.healthcareCenterId || currentUser?.deploymentLocationId;
  const userCenterName = currentUser?.healthcareCenterName || 'In-House Healthcare Center';

  // In-House Radiologists belonging strictly to the Medical Officer's healthcare center
  const inHouseRadiologists = useMemo(() => {
    if (!users || !currentUser) return [];
    return users.filter(
      (u) =>
        u.role === 'Radiologist' &&
        (u.healthcareCenterId === userCenterId || u.deploymentLocationId === userCenterId)
    );
  }, [users, currentUser, userCenterId]);

  // ── ACTIVE TAB ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'incoming' | 'escalated' | 'reporting' | 'archive'>(() => {
    if (tabFromUrl === 'reporting' || caseIdFromUrl || initialTab === 'reporting') return 'reporting';
    if (tabFromUrl === 'archive' || tabFromUrl === 'reports' || initialTab === 'archive' || initialTab === 'reports') return 'archive';
    if (tabFromUrl === 'escalated' || initialTab === 'escalated') return 'escalated';
    return 'incoming';
  });

  // ── QUEUE FILTERS & SEARCH ───────────────────────────────────────────────
  const [queueSearch, setQueueSearch] = useState('');
  const [queueModalityFilter, setQueueModalityFilter] = useState('all');
  const [queueSeverityFilter, setQueueSeverityFilter] = useState('all');

  // ── TAB 2: REPORTING DESK STATE ──────────────────────────────────────────
  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseIdFromUrl || '');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isCriticalFinding, setIsCriticalFinding] = useState(false);
  const [criticalFindingNote, setCriticalFindingNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [isVisionAiAnalyzing, setIsVisionAiAnalyzing] = useState(false);
  const [aiAnalysisMetadata, setAiAnalysisMetadata] = useState<{
    aiModel: string;
    indication: string;
    historySummary: string;
    clinicalCorrelation?: string;
    clinicalMismatchAlert?: string;
    confidenceScore: number;
    detectedFeatures?: string[];
  } | null>(null);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [selectedRadiologistId, setSelectedRadiologistId] = useState<string>('');
  const [escalateReason, setEscalateReason] = useState('Suspected Abnormality / Requires Specialist Opinion');
  const [escalateNotes, setEscalateNotes] = useState('');

  // Auto-select first in-house radiologist when list changes
  useEffect(() => {
    if (inHouseRadiologists.length > 0) {
      setSelectedRadiologistId(inHouseRadiologists[0].id);
    } else {
      setSelectedRadiologistId('');
    }
  }, [inHouseRadiologists]);

  // ── ADDENDUM MODAL STATE ─────────────────────────────────────────────────
  const [showAddendumModal, setShowAddendumModal] = useState(false);
  const [addendumContent, setAddendumContent] = useState('');
  const [addendumReason, setAddendumReason] = useState('Supplementary Clinical Information');
  const [submittingAddendum, setSubmittingAddendum] = useState(false);

  // ── TAB 3: ARCHIVE STATE ─────────────────────────────────────────────────
  const [archiveSearch, setArchiveSearch] = useState('');
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  // Ready cases for review
  const readyCases = useMemo(() => {
    return scopedCases.filter(
      (c) =>
        c.status === 'IMAGES_AVAILABLE' ||
        c.status === 'SCANNED' ||
        c.status === 'RADIOLOGIST_REVIEW' ||
        c.status === 'MO_REVIEW' ||
        c.status === 'REPORT_SUBMITTED' ||
        c.status === 'FINALIZED' ||
        c.status === 'COMPLETED' ||
        (c.images && c.images.length > 0)
    );
  }, [scopedCases]);

  // MO primary review queue
  const moReviewCases = useMemo(() => {
    return readyCases
      .filter((c) => (c.routedToRole === 'Medical Officer' || !c.routedToRole) && !c.isEscalated)
      .sort((a, b) => (b.severity === 'Critical' ? 1 : 0) - (a.severity === 'Critical' ? 1 : 0));
  }, [readyCases]);

  // Radiologist queue
  const radiologistReviewCases = useMemo(() => {
    return readyCases
      .filter((c) => c.routedToRole === 'Radiologist' || c.isEscalated || c.secondOpinionRequested)
      .sort((a, b) => (b.severity === 'Critical' ? 1 : 0) - (a.severity === 'Critical' ? 1 : 0));
  }, [readyCases]);

  // Escalated / Teleradiology cases
  const teleradiologyCases = useMemo(() => {
    return cases
      .filter((c) => c.isEscalated || c.routedToRole === 'Radiologist' || c.secondOpinionRequested)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [cases]);

  // Finalized / completed cases
  const finalizedCases = useMemo(() => {
    return cases
      .filter((c) => c.status === 'COMPLETED' || c.status === 'FINALIZED' || c.status === 'REPORT_SUBMITTED')
      .sort((a, b) => (b.finalizedAt || b.createdAt).localeCompare(a.finalizedAt || a.createdAt));
  }, [cases]);

  // Selected case object for authoring / viewing
  const selectedCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId);
  }, [cases, selectedCaseId]);

  // Existing report for selected case
  const existingReport = useMemo(() => {
    if (!selectedCase) return null;
    return reports.find((r) => r.caseId === selectedCase.id) || null;
  }, [selectedCase, reports]);

  // Finalized / locked state
  const isCaseFinalized = useMemo(() => {
    if (!selectedCase) return false;
    return (
      selectedCase.status === 'COMPLETED' ||
      selectedCase.status === 'FINALIZED' ||
      selectedCase.status === 'REPORT_SUBMITTED' ||
      !!existingReport
    );
  }, [selectedCase, existingReport]);

  // Sync caseId when changed from outside
  useEffect(() => {
    if (caseIdFromUrl) {
      setSelectedCaseId(caseIdFromUrl);
      setActiveTab('reporting');
    }
  }, [caseIdFromUrl]);

  // Pre-fill existing report draft or findings ONLY when a case is selected
  useEffect(() => {
    if (!selectedCase) {
      setFindings('');
      setImpression('');
      setSuggestions('');
      setIsCriticalFinding(false);
      setCriticalFindingNote('');
      return;
    }

    if (existingReport) {
      setFindings(existingReport.findings || '');
      setImpression(existingReport.impression || '');
      setSuggestions(existingReport.suggestions || '');
      setIsCriticalFinding(!!existingReport.isCriticalFinding);
      setCriticalFindingNote(existingReport.criticalFindingNote || '');
    } else {
      setFindings(selectedCase.preliminaryFindings || selectedCase.radiographerFindings || '');
      setImpression(selectedCase.preliminaryImpression || selectedCase.radiographerImpression || '');
      setSuggestions(selectedCase.preliminarySuggestions || '');
      setIsCriticalFinding(!!selectedCase.isCriticalFinding);
      setCriticalFindingNote(selectedCase.criticalFindingNote || '');
    }
    setAiAnalysisMetadata(null);
  }, [selectedCase?.id, existingReport]);

  // AI Clinical Decision Support System (CDSS) draft generator
  const handleGenerateAiDraft = async () => {
    if (!selectedCase) return;
    setIsVisionAiAnalyzing(true);
    try {
      const matchingPatient = patients?.find((p) => p.id === selectedCase.patientId);

      if (selectedCase.images && selectedCase.images.length > 0) {
        const loaded = await loadImages([selectedCase.images[0]]);
        if (loaded.length > 0) {
          const result = await analyzeImageWithVisionAi(loaded[0], selectedCase, matchingPatient);
          setFindings(result.findings);
          setImpression(result.impression);
          if (result.suggestions) setSuggestions(result.suggestions);
          if (result.isCritical) {
            setIsCriticalFinding(true);
            if (result.criticalReason) {
              setCriticalFindingNote(result.criticalReason);
            }
          }
          setAiAnalysisMetadata({
            aiModel: result.aiModel,
            indication: selectedCase.indication || selectedCase.ringkasanKlinikal || selectedCase.notes || 'Clinical evaluation',
            historySummary: matchingPatient?.medicalHistory && matchingPatient.medicalHistory.length > 0
              ? matchingPatient.medicalHistory.join(', ')
              : 'No prior chronic conditions recorded',
            clinicalCorrelation: result.clinicalCorrelationNotes,
            clinicalMismatchAlert: result.clinicalMismatchAlert,
            confidenceScore: result.confidenceScore,
            detectedFeatures: result.detectedFeatures,
          });
          toast.success(`Clinical CDSS draft generated with patient history grounding (${result.confidenceScore}% confidence).`);
          return;
        }
      }

      const draft = generateAiReportDraft(selectedCase, matchingPatient);
      setFindings(draft.findings);
      setImpression(draft.impression);
      if (draft.suggestions) setSuggestions(draft.suggestions);
      setAiAnalysisMetadata({
        aiModel: 'HealthGrid Clinical CDSS (Protocol Engine)',
        indication: selectedCase.indication || selectedCase.ringkasanKlinikal || selectedCase.notes || 'Clinical evaluation',
        historySummary: matchingPatient?.medicalHistory && matchingPatient.medicalHistory.length > 0
          ? matchingPatient.medicalHistory.join(', ')
          : 'No prior chronic conditions recorded',
        confidenceScore: draft.confidenceScore,
      });
      toast.success(`Clinical protocol draft generated (${draft.confidenceScore}% confidence).`);
    } catch {
      toast.error('AI draft generation failed. Please enter findings manually.');
    } finally {
      setIsVisionAiAnalyzing(false);
    }
  };

  // Submit Final Report
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCase) return;

    if (!findings.trim() || !impression.trim()) {
      toast.error('Please fill in both Clinical Findings and Diagnostic Impression.');
      return;
    }

    setSaving(true);
    try {
      const reportToken = generateReportToken(selectedCase.id);

      await addReport({
        caseId: selectedCase.id,
        caseNumber: selectedCase.caseNumber,
        patientName: selectedCase.patientName,
        radiologistId: currentUser.id,
        radiologistName: currentUser.name,
        signedByRole: currentUser.role,
        findings: findings.trim(),
        impression: impression.trim(),
        suggestions: suggestions.trim() || undefined,
        isCriticalFinding,
        criticalFindingNote: isCriticalFinding ? criticalFindingNote.trim() : undefined,
        createdAt: new Date().toISOString(),
        signedAt: new Date().toISOString(),
        status: 'final',
        reportToken,
      });

      await editCase(selectedCase.id, {
        status: 'COMPLETED',
        finalizedAt: new Date().toISOString(),
      });

      // Check if this case has a CrossOrganizationReferral awaiting report signature
      const matchingCrossRef = crossOrgReferrals?.find((r) => r.caseId === selectedCase.id);
      if (matchingCrossRef && signCrossOrgReferralReport) {
        await signCrossOrgReferralReport(matchingCrossRef.id, reportToken, currentUser.id, currentUser.name);
      }

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'DIAGNOSTIC_REPORT_FINALIZED',
        target: `cases/${selectedCase.id}`,
        details: `${currentUser.role} ${currentUser.name} signed diagnostic report for Case #${selectedCase.caseNumber}.`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Diagnostic report for Case ${selectedCase.caseNumber} officially signed and finalized.`);

      // Switch to reports archive tab to view/print the completed report
      setActiveTab('archive');
    } catch (err: any) {
      console.error('Failed to save report:', err);
      toast.error(err.message || 'Failed to finalize diagnostic report.');
    } finally {
      setSaving(false);
    }
  };

  // Request In-House Radiologist Review (2nd Opinion with Preliminary Report Draft Attached)
  const handleConfirmEscalation = async () => {
    if (!selectedCase || !currentUser) return;
    setSaving(true);
    try {
      const assignedRad = inHouseRadiologists.find((r) => r.id === selectedRadiologistId) || inHouseRadiologists[0];
      const radId = assignedRad?.id || selectedCase.radiologistId || '';
      const radName = assignedRad?.name || selectedCase.radiologistName || 'In-House Radiologist';

      await editCase(selectedCase.id, {
        status: 'RADIOLOGIST_REVIEW',
        routedToRole: 'Radiologist',
        isEscalated: true,
        secondOpinionRequested: true,
        assignedRadiologistId: radId,
        assignedRadiologistName: radName,
        radiologistId: radId,
        radiologistName: radName,
        preliminaryFindings: findings.trim() || undefined,
        preliminaryImpression: impression.trim() || undefined,
        preliminarySuggestions: suggestions.trim() || undefined,
        preliminaryAuthorId: currentUser.id,
        preliminaryAuthorName: currentUser.name,
        preliminaryAuthorRole: currentUser.role,
        preliminarySubmittedAt: new Date().toISOString(),
        escalationReason: escalateReason,
        notes: escalateNotes.trim()
          ? `${selectedCase.notes || ''}\n[In-House 2nd Opinion (${escalateReason}) assigned to ${radName}]: ${escalateNotes}`
          : selectedCase.notes,
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CASE_ESCALATED_TO_RADIOLOGIST',
        target: `cases/${selectedCase.id}`,
        details: `Medical Officer ${currentUser.name} requested In-House 2nd Opinion for Case #${selectedCase.caseNumber} and assigned to In-House Radiologist ${radName} (${escalateReason}) with preliminary draft report attached.`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Case ${selectedCase.caseNumber} and preliminary draft assigned to ${radName}.`);
      setShowEscalateModal(false);
      setActiveTab('incoming');
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign to in-house radiologist.');
    } finally {
      setSaving(false);
    }
  };

  // Save Clinical Addendum / Amendment
  const handleSaveAddendum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !existingReport || !selectedCase) return;
    if (!addendumContent.trim()) {
      toast.error('Please enter the clinical addendum text.');
      return;
    }

    setSubmittingAddendum(true);
    try {
      await addReportAddendum(existingReport.id, {
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        content: addendumContent.trim(),
        reason: addendumReason,
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'DIAGNOSTIC_REPORT_ADDENDUM_ADDED',
        target: `reports/${existingReport.id}`,
        details: `${currentUser.role} ${currentUser.name} signed Clinical Addendum on Case #${selectedCase.caseNumber} (${addendumReason}).`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Clinical Addendum attached to Case #${selectedCase.caseNumber}.`);
      setAddendumContent('');
      setShowAddendumModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to attach clinical addendum.');
    } finally {
      setSubmittingAddendum(false);
    }
  };

  const startAuthoringCase = (c: Case) => {
    setSelectedCaseId(c.id);
    setActiveTab('reporting');
    setSearchParams({ caseId: c.id, tab: 'reporting' });
  };

  // Filter reports archive
  const filteredReports = useMemo(() => {
    const q = archiveSearch.toLowerCase().trim();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.caseNumber?.toLowerCase().includes(q) ||
        r.patientName?.toLowerCase().includes(q) ||
        r.radiologistName?.toLowerCase().includes(q) ||
        r.findings?.toLowerCase().includes(q) ||
        r.impression?.toLowerCase().includes(q)
    );
  }, [reports, archiveSearch]);

  const incomingCases = isRadiologist ? radiologistReviewCases : moReviewCases;
  const escalatedCases = teleradiologyCases;

  const filteredIncomingCases = useMemo(() => {
    return incomingCases.filter((c) => {
      if (queueSearch) {
        const q = queueSearch.toLowerCase().trim();
        const match =
          c.caseNumber?.toLowerCase().includes(q) ||
          c.patientName?.toLowerCase().includes(q) ||
          c.patientId?.toLowerCase().includes(q) ||
          c.modality?.toLowerCase().includes(q) ||
          c.scanType?.toLowerCase().includes(q) ||
          c.bodyRegion?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (queueModalityFilter !== 'all' && c.modality !== queueModalityFilter) {
        return false;
      }
      if (queueSeverityFilter !== 'all' && c.severity !== queueSeverityFilter) {
        return false;
      }
      return true;
    });
  }, [incomingCases, queueSearch, queueModalityFilter, queueSeverityFilter]);

  const filteredEscalatedCases = useMemo(() => {
    return escalatedCases.filter((c) => {
      if (queueSearch) {
        const q = queueSearch.toLowerCase().trim();
        const match =
          c.caseNumber?.toLowerCase().includes(q) ||
          c.patientName?.toLowerCase().includes(q) ||
          c.patientId?.toLowerCase().includes(q) ||
          c.modality?.toLowerCase().includes(q) ||
          c.scanType?.toLowerCase().includes(q) ||
          c.bodyRegion?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (queueModalityFilter !== 'all' && c.modality !== queueModalityFilter) {
        return false;
      }
      if (queueSeverityFilter !== 'all' && c.severity !== queueSeverityFilter) {
        return false;
      }
      return true;
    });
  }, [escalatedCases, queueSearch, queueModalityFilter, queueSeverityFilter]);

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER & ACTIONS
      ====================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
            Diagnostic Review &amp; Reporting Hub
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Triage incoming medical scans, author diagnostic reports, and manage finalized report archives.
          </p>
        </div>
      </div>

      {/* =====================================================
          TABS: 4 UNIFIED WORKSPACES
      ====================================================== */}
      <div className="flex border-b border-surface-200 gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('incoming');
            setSearchParams({});
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'incoming'
            ? 'border-[#0F4C42] text-[#0F4C42]'
            : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
        >
          <Clock className="w-4 h-4" />
          New Scans ({incomingCases.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('escalated');
            setSearchParams({});
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'escalated'
            ? 'border-[#0F4C42] text-[#0F4C42]'
            : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
        >
          <Send className="w-4 h-4" />
          Sent to Specialist ({escalatedCases.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reporting')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reporting'
            ? 'border-[#0F4C42] text-[#0F4C42]'
            : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
        >
          <FileText className="w-4 h-4" />
          Write Report Desk {selectedCase ? `(Case #${selectedCase.caseNumber})` : ''}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('archive');
            setSearchParams({});
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'archive'
            ? 'border-[#0F4C42] text-[#0F4C42]'
            : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
        >
          <Printer className="w-4 h-4" />
          Reports Archive ({reports.length})
        </button>
      </div>

      {/* =====================================================
          TOP QUICK METRIC CARDS
      ====================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: New Scans */}
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${activeTab === 'incoming'
            ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20 shadow-xs'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
          <div className="w-9 h-9 shrink-0 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-surface-600 truncate">New Scans</p>
            <p className="text-lg font-bold text-amber-700">{incomingCases.length}</p>
          </div>
        </button>

        {/* Card 2: Sent to Specialist */}
        <button
          type="button"
          onClick={() => setActiveTab('escalated')}
          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${activeTab === 'escalated'
            ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20 shadow-xs'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
          <div className="w-9 h-9 shrink-0 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Send className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-surface-600 truncate">Sent to Specialist</p>
            <p className="text-lg font-bold text-purple-700">{escalatedCases.length}</p>
          </div>
        </button>

        {/* Card 3: Reports Archive */}
        <button
          type="button"
          onClick={() => setActiveTab('archive')}
          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${activeTab === 'archive'
            ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20 shadow-xs'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
          <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-surface-600 truncate">Reports Archive</p>
            <p className="text-lg font-bold text-emerald-700">{reports.length}</p>
          </div>
        </button>

        {/* Card 4: Total PACS Scans */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-surface-600 truncate">Total PACS Scans</p>
            <p className="text-lg font-bold text-sky-700">{cases.filter((c) => c.images?.length).length}</p>
          </div>
        </div>
      </div>

      {/* ── TAB 1: NEW INCOMING SCANS ───────────────────────────────────── */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card p-4 space-y-3 bg-white border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient name, case #, Patient ID, notes..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="input-field pl-9 text-xs"
                />
              </div>

              {/* Modality Filter */}
              <div>
                <select
                  value={queueModalityFilter}
                  onChange={(e) => setQueueModalityFilter(e.target.value)}
                  className="input-field text-xs cursor-pointer"
                >
                  <option value="all">All Modalities</option>
                  <option value="X-Ray">X-Ray (General Radiography)</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="CT Scan">CT Scan</option>
                  <option value="MRI">MRI</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={queueSeverityFilter}
                  onChange={(e) => setQueueSeverityFilter(e.target.value)}
                  className="input-field text-xs cursor-pointer flex-1"
                >
                  <option value="all">All Priorities</option>
                  <option value="Critical">Critical Red Flag</option>
                  <option value="Urgent">Urgent Priority</option>
                  <option value="Routine">Routine / Elective</option>
                </select>

                {(queueSearch || queueModalityFilter !== 'all' || queueSeverityFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueueSearch('');
                      setQueueModalityFilter('all');
                      setQueueSeverityFilter('all');
                    }}
                    className="px-2.5 py-2 text-xs font-semibold text-surface-500 hover:text-navy-700 hover:bg-surface-100 rounded-lg transition-colors whitespace-nowrap border border-slate-200"
                    title="Clear Filters"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredIncomingCases.map((c) => {
              const isFinal = c.status === 'COMPLETED' || c.status === 'FINALIZED' || c.status === 'REPORT_SUBMITTED';

              return (
                <div
                  key={c.id}
                  className={`card p-4 border transition-all ${c.severity === 'Critical'
                    ? 'bg-red-50/50 border-red-300'
                    : isFinal
                      ? 'bg-slate-50/70 border-slate-200'
                      : 'bg-white border-slate-300 shadow-xs'
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/case/${c.id}`}
                          className="font-mono font-bold text-xs text-[#0F4C42] hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                        <SeverityBadge severity={c.severity} />
                        <StatusBadge status={c.status} />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <span className="font-bold">{c.patientName}</span>
                        <span className="text-slate-400">|</span>
                        <span>Patient ID: <span className="font-mono">{c.patientId}</span></span>
                      </div>

                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{c.modality || 'X-Ray'}</span> — {c.scanType}
                        {c.bodyRegion ? ` • ${c.bodyRegion}` : ''}
                        {c.notes ? ` • ${c.notes}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Facility: <span className="font-medium text-slate-600">{c.originatingCenterName || c.clinicName || '—'}</span> •
                        Registrar: <span className="font-medium text-slate-600">{getCaseRegistrar(c)}</span> •
                        Registered: {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      {!isFinal ? (
                        <button
                          type="button"
                          onClick={() => startAuthoringCase(c)}
                          className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Author Report</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCaseId(c.id);
                            setActiveTab('reporting');
                          }}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredIncomingCases.length === 0 && (
              <div className="card p-12 text-center text-slate-400 space-y-2 bg-white">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-700">No New Scans</h3>
                <p className="text-xs text-slate-500">
                  {queueSearch || queueModalityFilter !== 'all' || queueSeverityFilter !== 'all'
                    ? 'No medical scans match the specified search and filter criteria.'
                    : 'No pending medical scans awaiting review in this section.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SENT TO SPECIALIST (TELERADIOLOGY) ────────────────────── */}
      {activeTab === 'escalated' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card p-4 space-y-3 bg-white border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search escalated cases, patient name, notes..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="input-field pl-9 text-xs"
                />
              </div>

              {/* Modality Filter */}
              <div>
                <select
                  value={queueModalityFilter}
                  onChange={(e) => setQueueModalityFilter(e.target.value)}
                  className="input-field text-xs cursor-pointer"
                >
                  <option value="all">All Modalities</option>
                  <option value="X-Ray">X-Ray (General Radiography)</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="CT Scan">CT Scan</option>
                  <option value="MRI">MRI</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={queueSeverityFilter}
                  onChange={(e) => setQueueSeverityFilter(e.target.value)}
                  className="input-field text-xs cursor-pointer flex-1"
                >
                  <option value="all">All Priorities</option>
                  <option value="Critical">Critical Red Flag</option>
                  <option value="Urgent">Urgent Priority</option>
                  <option value="Routine">Routine / Elective</option>
                </select>

                {(queueSearch || queueModalityFilter !== 'all' || queueSeverityFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueueSearch('');
                      setQueueModalityFilter('all');
                      setQueueSeverityFilter('all');
                    }}
                    className="px-2.5 py-2 text-xs font-semibold text-surface-500 hover:text-navy-700 hover:bg-surface-100 rounded-lg transition-colors whitespace-nowrap border border-slate-200"
                    title="Clear Filters"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredEscalatedCases.map((c) => {
              const isFinal = c.status === 'COMPLETED' || c.status === 'FINALIZED' || c.status === 'REPORT_SUBMITTED';

              return (
                <div
                  key={c.id}
                  className={`card p-4 border transition-all ${c.severity === 'Critical'
                    ? 'bg-red-50/50 border-red-300'
                    : isFinal
                      ? 'bg-slate-50/70 border-slate-200'
                      : 'bg-purple-50/30 border-purple-200 shadow-xs'
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/case/${c.id}`}
                          className="font-mono font-bold text-xs text-[#0F4C42] hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                        <SeverityBadge severity={c.severity} />
                        <StatusBadge status={c.status} />
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded border border-purple-200">
                          Specialist Referral Active
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <span className="font-bold">{c.patientName}</span>
                        <span className="text-slate-400">|</span>
                        <span>Patient ID: <span className="font-mono">{c.patientId}</span></span>
                      </div>

                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{c.modality || 'X-Ray'}</span> — {c.scanType}
                        {c.bodyRegion ? ` • ${c.bodyRegion}` : ''}
                        {c.notes ? ` • ${c.notes}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Facility: <span className="font-medium text-slate-600">{c.originatingCenterName || c.clinicName || '—'}</span> •
                        Registrar: <span className="font-medium text-slate-600">{getCaseRegistrar(c)}</span> •
                        Escalated Date: {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      {!isFinal ? (
                        <button
                          type="button"
                          onClick={() => startAuthoringCase(c)}
                          className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs bg-purple-700 hover:bg-purple-800 border-purple-700"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Specialist Reporting</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCaseId(c.id);
                            setActiveTab('reporting');
                          }}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredEscalatedCases.length === 0 && (
              <div className="card p-12 text-center text-slate-400 space-y-2 bg-white">
                <CheckCircle2 className="w-10 h-10 mx-auto text-purple-500" />
                <h3 className="text-sm font-bold text-slate-700">No Specialist Escalations</h3>
                <p className="text-xs text-slate-500">
                  {queueSearch || queueModalityFilter !== 'all' || queueSeverityFilter !== 'all'
                    ? 'No escalated cases match the specified search and filter criteria.'
                    : 'There are currently no cases referred to specialist radiologists.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CLINICAL REPORT AUTHORING DESK ───────────────────────── */}
      {activeTab === 'reporting' && (
        <form onSubmit={handleSaveReport} className="space-y-5">
          {/* ================================================================
              CASE HEADER
          ================================================================= */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0F4C42]/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#0F4C42]" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Clinical Report
                      </h2>

                      <p className="text-[11px] text-slate-500">
                        Review the imaging study and complete the diagnostic report
                      </p>
                    </div>
                  </div>
                </div>

                {/* Case selector */}
                <div className="w-full lg:w-[430px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Reporting Case
                  </label>

                  <select
                    required
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0F4C42] focus:ring-2 focus:ring-[#0F4C42]/10"
                  >
                    <option value="">
                      Select an imaging case...
                    </option>

                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber} — {c.patientName} ({c.modality || 'X-Ray'} · {c.scanType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Case metadata */}
            {selectedCase && (
              <div className="px-5 py-4 bg-slate-50/70">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-4">
                  {/* Patient */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Patient
                    </span>

                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#0F4C42]" />

                      <span className="text-xs font-bold text-slate-900 truncate">
                        {selectedCase.patientName}
                      </span>
                    </div>

                    <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                      ID: {selectedCase.patientId}
                    </span>
                  </div>

                  {/* Case */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Case
                    </span>

                    <span className="block text-xs font-bold font-mono text-[#0F4C42]">
                      #{selectedCase.caseNumber}
                    </span>

                    <span className="block text-[10px] text-slate-500 mt-0.5 truncate">
                      {selectedCase.clinicName}
                    </span>
                  </div>

                  {/* Examination */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Examination
                    </span>

                    <span className="block text-xs font-bold text-slate-800">
                      {selectedCase.modality || 'X-Ray'}
                    </span>

                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      {selectedCase.scanType}
                      {selectedCase.bodyRegion
                        ? ` · ${selectedCase.bodyRegion}`
                        : ''}
                    </span>
                  </div>

                  {/* Indication */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Clinical Indication
                    </span>

                    <p className="text-[11px] leading-relaxed text-slate-700 font-medium line-clamp-2">
                      {getCaseIndication(selectedCase)}
                    </p>
                  </div>

                  {/* Severity */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Priority
                    </span>

                    <SeverityBadge severity={selectedCase.severity} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================
              EMPTY STATE
          ================================================================= */}
          {!selectedCase && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>

              <h3 className="text-sm font-bold text-slate-800">
                Select a case to begin
              </h3>

              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Choose an imaging case above to open the PACS viewer and diagnostic
                report workspace.
              </p>
            </div>
          )}

          {/* ================================================================
              REPORTING WORKSPACE
          ================================================================= */}
          {selectedCase && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-5 items-start">
              {/* ============================================================
                  PACS VIEWER
              ============================================================= */}
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Viewer header */}
                <div className="px-5 py-3.5 border-b border-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#0F4C42]/10 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-[#0F4C42]" />
                      </div>

                      <div>
                        <h2 className="text-xs font-bold text-slate-900">
                          PACS Image Viewer
                        </h2>

                        <p className="text-[10px] text-slate-500">
                          Review the imaging study
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedCase.severity === 'Critical' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 border border-red-200 text-[10px] font-bold text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          Critical
                        </span>
                      )}

                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        {selectedCase.images?.length || 0} scan
                        {(selectedCase.images?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PACS */}
                <div className="p-4">
                  {selectedCase.images && selectedCase.images.length > 0 ? (
                    <PacsImageViewer
                      imageKeys={selectedCase.images}
                      caseItem={selectedCase}
                    />
                  ) : (
                    <div className="min-h-[440px] flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-slate-800">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                        <ImageIcon className="w-6 h-6 text-slate-500" />
                      </div>

                      <p className="text-xs font-bold text-slate-300">
                        No imaging available
                      </p>

                      <p className="text-[11px] text-slate-500 mt-1">
                        No PACS images have been uploaded for this case.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* ============================================================
                  REPORT EDITOR
              ============================================================= */}
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Report header */}
                <div className="px-5 py-3.5 border-b border-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCaseFinalized ? 'bg-emerald-50 text-emerald-700' : 'bg-[#0F4C42]/10 text-[#0F4C42]'}`}>
                        {isCaseFinalized ? <Lock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xs font-bold text-slate-900">
                            Diagnostic Report
                          </h2>
                          {isCaseFinalized && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Signed &amp; Finalized
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500">
                          {isCaseFinalized
                            ? 'Official signed medical record · Immutable'
                            : 'Author and finalize the clinical report'}
                        </p>
                      </div>
                    </div>

                    {/* Header Action Button */}
                    {isCaseFinalized ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (existingReport) handlePrintReport(existingReport);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition-colors shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#0F4C42]" />
                        <span>Print MOH Report</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateAiDraft}
                        disabled={isVisionAiAnalyzing}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#0F4C42]/25 bg-[#0F4C42]/5 text-[#0F4C42] hover:bg-[#0F4C42]/10 hover:border-[#0F4C42]/40 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-semibold transition-all shadow-xs"
                      >
                        <Sparkles
                          className={`w-3.5 h-3.5 ${isVisionAiAnalyzing ? 'animate-pulse text-[#0F4C42]' : ''}`}
                        />
                        {isVisionAiAnalyzing ? 'Evaluating Patient History & Pixels…' : 'Generate Clinical CDSS Draft'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Editor Body */}
                <div className="p-5 space-y-5 flex-1">
                  {/* Finalized Locked Record Banner */}
                  {isCaseFinalized && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                            Immutable Medical Record
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          MOH Clinical Governance
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        This report was officially signed by <strong className="text-slate-900">{existingReport?.radiologistName || selectedCase.radiologistName || 'Attending Doctor'}</strong> ({existingReport?.signedByRole || 'Medical Officer'}) on{' '}
                        <strong>{existingReport?.signedAt ? new Date(existingReport.signedAt).toLocaleString() : 'Finalized'}</strong>.
                        To maintain clinical audit integrity and legal compliance, finalized reports cannot be edited. If supplementary findings are required, please use <strong>+ Add Clinical Addendum</strong>.
                      </p>
                    </div>
                  )}

                  {/* In-House 2nd Opinion Context Banner */}
                  {!isCaseFinalized && selectedCase.isEscalated && selectedCase.preliminaryAuthorName && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 text-purple-950 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-purple-700 shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                            In-House 2nd Opinion Review
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200 inline-flex items-center gap-1 w-fit">
                          <User className="w-3 h-3 text-purple-600" />
                          Preliminary Draft by {selectedCase.preliminaryAuthorName} ({selectedCase.preliminaryAuthorRole || 'Medical Officer'})
                        </span>
                      </div>
                      <p className="text-xs text-purple-900 leading-relaxed">
                        <strong>Reason:</strong> {selectedCase.escalationReason || 'Suspected Abnormality / Requires Specialist Opinion'}
                      </p>
                      <p className="text-[11px] text-purple-700">
                        The preliminary findings and impressions entered by {selectedCase.preliminaryAuthorName} have been pre-filled below for your in-house specialist review, refinement, and final sign-off.
                      </p>
                    </div>
                  )}

                  {/* Clinical CDSS Grounding & Context Card */}
                  {aiAnalysisMetadata && (
                    <div className="rounded-xl border border-[#0F4C42]/25 bg-[#0F4C42]/5 p-4 text-slate-800 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#0F4C42] shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C42]">
                            Clinical Decision Support System (CDSS)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-[#0F4C42]/20 text-[#0F4C42]">
                            {aiAnalysisMetadata.aiModel}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {aiAnalysisMetadata.confidenceScore}% Confidence
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1.5 border-t border-[#0F4C42]/15">
                        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                            Patient Medical History Grounded
                          </span>
                          <span className="text-slate-800 font-medium text-[11px]">
                            {aiAnalysisMetadata.historySummary}
                          </span>
                        </div>

                        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                            Presenting Clinical Indication
                          </span>
                          <span className="text-slate-800 font-medium text-[11px]">
                            {aiAnalysisMetadata.indication}
                          </span>
                        </div>
                      </div>

                      {aiAnalysisMetadata.clinicalCorrelation && (
                        <div className="text-xs text-slate-800 bg-white/90 p-2.5 rounded-lg border border-[#0F4C42]/20">
                          <span className="font-bold text-[#0F4C42] block text-[10px] uppercase tracking-wider mb-0.5">
                            Pathology &amp; Symptom Correlation:
                          </span>
                          <p className="text-[11px] leading-relaxed text-slate-700">
                            {aiAnalysisMetadata.clinicalCorrelation}
                          </p>
                        </div>
                      )}

                      {aiAnalysisMetadata.clinicalMismatchAlert && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-amber-900 font-bold mb-0.5">
                              Clinical Discrepancy Flag:
                            </strong>
                            <span className="text-[11px] leading-relaxed">
                              {aiAnalysisMetadata.clinicalMismatchAlert}
                            </span>
                          </div>
                        </div>
                      )}

                      {aiAnalysisMetadata.detectedFeatures && aiAnalysisMetadata.detectedFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {aiAnalysisMetadata.detectedFeatures.map((feat, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Findings */}
                  <div>
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-900">
                          Clinical Findings
                          {!isCaseFinalized && <span className="text-red-500 ml-1">*</span>}
                        </label>

                        <span className="text-[10px] text-slate-400">
                          Objective radiological observations
                        </span>
                      </div>

                      {isCaseFinalized ? (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Locked
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          Required
                        </span>
                      )}
                    </div>

                    <textarea
                      required
                      disabled={isCaseFinalized}
                      value={findings}
                      onChange={(e) => setFindings(e.target.value)}
                      placeholder="Describe the radiological findings..."
                      rows={7}
                      className={`w-full resize-y min-h-[160px] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed transition ${isCaseFinalized
                        ? 'bg-slate-50 border border-slate-200 text-slate-900 font-medium cursor-default focus:outline-none'
                        : 'bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/10 focus:border-[#0F4C42]'
                        }`}
                    />
                  </div>

                  {/* Impression */}
                  <div>
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-900">
                          Diagnostic Impression
                          {!isCaseFinalized && <span className="text-red-500 ml-1">*</span>}
                        </label>

                        <span className="text-[10px] text-slate-400">
                          Primary radiological diagnosis or conclusion
                        </span>
                      </div>

                      {isCaseFinalized ? (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Locked
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          Required
                        </span>
                      )}
                    </div>

                    <textarea
                      required
                      disabled={isCaseFinalized}
                      value={impression}
                      onChange={(e) => setImpression(e.target.value)}
                      placeholder="Enter the primary diagnostic impression..."
                      rows={4}
                      className={`w-full resize-y min-h-[95px] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed font-medium transition ${isCaseFinalized
                        ? 'bg-slate-50 border border-slate-200 text-slate-900 cursor-default focus:outline-none'
                        : 'bg-slate-50/70 border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/10 focus:border-[#0F4C42]'
                        }`}
                    />
                  </div>

                  {/* Recommendations */}
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Clinical Recommendations / Suggestions
                    </label>

                    <p className="text-[10px] text-slate-400 mb-2">
                      Optional recommendations for follow-up imaging, biopsy, clinical correlation, or patient management
                    </p>

                    <textarea
                      disabled={isCaseFinalized}
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.target.value)}
                      placeholder="Add follow-up imaging, referral, or other clinical recommendations..."
                      rows={3}
                      className={`w-full resize-y min-h-[75px] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed transition ${isCaseFinalized
                        ? 'bg-slate-50 border border-slate-200 text-slate-900 cursor-default focus:outline-none'
                        : 'bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/10 focus:border-[#0F4C42]'
                        }`}
                    />
                  </div>

                  {/* Critical finding */}
                  <div
                    className={`rounded-lg border transition-colors ${isCriticalFinding
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 bg-slate-50'
                      }`}
                  >
                    <label className={`flex items-start gap-3 p-3.5 ${isCaseFinalized ? 'cursor-default' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        disabled={isCaseFinalized}
                        checked={isCriticalFinding}
                        onChange={(e) =>
                          setIsCriticalFinding(e.target.checked)
                        }
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 disabled:opacity-80"
                      />

                      <div>
                        <span
                          className={`block text-xs font-bold ${isCriticalFinding
                            ? 'text-red-900'
                            : 'text-slate-800'
                            }`}
                        >
                          Critical / Urgent Finding
                        </span>

                        <span
                          className={`block text-[10px] mt-0.5 ${isCriticalFinding
                            ? 'text-red-700'
                            : 'text-slate-500'
                            }`}
                        >
                          Mark this report for immediate clinical notification.
                        </span>
                      </div>
                    </label>

                    {isCriticalFinding && (
                      <div className="px-3.5 pb-3.5">
                        <input
                          type="text"
                          disabled={isCaseFinalized}
                          value={criticalFindingNote}
                          onChange={(e) =>
                            setCriticalFindingNote(e.target.value)
                          }
                          placeholder="e.g., Immediate notification: pneumothorax, intracranial hemorrhage..."
                          className="w-full h-9 px-3 bg-white border border-red-300 rounded-lg text-xs text-red-950 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 read-only:bg-red-50/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Addendums List (If any exist) */}
                  {existingReport?.addendums && existingReport.addendums.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-purple-700" />
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Official Clinical Addendums ({existingReport.addendums.length})
                        </h3>
                      </div>

                      {existingReport.addendums.map((add, idx) => (
                        <div key={add.id || idx} className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-purple-200/60 pb-2">
                            <span className="font-bold text-xs text-purple-950">
                              Addendum #{idx + 1} &middot; {add.reason || 'Clinical Update'}
                            </span>
                            <span className="text-[11px] text-purple-700 font-mono">
                              {new Date(add.signedAt || add.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {add.content}
                          </p>
                          <p className="text-[10px] text-purple-800 font-medium pt-1">
                            Signed by: <strong>{add.authorName}</strong> ({add.authorRole})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ========================================================
                    REPORT ACTIONS
                ========================================================= */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                  {isCaseFinalized ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <Lock className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Signed record is locked from direct edits</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (existingReport) handlePrintReport(existingReport);
                          }}
                          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#0F4C42]" />
                          <span>Print / PDF Report</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowAddendumModal(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F4C42] hover:bg-[#0B3D35] text-white text-xs font-bold shadow-sm transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ Add Clinical Addendum</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Escalation */}
                      <div>
                        {isDoctor && (
                          <button
                            type="button"
                            onClick={() => setShowEscalateModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-300 text-xs font-semibold transition-all"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Request In-House Radiologist Review
                          </button>
                        )}
                      </div>

                      {/* Main actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('incoming')}
                          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0F4C42] hover:bg-[#0B3D35] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-colors"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />

                          {saving
                            ? 'Signing Report...'
                            : isRadiologist
                              ? 'Sign & Finalize Specialist Report'
                              : 'Sign & Finalize Report'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ================================================================
              IN-HOUSE RADIOLOGIST 2ND OPINION MODAL
          ================================================================= */}
          {showEscalateModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Send className="w-4 h-4 text-purple-700" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Request In-House Radiologist Review
                      </h3>

                      <p className="text-[10px] text-slate-500">
                        Facility: <strong className="text-slate-700">{userCenterName}</strong> (Internal 2nd Opinion)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal content */}
                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  {/* Attached Preliminary Draft Card */}
                  {(findings.trim() || impression.trim()) ? (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <FileText className="w-3.5 h-3.5 text-[#0F4C42]" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                            Preliminary Report Attached
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Auto-Forwarded to Radiologist
                        </span>
                      </div>
                      {findings.trim() && (
                        <p className="text-xs text-slate-700 line-clamp-2">
                          <strong className="text-slate-900">Findings:</strong> {findings}
                        </p>
                      )}
                      {impression.trim() && (
                        <p className="text-xs text-slate-700 line-clamp-1">
                          <strong className="text-slate-900">Impression:</strong> {impression}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Drafter: <span className="font-semibold text-slate-600">{currentUser?.name}</span> ({currentUser?.role || 'Medical Officer'})
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                      <strong>Note:</strong> You can type preliminary findings in the main editor before opening this modal so your draft is attached automatically for the radiologist.
                    </div>
                  )}

                  {/* 1. Select In-House Radiologist */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      1. Select In-House Center Radiologist *
                    </label>

                    <select
                      value={selectedRadiologistId}
                      onChange={(e) => setSelectedRadiologistId(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 cursor-pointer"
                    >
                      {inHouseRadiologists.length > 0 ? (
                        inHouseRadiologists.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} {r.qualification ? `(${r.qualification})` : ''} {r.specialty ? `— ${r.specialty}` : ''}
                          </option>
                        ))
                      ) : (
                        <option value="">In-House Radiologist on Duty ({userCenterName})</option>
                      )}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Showing radiologists registered directly at <span className="font-semibold text-slate-600">{userCenterName}</span>
                    </p>
                  </div>

                  {/* 2. Reason for In-House Review */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      2. Reason for In-House Review
                    </label>

                    <select
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                    >
                      <option value="Suspected Abnormality / Requires Specialist 2nd Opinion">
                        Suspected Abnormality / Requires Specialist 2nd Opinion
                      </option>

                      <option value="Complex Pathology / Inconclusive Finding">
                        Complex Pathology / Inconclusive Finding
                      </option>

                      <option value="Pediatric Complex Case">
                        Pediatric Complex Case
                      </option>

                      <option value="Suspected Trauma / Fracture Confirmation">
                        Suspected Trauma / Fracture Confirmation
                      </option>

                      <option value="Unclear Image Artifacts">
                        Unclear Image Artifacts
                      </option>

                      <option value="Urgent Pre-Operative Assessment">
                        Urgent Pre-Operative Assessment
                      </option>
                    </select>
                  </div>

                  {/* 3. Clinical Questions / Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      3. Clinical Questions / Specific Inquiry for Radiologist
                    </label>

                    <textarea
                      value={escalateNotes}
                      onChange={(e) => setEscalateNotes(e.target.value)}
                      placeholder="Describe what specific regions or pathologies you would like the in-house specialist to verify..."
                      rows={3}
                      className="w-full resize-none px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Modal footer */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmEscalation}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-xs font-bold shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />

                    {saving
                      ? 'Dispatching...'
                      : 'Dispatch Escalation'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              CLINICAL ADDENDUM MODAL
          ================================================================= */}
          {showAddendumModal && existingReport && selectedCase && (
            <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0F4C42]/10 flex items-center justify-center text-[#0F4C42]">
                      <PlusCircle className="w-4 h-4" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Create Clinical Addendum
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Case #{selectedCase.caseNumber} &middot; {selectedCase.patientName}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddendumModal(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSaveAddendum} className="p-5 space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                    <strong>MOH Protocol Notice:</strong> The original signed findings will remain permanently unaltered. This addendum will be timestamped, attributed to your clinical credentials, and appended to the official diagnostic record.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Reason for Addendum *
                    </label>
                    <select
                      value={addendumReason}
                      onChange={(e) => setAddendumReason(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0F4C42] focus:ring-2 focus:ring-[#0F4C42]/10"
                    >
                      <option value="Supplementary Clinical Information">Supplementary Clinical Information</option>
                      <option value="Comparison with Prior Imaging">Comparison with Prior Imaging</option>
                      <option value="Additional Subspecialty Finding">Additional Subspecialty Finding</option>
                      <option value="Correction of Notation / Laterality">Correction of Notation / Laterality</option>
                      <option value="Post-Procedure Follow-Up Correlation">Post-Procedure Follow-Up Correlation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Addendum Observations &amp; Clinical Notes *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={addendumContent}
                      onChange={(e) => setAddendumContent(e.target.value)}
                      placeholder="Enter the official clinical amendment or supplementary observations..."
                      className="w-full resize-none px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/10 focus:border-[#0F4C42]"
                    />
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddendumModal(false)}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submittingAddendum || !addendumContent.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F4C42] hover:bg-[#0B3D35] disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>{submittingAddendum ? 'Signing Addendum...' : 'Sign & Attach Addendum'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ── TAB 4: FINALIZED REPORTS & PRINT ARCHIVE ────────────────────── */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search signed reports by case #, patient, diagnostician..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F4C42] w-full"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredReports.length} signed report(s) archived
            </span>
          </div>

          {/* Reports Grid */}
          <div className="space-y-3">
            {filteredReports.map((r) => {
              return (
                <div key={r.id} className="card p-4 border border-slate-200 bg-white hover:border-slate-300 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/case/${r.caseId}`}
                          className="font-mono font-bold text-xs text-[#0F4C42] hover:underline"
                        >
                          {r.caseNumber}
                        </Link>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Signed &amp; Finalized
                        </span>
                        {r.isCriticalFinding && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded border border-red-200 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            Critical Finding
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">Patient: {r.patientName}</p>
                      <p className="text-[11px] text-slate-500">
                        Diagnostician: {r.radiologistName} &middot; Signed: {r.signedAt ? new Date(r.signedAt).toLocaleString() : 'Recent'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePrintReport(r)}
                        className="btn-secondary text-xs flex items-center gap-1 text-[#0F4C42]"
                        title="Print official MOH Report"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Report</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewingReport(r)}
                        className="btn-primary text-xs flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5 uppercase tracking-wide text-[10px]">
                        Findings:
                      </span>
                      <p className="text-slate-800 line-clamp-2">{r.findings}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5 uppercase tracking-wide text-[10px]">
                        Impression:
                      </span>
                      <p className="text-slate-800 line-clamp-2">{r.impression}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="card p-12 text-center text-slate-400 space-y-2 bg-white">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No finalized reports found.</p>
              </div>
            )}
          </div>

          {/* Modal View Details */}
          {viewingReport && (
            <Modal isOpen={Boolean(viewingReport)} onClose={() => setViewingReport(null)} title={`Report - Case ${viewingReport.caseNumber}`}>
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{viewingReport.patientName}</h3>
                    <p className="text-[11px] text-slate-500">Case #{viewingReport.caseNumber} &middot; Signed by {viewingReport.radiologistName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePrintReport(viewingReport)}
                    className="btn-primary text-xs flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print MOH Report</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block uppercase tracking-wider text-[11px]">Findings</span>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap text-slate-800">
                    {viewingReport.findings}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block uppercase tracking-wider text-[11px]">Impression</span>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap text-slate-800">
                    {viewingReport.impression}
                  </div>
                </div>

                {viewingReport.suggestions && (
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 block uppercase tracking-wider text-[11px]">Recommendations</span>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap text-slate-800">
                      {viewingReport.suggestions}
                    </div>
                  </div>
                )}

                {/* Addendums in Modal */}
                {viewingReport.addendums && viewingReport.addendums.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <span className="font-bold text-purple-900 block uppercase tracking-wider text-[11px]">
                      Official Clinical Addendums ({viewingReport.addendums.length})
                    </span>
                    {viewingReport.addendums.map((add, idx) => (
                      <div key={add.id || idx} className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-purple-950">Addendum #{idx + 1} &middot; {add.reason || 'Clinical Note'}</span>
                          <span className="text-purple-700 font-mono">{new Date(add.signedAt || add.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{add.content}</p>
                        <p className="text-[10px] text-purple-800 font-medium">Signed by: {add.authorName} ({add.authorRole})</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scan images attachment */}
                {cases.find((c) => c.id === viewingReport.caseId || c.caseNumber === viewingReport.caseNumber)?.images && (
                  <ReportImages
                    imageKeys={
                      cases.find((c) => c.id === viewingReport.caseId || c.caseNumber === viewingReport.caseNumber)?.images
                    }
                  />
                )}
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}
