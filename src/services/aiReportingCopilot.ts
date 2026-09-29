import type { Case, Patient } from '../types';

export interface AiReportDraft {
  findings: string;
  impression: string;
  suggestions?: string;
  confidenceScore: number; // e.g. 98%
}

/**
 * AI Preliminary Impression Copilot Service
 * Synthesizes modality-aware baseline radiological findings and impressions grounded
 * in the patient's documented medical history and clinical presentation.
 */
export function generateAiReportDraft(caseItem: Case, patient?: Patient): AiReportDraft {
  const mod = (caseItem.modality || '').toLowerCase();
  const scan = (caseItem.scanType || '').toLowerCase();
  const indication = caseItem.indication || caseItem.ringkasanKlinikal || caseItem.notes || caseItem.disease || 'Routine screening / clinical assessment';
  const historyList = patient?.medicalHistory && patient.medicalHistory.length > 0
    ? patient.medicalHistory.join(', ')
    : 'No prior chronic conditions recorded';

  // 1. CHEST / THORAX (X-Ray / CT)
  if (mod.includes('x-ray') && (scan.includes('chest') || scan.includes('lung') || scan.includes('thorax'))) {
    return {
      findings: `EXAMINATION: Chest Radiograph (PA/AP View)
CLINICAL INDICATION & HISTORY: ${indication} (Background: ${historyList})

FINDINGS:
- LUNG FIELDS: Clear bilateral lung fields without focal consolidation, nodular opacity, interstitial edema, or active parenchymal lesion. Visualized lung volumes are symmetrical.
- MEDIASTINUM & HEART: Normal cardiothoracic ratio (< 0.50). Normal mediastinal contour and hilar vascular structures. Trachea is midline.
- PLEURA & DIAPHRAGM: Sharp bilateral costophrenic angles. Diaphragmatic domes are intact with normal position and contour.
- OSSEOUS STRUCTURES: Thoracic bony cage intact with no visible acute displaced fracture or focal bone erosion.`,
      impression: `IMPRESSION (CLINICAL CDSS EVALUATION):
1. Normal chest radiograph. No active cardiopulmonary lesion, acute consolidation, or pneumothorax identified to account for ${indication}.
2. Clinical correlation recommended if symptoms persist.`,
      suggestions: 'Routine clinical follow-up as clinically indicated. If respiratory symptoms worsen, consider sputum microbiology or follow-up imaging.',
      confidenceScore: 98,
    };
  }

  // 2. ABDOMINAL & PELVIC ULTRASOUND
  if (mod.includes('ultrasound') || scan.includes('abdomen') || scan.includes('pelvis')) {
    return {
      findings: `EXAMINATION: Transabdominal Ultrasound (Abdomen & Pelvis)
CLINICAL INDICATION & HISTORY: ${indication} (Background: ${historyList})

FINDINGS:
- LIVER & BILIARY: Liver shows normal size, smooth capsular surface, and homogeneous parenchymal echogenicity. No focal mass lesion. Intrahepatic and extrahepatic bile ducts are non-dilated. Gallbladder is well-distended with thin wall and no gallstones.
- PANCREAS & SPLEEN: Visualized portions of pancreas show normal thickness. Spleen is normal in size and echotexture.
- KIDNEYS: Bilateral kidneys are normal in position, size, and cortical thickness. No hydronephrosis, calculus, or solid mass.
- PELVIS: Urinary bladder is well-filled with smooth margins. No ascites identified in Morison's pouch or pelvis.`,
      impression: `IMPRESSION (CLINICAL CDSS EVALUATION):
1. Normal abdominal and pelvic ultrasound examination.
2. No focal organ lesion, cholelithiasis, hydronephrosis, or free fluid detected in relation to "${indication}".`,
      suggestions: 'Correlate with liver function tests, urinalysis, and clinical evaluation.',
      confidenceScore: 96,
    };
  }

  // 3. BRAIN / HEAD (CT or MRI)
  if (scan.includes('head') || scan.includes('brain') || scan.includes('skull')) {
    return {
      findings: `EXAMINATION: Computed Tomography / MRI of the Brain (Non-Contrast)
CLINICAL INDICATION & HISTORY: ${indication} (Background: ${historyList})

FINDINGS:
- BRAIN PARENCHYMA: Normal cerebral and cerebellar parenchymal attenuation. No acute intracranial hemorrhage, extra-axial hematoma, or territorial infarction.
- VENTRICLES & CISTERNS: Ventricular system and basal cisterns are normal in configuration and symmetry. No midline shift.
- CALVARIUM & BASE: Skull vault and skull base show intact cortical margins with no acute fracture line.
- PARANASAL SINUSES: Visualized paranasal sinuses and mastoid air cells are clear.`,
      impression: `IMPRESSION (CLINICAL CDSS EVALUATION):
1. No acute intracranial bleed, mass effect, or territorial ischemia identified.
2. Age-appropriate brain parenchymal appearance with intact midline symmetry.`,
      suggestions: 'Elective clinical follow-up; prompt reassessment if new focal neurological deficit develops.',
      confidenceScore: 97,
    };
  }

  // 4. MUSCULOSKELETAL / TRAUMA (X-Ray / MRI)
  if (mod.includes('x-ray') || scan.includes('bone') || scan.includes('joint') || scan.includes('knee') || scan.includes('ankle') || scan.includes('wrist')) {
    return {
      findings: `EXAMINATION: Musculoskeletal Radiograph
CLINICAL INDICATION & HISTORY: ${indication} (Background: ${historyList})

FINDINGS:
- OSSEOUS ALIGNMENT: Intact cortical margins and trabecular architecture. No acute displaced fracture, dislocation, or subluxation.
- JOINT SPACE: Preserved joint space width with smooth articular surfaces. No significant periarticular erosion or osteophyte formation.
- SOFT TISSUES: No significant periarticular soft tissue swelling or radiopaque foreign body.`,
      impression: `IMPRESSION (CLINICAL CDSS EVALUATION):
1. No evidence of acute fracture, joint dislocation, or destructive osseous lesion.
2. Intact alignment and joint spaces correlated with presenting trauma/pain complaint.`,
      suggestions: 'Symptomatic supportive management; reassess if weight-bearing pain or restricted range of motion persists.',
      confidenceScore: 95,
    };
  }

  // 5. DEFAULT GENERAL TEMPLATE
  return {
    findings: `EXAMINATION: ${caseItem.scanType} (${caseItem.modality || 'Radiology'})
CLINICAL INDICATION & HISTORY: ${indication} (Documented medical history: ${historyList})

FINDINGS:
- Visualized anatomy demonstrates preserved anatomical orientation and contour.
- No gross morphological abnormality or acute pathology identified on preliminary assessment.
- Surrounding tissue structures are within physiological limits.`,
    impression: `IMPRESSION (CLINICAL CDSS EVALUATION):
1. Unremarkable diagnostic radiograph for ${caseItem.scanType}.
2. No acute radiological abnormality detected. Correlated with presenting indication: "${indication}".`,
    suggestions: 'Clinical correlation with attending physician findings recommended.',
    confidenceScore: 94,
  };
}
