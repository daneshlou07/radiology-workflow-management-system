import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  getRadioSchedulesByClinic,
  getRadioScheduleProfiles,
  buildLiveRadioSchedules,
} from '../../services/dataService';
import { getRoute, findNearestClinic, geocodeAddress } from '../../services/routingService';
import {
  extractModality,
  getEarliestSlot,
  getAvailableSlots,
  recommendBestRadiographer,
  slotToDateTimeValue,
  timeToMinutes,
} from '../../components/scheduling/RadiograperSelector';
import RadiograperSelector from '../../components/scheduling/RadiograperSelector';
import type { Case, Clinic, Patient, RadioScheduleProfile, RouteInfo } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { getCaseIndication } from '../../utils/caseDisplay';
import L from 'leaflet';
import { loadGoogleMapsSDK } from '../../services/googleMapsService';
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  ChevronRight,
  Calendar,
  Zap,
  Loader2,
} from 'lucide-react';

type Step = 'select-case' | 'map-routing' | 'assign-radiographer' | 'confirm';

// Coordinate cache shared across the lifetime of the page so repeated requests
// never re-geocode the same address.
const geocodeCache = new Map<string, { lat: number; lon: number }>();

// Geocode with cache so the same address is only ever fetched once.
async function cachedGeocode(address: string): Promise<{ lat: number; lon: number } | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!;
  const result = await geocodeAddress(address);
  if (result) geocodeCache.set(address, result);
  return result;
}

function createSyntheticPatient(caseItem: Case): Patient {
  return {
    id: caseItem.patientId || `pat-${caseItem.id}`,
    name: caseItem.patientName || 'Unknown Patient',
    dob: '1995-01-01',
    gender: ((caseItem as any).patientGender || 'Other') as any,
    phone: (caseItem as any).patientPhone || '',
    email: '',
    address: (caseItem as any).patientAddress || 'Kuala Lumpur, Malaysia',
    latitude: (caseItem as any).patientLatitude || 3.1390,
    longitude: (caseItem as any).patientLongitude || 101.6869,
    medicalHistory: [],
    nric: (caseItem as any).icNumber || '',
    mrn: `MRN-${caseItem.id}`,
    preferredClinicId: caseItem.clinicId,
  };
}

export default function AISchedulerMap() {
  const { currentUser } = useAuth();
  const { cases: allCases, clinics: allClinics, patients: allPatients, users, trash, editCase, addAuditLog } = useData();
  const { addNotification } = useNotifications();

  const cases = allCases.filter((c) => c.status === 'CREATED');
  const clinics = useMemo(
    () => (allClinics.some((c) => c.status === 'active') ? allClinics.filter((c) => c.status === 'active') : allClinics),
    [allClinics]
  );
  const patients = allPatients;

  // Build live schedule profiles synchronized with User Management
  const deletedUserIds = useMemo(
    () => new Set((trash || []).filter((t) => t.type === 'user' && t.data).map((t) => t.data.id)),
    [trash]
  );

  const allScheduleProfiles = useMemo(() => {
    return buildLiveRadioSchedules(users, allClinics, deletedUserIds);
  }, [users, allClinics, deletedUserIds]);

  const [scheduleProfiles, setScheduleProfiles] = useState<RadioScheduleProfile[]>([]);
  const [step, setStep] = useState<Step>('select-case');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const selectedClinic = useMemo(
    () => clinics.find((c) => c.id === selectedClinicId) || allClinics.find((c) => c.id === selectedClinicId) || null,
    [clinics, allClinics, selectedClinicId]
  );
  const [recommendedClinicId, setRecommendedClinicId] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedRadiographerId, setSelectedRadiographerId] = useState<string | null>(null);
  const [recommendedRadiographerId, setRecommendedRadiographerId] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  // Keep scheduleProfiles synchronized when users/radiographers are created or deleted
  useEffect(() => {
    setScheduleProfiles(allScheduleProfiles);
  }, [allScheduleProfiles]);

  const clinicsRef = useRef(clinics);
  clinicsRef.current = clinics;
  const allClinicsRef = useRef(allClinics);
  allClinicsRef.current = allClinics;

  const mapRef = useRef<HTMLDivElement>(null);
  const isMapInitialized = useRef(false);
  // Official Google Maps SDK references
  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const googleMarkers = useRef<google.maps.Marker[]>([]);
  const googleRoutePolyline = useRef<google.maps.Polyline | null>(null);
  const googleInfoWindow = useRef<google.maps.InfoWindow | null>(null);
  // Leaflet fallback instances (if Google Maps SDK is unavailable)
  const leafletMapInstance = useRef<L.Map | null>(null);
  const leafletRouteLayer = useRef<L.Polyline | null>(null);
  const leafletMarkersLayer = useRef<L.LayerGroup | null>(null);

  const clearMapRoutes = useCallback(() => {
    const activeClinics = clinicsRef.current.length > 0 ? clinicsRef.current : allClinicsRef.current;

    // 1. Google Maps SDK
    if (googleMapInstance.current) {
      const gMap = googleMapInstance.current;
      googleMarkers.current.forEach((m) => m.setMap(null));
      googleMarkers.current = [];
      if (googleRoutePolyline.current) {
        googleRoutePolyline.current.setMap(null);
        googleRoutePolyline.current = null;
      }
      if (googleInfoWindow.current) {
        googleInfoWindow.current.close();
      }

      activeClinics.forEach((clinic) => {
        const marker = new google.maps.Marker({
          position: { lat: clinic.latitude, lng: clinic.longitude },
          map: gMap,
          title: clinic.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#0F4C42',
            fillOpacity: 0.9,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });
        marker.addListener('click', () => {
          if (!googleInfoWindow.current) return;
          googleInfoWindow.current.setContent(
            `<div style="padding:6px 10px;font-family:sans-serif;color:#112A28;">` +
            `<strong style="font-size:13px;">${clinic.name}</strong><br/>` +
            `<span style="font-size:11px;color:#64748B;">${clinic.address}</span>` +
            `</div>`
          );
          googleInfoWindow.current.open(gMap, marker);
        });
        googleMarkers.current.push(marker);
      });

      gMap.setCenter({ lat: 3.14, lng: 101.69 });
      gMap.setZoom(10);
      return;
    }

    // 2. Leaflet Fallback
    const map = leafletMapInstance.current;
    const markers = leafletMarkersLayer.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (leafletRouteLayer.current) {
      map.removeLayer(leafletRouteLayer.current);
      leafletRouteLayer.current = null;
    }

    activeClinics.forEach((clinic) => {
      const marker = L.circleMarker([clinic.latitude, clinic.longitude], {
        radius: 8,
        fillColor: '#0F4C42',
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });
      marker.bindPopup(`<strong>${clinic.name}</strong><br/><small>${clinic.address}</small>`);
      markers.addLayer(marker);
    });

    map.setView([3.14, 101.69], 10);
  }, []);

  // Initialize Map ONCE on mount
  useEffect(() => {
    if (!mapRef.current || isMapInitialized.current) return;
    isMapInitialized.current = true;

    let isMounted = true;
    loadGoogleMapsSDK()
      .then((g) => {
        if (!isMounted || !mapRef.current) return;
        const map = new g.maps.Map(mapRef.current, {
          center: { lat: 3.14, lng: 101.69 },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            { featureType: 'poi.medical', stylers: [{ visibility: 'on' }] },
            { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
          ],
        });
        googleMapInstance.current = map;
        googleInfoWindow.current = new g.maps.InfoWindow();
        clearMapRoutes();
      })
      .catch((err) => {
        console.warn('Google Maps SDK unavailable, falling back to Leaflet:', err);
        if (!isMounted || !mapRef.current) return;
        const map = L.map(mapRef.current, { zoomControl: true }).setView([3.1, 101.5], 10);
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps',
        }).addTo(map);
        leafletMapInstance.current = map;
        leafletMarkersLayer.current = L.layerGroup().addTo(map);
        clearMapRoutes();
      });

    return () => {
      isMounted = false;
      isMapInitialized.current = false;
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
      googleMapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (cases.length === 0 && step === 'select-case') {
      clearMapRoutes();
    }
  }, [cases.length, step, clearMapRoutes]);


  const updateMap = useCallback(
    (patient: Patient | null, clinicId: string | null, route: RouteInfo | null) => {
      // 1. Google Maps SDK
      if (googleMapInstance.current) {
        const gMap = googleMapInstance.current;
        googleMarkers.current.forEach((m) => m.setMap(null));
        googleMarkers.current = [];
        if (googleRoutePolyline.current) {
          googleRoutePolyline.current.setMap(null);
          googleRoutePolyline.current = null;
        }

        const activeClinics = clinicsRef.current.length > 0 ? clinicsRef.current : allClinicsRef.current;
        activeClinics.forEach((clinic) => {
          const isSelected = clinic.id === clinicId;
          const isRecommended = clinic.id === recommendedClinicId;

          const marker = new google.maps.Marker({
            position: { lat: clinic.latitude, lng: clinic.longitude },
            map: gMap,
            title: clinic.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: isSelected ? 11 : 8,
              fillColor: isSelected ? '#0F4C42' : isRecommended ? '#8FBEB2' : '#94A3B8',
              fillOpacity: 0.95,
              strokeColor: '#FFFFFF',
              strokeWeight: isSelected ? 3 : 2,
            },
            zIndex: isSelected ? 100 : 10,
          });

          marker.addListener('click', () => {
            if (!googleInfoWindow.current) return;
            googleInfoWindow.current.setContent(
              `<div style="padding:6px 10px;font-family:sans-serif;color:#112A28;">` +
              `<strong style="font-size:13px;">${clinic.name}</strong><br/>` +
              `<span style="font-size:11px;color:#64748B;">${clinic.address}</span>` +
              `${isSelected ? '<br/><span style="display:inline-block;margin-top:4px;padding:2px 6px;border-radius:4px;background:#EAF6F3;color:#0F4C42;font-size:10px;font-weight:700;">Selected Facility</span>' : ''}` +
              `</div>`
            );
            googleInfoWindow.current.open(gMap, marker);
          });
          googleMarkers.current.push(marker);
        });

        // Patient pin
        if (patient && patient.latitude && patient.longitude) {
          const pMarker = new google.maps.Marker({
            position: { lat: patient.latitude, lng: patient.longitude },
            map: gMap,
            title: patient.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#16433B',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            },
            zIndex: 150,
          });
          pMarker.addListener('click', () => {
            if (!googleInfoWindow.current) return;
            googleInfoWindow.current.setContent(
              `<div style="padding:6px 10px;font-family:sans-serif;color:#112A28;">` +
              `<strong style="font-size:13px;">${patient.name}</strong><br/>` +
              `<span style="font-size:11px;color:#64748B;">${patient.address}</span>` +
              `</div>`
            );
            googleInfoWindow.current.open(gMap, pMarker);
          });
          googleMarkers.current.push(pMarker);
        }

        // Draw Route Polyline
        if (route && route.polylineCoords.length > 0) {
          const path = route.polylineCoords.map(([lat, lng]) => ({ lat, lng }));
          googleRoutePolyline.current = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#0F4C42',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map: gMap,
          });

          const bounds = new google.maps.LatLngBounds();
          path.forEach((pt) => bounds.extend(pt));
          gMap.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
        } else if (patient && patient.latitude && patient.longitude) {
          gMap.setCenter({ lat: patient.latitude, lng: patient.longitude });
          gMap.setZoom(13);
        }
        return;
      }

      // 2. Leaflet Fallback
      const map = leafletMapInstance.current;
      const markers = leafletMarkersLayer.current;
      if (!map || !markers) return;
      markers.clearLayers();
      if (leafletRouteLayer.current) {
        map.removeLayer(leafletRouteLayer.current);
        leafletRouteLayer.current = null;
      }

      const activeClinicsFallback = clinicsRef.current.length > 0 ? clinicsRef.current : allClinicsRef.current;
      activeClinicsFallback.forEach((clinic) => {
        const isSelected = clinic.id === clinicId;
        const isRecommended = clinic.id === recommendedClinicId;
        const marker = L.circleMarker([clinic.latitude, clinic.longitude], {
          radius: isSelected ? 12 : 9,
          fillColor: isSelected ? '#0F4C42' : isRecommended ? '#8FBEB2' : '#94A3B8',
          color: isSelected ? '#0B3931' : '#64748B',
          weight: isSelected ? 3 : 2,
          opacity: 1,
          fillOpacity: 0.85,
        });
        marker.bindPopup(`<strong>${clinic.name}</strong><br/><small>${clinic.address}</small>${isSelected ? '<br/><b style="color:#10b981">Selected</b>' : ''}`);
        markers.addLayer(marker);
      });

      if (patient && patient.latitude && patient.longitude) {
        const patientMarker = L.marker([patient.latitude, patient.longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#0F4C42;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,76,66,0.28)"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        });
        patientMarker.bindPopup(`<strong>${patient.name}</strong><br/><small>${patient.address}</small>`);
        markers.addLayer(patientMarker);
      }

      if (route && route.polylineCoords.length > 0) {
        leafletRouteLayer.current = L.polyline(route.polylineCoords, { color: '#0F4C42', weight: 4, opacity: 0.82 }).addTo(map);
        const bounds = L.latLngBounds(route.polylineCoords.map(([lat, lng]) => [lat, lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (patient && patient.latitude && patient.longitude) {
        map.setView([patient.latitude, patient.longitude], 13);
      }
    },
    [recommendedClinicId]
  );


  const handleCaseSelect = async (caseItem: Case) => {
    setSelectedCase(caseItem);
    setSuccess(false);

    const patient: Patient =
      patients.find((p) => p.id === caseItem.patientId) ||
      patients.find((p) => p.name?.trim().toLowerCase() === caseItem.patientName?.trim().toLowerCase()) ||
      createSyntheticPatient(caseItem);

    setSelectedPatient(patient);

    let patLat = patient.latitude;
    let patLon = patient.longitude;
    if (!patLat || !patLon) {
      setRouteLoading(true);
      const geo = await cachedGeocode(patient.address);
      if (geo) {
        patLat = geo.lat;
        patLon = geo.lon;
        patient.latitude = geo.lat;
        patient.longitude = geo.lon;
      }
      setRouteLoading(false);
    }

    if (!patLat || !patLon) {
      patLat = 3.1390;
      patLon = 101.6869;
      patient.latitude = patLat;
      patient.longitude = patLon;
    }

    const availableClinics = clinics.length > 0 ? clinics : allClinics;
    const nearest = findNearestClinic(patLat, patLon, availableClinics);
    const nearestId = nearest?.clinicId || (availableClinics[0]?.id || null);
    setRecommendedClinicId(nearestId);

    // Respect user's explicit preference if designated, otherwise fallback to AI nearest recommendation
    const userPreferredId = caseItem.clinicId || patient.preferredClinicId;
    const isValidUserChoice = userPreferredId && availableClinics.some((c) => c.id === userPreferredId);
    const activeClinicId = isValidUserChoice ? userPreferredId : nearestId;

    setSelectedClinicId(activeClinicId);

    if (activeClinicId) {
      const clinic = availableClinics.find((c) => c.id === activeClinicId);
      if (clinic) {
        setRouteLoading(true);
        const route = await getRoute(patLat, patLon, clinic.latitude, clinic.longitude);
        setRouteInfo(route);
        setRouteLoading(false);
        updateMap(patient, activeClinicId, route);
      } else {
        updateMap(patient, activeClinicId, null);
      }
    } else {
      updateMap(patient, null, null);
    }

    setStep('map-routing');
  };

  const handleClinicChange = async (clinicId: string) => {
    setSelectedClinicId(clinicId);
    setSelectedRadiographerId(null);
    setRecommendedRadiographerId(null);
    setAppointmentTime('');
    setScheduleProfiles(allScheduleProfiles);

    const pat: Patient = selectedPatient || (selectedCase ? createSyntheticPatient(selectedCase) : {
      id: '',
      name: 'Unknown Patient',
      dob: '1995-01-01',
      gender: 'Other' as any,
      phone: '',
      email: '',
      address: 'Kuala Lumpur, Malaysia',
      latitude: 3.1390,
      longitude: 101.6869,
      medicalHistory: [],
      nric: '',
      mrn: '',
      preferredClinicId: clinicId,
    });

    let patLat = pat.latitude;
    let patLon = pat.longitude;
    if (!patLat || !patLon) {
      const geo = await cachedGeocode(pat.address);
      if (geo) {
        patLat = geo.lat;
        patLon = geo.lon;
        pat.latitude = geo.lat;
        pat.longitude = geo.lon;
      }
    }
    if (!patLat || !patLon) {
      patLat = 3.1390;
      patLon = 101.6869;
    }

    const availableClinics = clinics.length > 0 ? clinics : allClinics;
    const clinic = availableClinics.find((c) => c.id === clinicId);
    if (clinic) {
      setRouteLoading(true);
      const route = await getRoute(patLat, patLon, clinic.latitude, clinic.longitude);
      setRouteInfo(route);
      setRouteLoading(false);
      updateMap(pat, clinicId, route);
    }
  };

  const handleProceedToAssignment = async () => {
    if (!selectedClinicId || !selectedCase) return;
    setScheduleProfiles(allScheduleProfiles);
    const modality = extractModality(selectedCase.scanType);
    const bestId = recommendBestRadiographer(
      allScheduleProfiles,
      modality,
      cases,
      selectedClinicId,
      selectedClinic?.name,
      selectedCase.severity
    );

    setSelectedRadiographerId(bestId);
    setRecommendedRadiographerId(bestId);
    if (bestId) {
      const bestProfile = allScheduleProfiles.find((p) => p.userId === bestId);
      if (bestProfile) {
        const slot = getEarliestSlot(bestProfile.schedule, bestId, cases, undefined, selectedCase.id);
        if (slot) {
          const dateTimeValue = slotToDateTimeValue(slot.date, slot.startTime);
          setAppointmentTime(dateTimeValue || '');
        } else {
          setAppointmentTime('');
        }
      }
    }
    setStep('assign-radiographer');
  };

  const handleRadiographerSelect = (userId: string) => {
    setSelectedRadiographerId(userId);
    const profile = scheduleProfiles.find((p) => p.userId === userId);
    if (profile) {
      const slot = getEarliestSlot(profile.schedule, userId, cases, undefined, selectedCase?.id);
      if (slot) {
        const dateTimeValue = slotToDateTimeValue(slot.date, slot.startTime);
        setAppointmentTime(dateTimeValue || '');
      } else {
        setAppointmentTime('');
      }
    }
  };

  const handleConfirm = async () => {
    if (!currentUser || !selectedCase || !selectedClinicId || !selectedRadiographerId || !appointmentTime) return;

    // Final safety check: never allow a stale/past appointment to be committed.
    const appointmentDate = new Date(appointmentTime);
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate <= new Date()) {
      setAppointmentTime('');
      return;
    }

    setConfirming(true);
    const clinic = clinics.find((c) => c.id === selectedClinicId);
    const profile = scheduleProfiles.find((p) => p.userId === selectedRadiographerId);

    await editCase(selectedCase.id, { status: 'SCHEDULED', scheduledAt: new Date(appointmentTime).toISOString(), clinicId: selectedClinicId, clinicName: clinic?.name || '', radiographerId: selectedRadiographerId, radiographerName: profile?.userName || '' });
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'CASE_SCHEDULED', target: `cases/${selectedCase.id}`, details: `AI Scheduler: ${selectedCase.caseNumber} at ${clinic?.name} with ${profile?.userName} on ${appointmentTime}. Route: ${routeInfo?.distanceKm}km, ~${routeInfo?.durationMinutes}min.`, timestamp: new Date().toISOString() });
    addNotification({ userId: selectedRadiographerId, title: 'New Case Assigned', message: `Case ${selectedCase.caseNumber} scheduled for ${appointmentTime}.`, type: 'info' });
    if (selectedCase.registeredById) {
      addNotification({ userId: selectedCase.registeredById, title: 'Case Scheduled', message: `Case ${selectedCase.caseNumber} scheduled at ${clinic?.name}.`, type: 'success' });
    }

    setConfirming(false); setSuccess(true); setStep('confirm');
  };

  const handleReset = () => {
    setStep('select-case'); setSelectedCase(null); setSelectedPatient(null); setSelectedClinicId(null);
    setRecommendedClinicId(null); setRouteInfo(null); setSelectedRadiographerId(null);
    setRecommendedRadiographerId(null); setAppointmentTime(''); setSuccess(false);
    updateMap(null, null, null);
  };

  const handleReassignCase = async (caseId: string, newRadiographerId: string) => {
    const targetRad = allScheduleProfiles.find((p) => p.userId === newRadiographerId);
    const targetUser = users.find((u) => u.id === newRadiographerId);
    const radName = targetRad?.userName || targetUser?.name || 'Assigned Radiographer';

    try {
      await editCase(caseId, {
        radiographerId: newRadiographerId,
        radiographerName: radName,
        status: 'SCHEDULED',
      });

      if (addAuditLog) {
        addAuditLog({
          action: 'REASSIGN_RADIOGRAPHER',
          target: `Case ${caseId}`,
          userId: currentUser?.id || 'system',
          userName: currentUser?.name || 'System Dispatcher',
          userRole: currentUser?.role || 'mo',
          details: `Reallocated case ${caseId} to radiographer ${radName} (${newRadiographerId})`,
          timestamp: new Date().toISOString(),
        });
      }

      addNotification({
        userId: currentUser?.id || 'all',
        type: 'info',
        title: 'Radiographer Reassigned',
        message: `Case successfully reallocated to ${radName}.`,
      });
    } catch (err) {
      console.error('Error reassigning radiographer:', err);
      addNotification({
        userId: currentUser?.id || 'all',
        type: 'error',
        title: 'Reassignment Failed',
        message: 'Failed to update radiographer assignment in live database.',
      });
    }
  };

  return (
    <div className="h-full flex flex-col -m-6 bg-[#F5F8F7]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#DCE6E3]">
        <h1 className="text-base font-bold text-[#112A28]">AI Scheduling Dispatch</h1>
        <div className="flex items-center gap-1 text-xs">
          {(['select-case', 'map-routing', 'assign-radiographer', 'confirm'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-surface-400" />}
              <span className={`px-2.5 py-1 rounded-full transition-all ${step === s ? 'bg-[#0F4C42] text-white font-semibold shadow-sm' : 'text-surface-500'}`}>
                {i + 1}. {s === 'select-case' ? 'Case' : s === 'map-routing' ? 'Route' : s === 'assign-radiographer' ? 'Assign' : 'Done'}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map */}
        <div className="hidden lg:block flex-1 relative bg-[#EAF1EF]">
          <div ref={mapRef} className="h-full w-full" />
          {routeInfo && step !== 'select-case' && !routeLoading && (
            <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm border border-white rounded-xl p-4 shadow-lg z-[1000] w-[250px]">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-4 h-4 text-[#0F4C42]" />
                <span className="text-[10px] font-bold tracking-wider text-surface-500 uppercase">Route overview</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-surface-500">Distance</p><p className="text-lg font-bold text-[#112A28]">{routeInfo.distanceKm} <span className="text-xs font-normal">km</span></p></div>
                <div><p className="text-[10px] text-surface-500">Time</p><p className="text-lg font-bold text-[#112A28]">{routeInfo.durationMinutes} <span className="text-xs font-normal">min</span></p></div>
              </div>
              {selectedClinic && <p className="text-xs text-surface-600 mt-2 pt-2 border-t border-surface-200">{selectedClinic.name}</p>}
            </div>
          )}
          {routeLoading && (
            <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-sm border border-white rounded-xl px-4 py-3 shadow-lg z-[1000]">
              <div className="flex items-center gap-2 text-surface-600 text-sm">
                <div className="w-4 h-4 border-2 border-[#0F4C42] border-t-transparent rounded-full animate-spin" />
                Calculating route...
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-[420px] bg-white border-l border-[#DCE6E3] overflow-y-auto">
          <div className="p-5 lg:p-6 space-y-5">
            {step === 'select-case' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#0F4C42]" />
                    <h2 className="text-sm font-semibold text-[#112A28]">Select Case</h2>
                  </div>
                </div>

                {cases.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto opacity-70" />
                    <p className="text-sm text-slate-800 font-bold">All Cases Scheduled</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Intake queue is clear. There are currently no unscheduled clinical cases awaiting AI routing dispatch.
                    </p>
                  </div>
                ) : (
                  cases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleCaseSelect(c)}
                      className="w-full text-left p-3.5 rounded-xl bg-white border border-surface-200 shadow-sm hover:border-[#9FC8BE] hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono text-[#0F4C42] font-semibold">{c.caseNumber}</span>
                        <div className="flex items-center gap-1.5">
                          <SeverityBadge severity={c.severity || 'Moderate'} />
                          <StatusBadge status={c.status} />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-surface-800">{c.patientName}</p>
                      <p className="text-xs text-surface-500">{c.scanType} &middot; {getCaseIndication(c)}</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {step === 'map-routing' && selectedCase && (
              <div className="space-y-4">
                <div className="p-3.5 bg-white rounded-xl border border-surface-200 shadow-sm">
                  <p className="text-xs text-surface-500 mb-1">Patient</p>
                  <p className="text-sm font-medium text-[#112A28]">{selectedPatient?.name || selectedCase.patientName}</p>
                  <p className="text-xs text-surface-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {selectedPatient?.address || (selectedCase as any).patientAddress || 'Kuala Lumpur, Malaysia'}</p>
                  <p className="text-xs text-surface-500 mt-1">Scan: <span className="text-[#0F4C42] font-medium">{selectedCase.scanType}</span></p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase">Healthcare Centre</label>
                    {selectedCase?.clinicId || selectedPatient?.preferredClinicId ? (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Patient Preferred
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        AI Recommended
                      </span>
                    )}
                  </div>
                  <select value={selectedClinicId || ''} onChange={(e) => handleClinicChange(e.target.value)} className="select-field text-sm">
                    {Array.from(new Map((clinics.length > 0 ? clinics : allClinics).map((c) => [c.name.trim().toLowerCase(), c])).values()).map((c) => {
                      const isUserChoice = c.id === (selectedCase?.clinicId || selectedPatient?.preferredClinicId);
                      const isNearest = c.id === recommendedClinicId;
                      let tag = '';
                      if (isUserChoice && isNearest) tag = ' (Patient Choice & AI Nearest)';
                      else if (isUserChoice) tag = ' (Patient Manual Override)';
                      else if (isNearest) tag = ' (AI Workflow Nearest)';

                      return (
                        <option key={c.id} value={c.id}>
                          {c.name}{tag}
                        </option>
                      );
                    })}
                  </select>
                  {selectedClinicId === (selectedCase?.clinicId || selectedPatient?.preferredClinicId) && (
                    <p className="text-xs text-amber-800 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-amber-600" /> Using patient's preferred healthcare centre
                    </p>
                  )}
                  {selectedClinicId === recommendedClinicId && selectedClinicId !== (selectedCase?.clinicId || selectedPatient?.preferredClinicId) && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Nearest suitable facility recommended by AI Scheduler
                    </p>
                  )}
                </div>

                {routeInfo && (
                  <div className="p-3.5 bg-[#F5F8F7] rounded-xl border border-surface-200 grid grid-cols-2 gap-3">
                    <div><p className="text-[10px] text-surface-500">Distance</p><p className="text-base font-bold text-[#112A28]">{routeInfo.distanceKm} km</p></div>
                    <div><p className="text-[10px] text-surface-500">Travel Time</p><p className="text-base font-bold text-[#112A28]">{routeInfo.durationMinutes} min</p></div>
                  </div>
                )}

                <button onClick={handleProceedToAssignment} disabled={!selectedClinicId || routeLoading} className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2">
                  Proceed to Assignment <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={handleReset} className="btn-ghost w-full text-sm">&larr; Back</button>
              </div>
            )}

            {step === 'assign-radiographer' && selectedCase && (
              <div className="space-y-4">
                <div className="p-3.5 bg-white rounded-xl border border-surface-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-surface-500">Case</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-sm font-semibold text-[#16433B]">{selectedCase.caseNumber}</p>
                      <SeverityBadge severity={selectedCase.severity || 'Moderate'} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-500">Clinic</p>
                    <p className="text-sm text-emerald-600 font-medium">{selectedClinic?.name}</p>
                  </div>
                </div>

                <RadiograperSelector
                  profiles={scheduleProfiles}
                  allProfiles={allScheduleProfiles}
                  requiredModality={extractModality(selectedCase.scanType)}
                  selectedId={selectedRadiographerId}
                  recommendedId={recommendedRadiographerId}
                  onSelect={handleRadiographerSelect}
                  existingCases={allCases}
                  targetClinicId={selectedClinicId}
                  targetClinicName={selectedClinic?.name}
                  caseSeverity={selectedCase.severity || 'Moderate'}
                  onReassignCase={handleReassignCase}
                />

                {selectedRadiographerId && appointmentTime && (
                  <div className="space-y-3">
                    <div className="p-4 bg-[#F1F8F6] border border-[#BFD8D1] rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700 uppercase">Recommended Appointment</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div><p className="text-[10px] text-emerald-600">Date</p><p className="text-sm font-bold text-[#112A28]">{new Date(appointmentTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                        <div><p className="text-[10px] text-emerald-600">Time</p><p className="text-sm font-bold text-[#112A28]">{new Date(appointmentTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p></div>
                        <div><p className="text-[10px] text-emerald-600">Est. Duration</p><p className="text-sm font-medium text-[#112A28]">30 min</p></div>
                        <div><p className="text-[10px] text-emerald-600">Est. Travel</p><p className="text-sm font-medium text-[#112A28]">{routeInfo?.durationMinutes || '—'} min</p></div>
                      </div>
                    </div>
                    <AppointmentOverride
                      scheduleProfiles={scheduleProfiles}
                      selectedRadiographerId={selectedRadiographerId}
                      currentTime={appointmentTime}
                      onChangeTime={(t) => setAppointmentTime(t)}
                      existingCases={cases}
                      selectedCaseId={selectedCase?.id}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setStep('map-routing')} className="btn-secondary flex-1 text-sm">&larr; Back</button>
                  <button onClick={handleConfirm} disabled={!selectedRadiographerId || !appointmentTime || confirming} className="btn-primary flex-1 disabled:opacity-50">
                    {confirming ? 'Confirming...' : 'Confirm Assignment'}
                  </button>
                </div>
              </div>
            )}

            {step === 'confirm' && success && (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#112A28]">Appointment Confirmed</h2>
                  <p className="text-sm text-surface-500 mt-1">{selectedCase?.caseNumber} scheduled.</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-surface-200 shadow-sm text-left text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-surface-500">Patient</span><span className="text-surface-800">{selectedCase?.patientName}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Scan</span><span className="text-surface-800">{selectedCase?.scanType}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Clinic</span><span className="text-emerald-600">{selectedClinic?.name}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Radiographer</span><span className="text-surface-800">{scheduleProfiles.find((p) => p.userId === selectedRadiographerId)?.userName}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Date/Time</span><span className="text-surface-800">{appointmentTime.replace('T', ' ')}</span></div>
                  {routeInfo && <div className="flex justify-between"><span className="text-surface-500">Travel</span><span className="text-surface-800">{routeInfo.distanceKm}km / ~{routeInfo.durationMinutes}min</span></div>}
                </div>
                <button onClick={handleReset} className="btn-primary w-full">Schedule Another</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Override (sub-component) ─────────────────────────
function AppointmentOverride({
  scheduleProfiles,
  selectedRadiographerId,
  currentTime,
  onChangeTime,
  existingCases,
  selectedCaseId,
}: {
  scheduleProfiles: import('../../types').RadioScheduleProfile[];
  selectedRadiographerId: string;
  currentTime: string;
  onChangeTime: (time: string) => void;
  existingCases?: import('../../types').Case[];
  selectedCaseId?: string;
}) {
  const [showSlots, setShowSlots] = React.useState(false);
  const profile = scheduleProfiles.find((p) => p.userId === selectedRadiographerId);
  if (!profile) return null;

  const slotItems = getAvailableSlots(
    profile.schedule,
    10,
    selectedRadiographerId,
    existingCases,
    selectedCaseId
  ).filter(
    (item) => {
      const slotTime = slotToDateTimeValue(item.slot.date, item.slot.startTime);
      return slotTime !== currentTime;
    }
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowSlots(!showSlots)}
        className="text-xs text-[#0F4C42] hover:text-[#16433B] font-medium underline underline-offset-2"
      >
        {showSlots ? 'Hide alternative slots' : 'Change Appointment'}
      </button>
      {showSlots && (
        <div className="mt-2 p-3 bg-surface-50 border border-surface-200 rounded-lg space-y-2">
          <p className="text-[10px] text-surface-500 font-medium">
            Alternative available slots:
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {slotItems.map(({ slot, isOccupied, occupiedByCase }) => {
              const timeStr = slotToDateTimeValue(slot.date, slot.startTime) || `${slot.date}T${slot.startTime}`;
              return (
                <button
                  key={timeStr}
                  type="button"
                  onClick={() => {
                    onChangeTime(timeStr);
                    setShowSlots(false);
                  }}
                  className={`p-2 text-xs font-medium rounded-lg border transition-colors text-left flex flex-col justify-between ${isOccupied
                      ? 'border-amber-200 bg-amber-50/60 text-amber-900 hover:bg-amber-100'
                      : 'border-surface-300 bg-white text-surface-700 hover:border-[#9FC8BE] hover:bg-[#F1F8F6]'
                    }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-bold">{slot.startTime}</span>
                    {isOccupied && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-200 text-amber-900">
                        Occupied
                      </span>
                    )}
                  </div>
                  <span className="block text-[9px] text-surface-500 font-normal mt-0.5">
                    {slot.date}
                  </span>
                  {occupiedByCase && (
                    <span className="block text-[9px] text-amber-700 font-semibold truncate mt-0.5">
                      Case: {occupiedByCase.caseNumber}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {slotItems.length === 0 && (
            <p className="text-[10px] text-surface-400 text-center py-2">No other slots available.</p>
          )}
        </div>
      )}
    </div>
  );
}
