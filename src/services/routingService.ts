import {
  HealthcareCenter,
  FacilityEquipment,
  User,
  Case,
  ImagingModality,
  RoutingRecommendation,
} from '../types';
import {
  getDirections as getGoogleDirections,
  geocodeAddress as geocodeWithGoogle,
  useGoogleMaps,
} from './googleMapsService';

/**
 * Calculates Haversine distance in kilometers between two lat/lon coordinates.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/** Alias for backward-compatibility */
export const haversineDistance = calculateHaversineDistance;

export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  polylineCoords: [number, number][];
}

/**
 * Estimate driving time in minutes based on distance.
 * Assumes average 40 km/h in urban Malaysian context.
 */
export function estimateDriveTime(distanceKm: number): number {
  const avgSpeedKmh = 40;
  return Math.max(5, Math.round((distanceKm / avgSpeedKmh) * 60));
}

function generateSimulatedPolyline(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): [number, number][] {
  const points: [number, number][] = [];
  const steps = 20;
  const midLat = (lat1 + lat2) / 2 + (Math.random() - 0.5) * 0.005;
  const midLon = (lon1 + lon2) / 2 + (Math.random() - 0.5) * 0.005;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) ** 2 * lat1 + 2 * (1 - t) * t * midLat + t ** 2 * lat2;
    const lon = (1 - t) ** 2 * lon1 + 2 * (1 - t) * t * midLon + t ** 2 * lon2;
    points.push([lat, lon]);
  }
  return points;
}

export async function getRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<RouteInfo> {
  if (useGoogleMaps) {
    try {
      const googleRoute = await getGoogleDirections(fromLat, fromLon, toLat, toLon);
      if (googleRoute && googleRoute.polylineCoords && googleRoute.polylineCoords.length > 0) {
        return googleRoute;
      }
    } catch (err) {
      console.warn('Google Directions failed, using fallback:', err);
    }
  }

  const distance = calculateHaversineDistance(fromLat, fromLon, toLat, toLon);
  const roadFactor = 1.3;
  const adjustedDistance = Math.round(distance * roadFactor * 10) / 10;
  const fallback: RouteInfo = {
    distanceKm: adjustedDistance,
    durationMinutes: estimateDriveTime(adjustedDistance),
    polylineCoords: generateSimulatedPolyline(fromLat, fromLon, toLat, toLon),
  };

  try {
    const osrmPromise = (async () => {
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords: [number, number][] = route.geometry.coordinates.map(
            ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
          );
          return {
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            durationMinutes: Math.round(route.duration / 60),
            polylineCoords: coords,
          };
        }
      }
      throw new Error('OSRM response invalid');
    })();

    const timeoutPromise = new Promise<RouteInfo>((resolve) =>
      setTimeout(() => resolve(fallback), 2000)
    );

    return await Promise.race([osrmPromise, timeoutPromise]);
  } catch {
    return fallback;
  }
}

export function findNearestClinic(
  patientLat: number,
  patientLon: number,
  clinics: { id: string; latitude: number; longitude: number }[]
): { clinicId: string; distanceKm: number } | null {
  if (clinics.length === 0) return null;

  let nearest = clinics[0];
  let minDist = calculateHaversineDistance(patientLat, patientLon, nearest.latitude, nearest.longitude);

  for (let i = 1; i < clinics.length; i++) {
    const dist = calculateHaversineDistance(patientLat, patientLon, clinics[i].latitude, clinics[i].longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = clinics[i];
    }
  }

  return { clinicId: nearest.id, distanceKm: Math.round(minDist * 10) / 10 };
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  if (useGoogleMaps) {
    try {
      const googleCoords = await geocodeWithGoogle(trimmed);
      if (googleCoords && !isNaN(googleCoords.lat) && !isNaN(googleCoords.lon)) {
        return googleCoords;
      }
    } catch (err) {
      console.warn('Google Geocode failed, using fallback:', err);
    }
  }

  try {
    const queryStr = trimmed.toLowerCase().includes('malaysia') ? trimmed : `${trimmed}, Malaysia`;
    const encoded = encodeURIComponent(queryStr);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=my&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon) && lat > 0 && lon > 0) {
          return { lat, lon };
        }
      }
    }
  } catch (err) {
    // Graceful fallback
  }

  const lower = trimmed.toLowerCase();
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash << 5) - hash + lower.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const detLatOffset = ((positiveHash % 1000) / 1000 - 0.5) * 0.008;
  const detLonOffset = (((positiveHash >> 3) % 1000) / 1000 - 0.5) * 0.008;

  const locations: { keywords: string[]; lat: number; lon: number }[] = [
    { keywords: ['tanjong karang', 'tanjung karang'], lat: 3.4242, lon: 101.1824 },
    { keywords: ['jeram'], lat: 3.2072, lon: 101.4633 },
    { keywords: ['batang berjuntai', 'ijok', 'bestari jaya'], lat: 3.3636, lon: 101.3843 },
    { keywords: ['putrajaya'], lat: 2.9264, lon: 101.6964 },
    { keywords: ['cyberjaya'], lat: 2.9213, lon: 101.6559 },
    { keywords: ['bangi', 'bandar baru bangi'], lat: 2.9469, lon: 101.7636 },
    { keywords: ['puchong'], lat: 3.0004, lon: 101.6168 },
    { keywords: ['kajang'], lat: 2.9927, lon: 101.7909 },
    { keywords: ['subang', 'subang jaya'], lat: 3.0565, lon: 101.5852 },
    { keywords: ['petaling jaya', 'pj'], lat: 3.1073, lon: 101.6067 },
    { keywords: ['shah alam'], lat: 3.0738, lon: 101.5183 },
    { keywords: ['kuala lumpur', 'kl'], lat: 3.1390, lon: 101.6869 },
    { keywords: ['ampang'], lat: 3.1500, lon: 101.7667 },
    { keywords: ['cheras'], lat: 3.1073, lon: 101.7514 },
    { keywords: ['klang'], lat: 3.0449, lon: 101.4455 },
    { keywords: ['rawang'], lat: 3.3213, lon: 101.5767 },
    { keywords: ['seremban'], lat: 2.7258, lon: 101.9424 },
    { keywords: ['nilai'], lat: 2.8174, lon: 101.7987 },
    { keywords: ['sepang'], lat: 2.6874, lon: 101.7412 },
    { keywords: ['serdang'], lat: 3.0222, lon: 101.7131 },
    { keywords: ['semenyih'], lat: 2.9513, lon: 101.8421 },
    { keywords: ['dengkil'], lat: 2.8577, lon: 101.6819 },
    { keywords: ['banting'], lat: 2.8134, lon: 101.5024 },
    { keywords: ['selangor'], lat: 3.0738, lon: 101.5183 },
  ];

  for (const loc of locations) {
    if (loc.keywords.some((kw) => lower.includes(kw))) {
      return { lat: loc.lat + detLatOffset, lon: loc.lon + detLonOffset };
    }
  }

  return { lat: 3.0 + detLatOffset * 2, lon: 101.65 + detLonOffset * 2 };
}

export interface RoutingEngineParams {
  originatingCenterId: string;
  requiredModality: ImagingModality;
  urgency?: 'Routine' | 'Urgent' | 'Emergency';
  allCenters: HealthcareCenter[];
  allEquipment: FacilityEquipment[];
  allUsers: User[];
  allCases: Case[];
}

/**
 * Intelligent BEMS Allocation & Decision Support Engine.
 * Discovers candidate healthcare facilities and produces ranked suitability recommendations.
 * 
 * NOTE: This function provides recommendations only; it does NOT automatically dispatch referrals.
 */
export function calculateFacilityRoutingRecommendations(
  params: RoutingEngineParams
): RoutingRecommendation[] {
  const {
    originatingCenterId,
    requiredModality,
    urgency = 'Routine',
    allCenters,
    allEquipment,
    allUsers,
    allCases,
  } = params;

  const origin = allCenters.find((c) => c.id === originatingCenterId);
  const originLat = origin?.latitude ?? 3.3855;
  const originLon = origin?.longitude ?? 101.4137;

  const candidateFacilities = allCenters.filter(
    (c) => c.id !== originatingCenterId && c.status === 'active'
  );

  const recommendations: RoutingRecommendation[] = candidateFacilities.map((center) => {
    // 1. Modality capability check
    const supportedModalities = (center.supportedModalities || []).map((m) => m.toLowerCase());
    const modalityMatch =
      supportedModalities.includes(requiredModality.toLowerCase()) ||
      supportedModalities.some((m) => m.includes(requiredModality.toLowerCase()));

    // 2. Equipment operational check
    const centerEquipment = allEquipment.filter(
      (e) =>
        e.healthcareCenterId === center.id &&
        e.modality.toLowerCase() === requiredModality.toLowerCase()
    );

    const availableMachines = centerEquipment.filter((e) => e.status === 'Available');
    const inUseMachines = centerEquipment.filter((e) => e.status === 'In Use');
    const offlineMachines = centerEquipment.filter(
      (e) => e.status === 'Offline' || e.status === 'Maintenance'
    );

    let equipmentScore = 0;
    if (availableMachines.length > 0) {
      equipmentScore = 1.0;
    } else if (inUseMachines.length > 0) {
      equipmentScore = 0.5;
    } else if (centerEquipment.length > 0 && offlineMachines.length === centerEquipment.length) {
      equipmentScore = 0.0;
    } else if (modalityMatch) {
      // Modality supported in facility capabilities even if physical unit registry is empty
      equipmentScore = 0.7;
    }

    // 3. Proximity & Travel Time
    const distanceKm = calculateHaversineDistance(
      originLat,
      originLon,
      center.latitude,
      center.longitude
    );
    // Estimated drive minutes: approx 45 km/h urban/suburban average + 5 min buffer
    const estimatedDriveMinutes = Math.round((distanceKm / 45) * 60 + 5);
    const distanceScore = Math.max(0, 1 - distanceKm / 60);

    // 4. Capacity & Current Load
    const activeCases = allCases.filter(
      (c) =>
        (c.originatingCenterId === center.id || (c as any).clinicId === center.id || c.externalFacilityId === center.id) &&
        c.status !== 'COMPLETED' &&
        c.status !== 'CANCELLED'
    ).length;

    const maxDailyCapacity = center.maxDailyCapacity || 50;
    const capacityUtilizationPercent = Math.min(100, Math.round((activeCases / maxDailyCapacity) * 100));
    const capacityScore = Math.max(0, 1 - activeCases / maxDailyCapacity);

    // 5. Radiographer Availability
    const certifiedRadiographers = allUsers.filter((u) => {
      const isCenterMatch =
        u.healthcareCenterId === center.id || u.deploymentLocationId === center.id;
      const isRad =
        u.role === 'Radiographer' ||
        u.role === 'Public Hospital Radiographer' ||
        u.role === 'Private Hospital Radiographer';
      const isAvailable = u.status === 'active' && u.leaveStatus !== 'On Leave';
      return isCenterMatch && isRad && isAvailable;
    });

    const staffScore = Math.min(1, certifiedRadiographers.length / 2);

    // Multi-factor weighted score calculation
    let wModality = 0.25;
    let wEquipment = 0.25;
    let wDistance = 0.20;
    let wCapacity = 0.15;
    let wStaff = 0.15;

    // Adjust weights for clinical urgency
    if (urgency === 'Emergency') {
      wDistance = 0.35;
      wEquipment = 0.30;
      wCapacity = 0.15;
      wStaff = 0.10;
      wModality = 0.10;
    } else if (urgency === 'Urgent') {
      wDistance = 0.25;
      wEquipment = 0.25;
      wCapacity = 0.20;
      wStaff = 0.15;
      wModality = 0.15;
    }

    if (!modalityMatch && centerEquipment.length === 0) {
      // Zero out score if modality is completely unsupported
      equipmentScore = 0;
    }

    const rawScore =
      (modalityMatch ? 1 : 0) * wModality +
      equipmentScore * wEquipment +
      distanceScore * wDistance +
      capacityScore * wCapacity +
      staffScore * wStaff;

    const suitabilityScore = Math.min(100, Math.max(0, Math.round(rawScore * 100)));

    // Recommendation Rationale explanation
    let recommendationReason = `${center.name} is ${distanceKm}km away (${estimatedDriveMinutes} min drive). `;
    if (availableMachines.length > 0) {
      recommendationReason += `${availableMachines.length} ${requiredModality} unit(s) operational. `;
    } else if (inUseMachines.length > 0) {
      recommendationReason += `${requiredModality} unit currently in use (short queue). `;
    } else if (offlineMachines.length > 0) {
      recommendationReason += `Warning: ${offlineMachines.length} machine(s) offline. `;
    }
    if (certifiedRadiographers.length > 0) {
      recommendationReason += `${certifiedRadiographers.length} radiographer(s) on duty.`;
    } else {
      recommendationReason += `Staff standby mode.`;
    }

    return {
      facilityId: center.id,
      facilityName: center.name,
      organizationType: center.organizationType || 'Public Hospital',
      distanceKm,
      estimatedDriveMinutes,
      availableEquipmentCount: availableMachines.length,
      equipmentNames: centerEquipment.map((e) => `${e.name} (${e.status})`),
      activeCaseload: activeCases,
      maxDailyCapacity,
      capacityUtilizationPercent,
      availableRadiographersCount: certifiedRadiographers.length,
      radiographerNames: certifiedRadiographers.map((r) => r.name),
      suitabilityScore,
      scoreBreakdown: {
        modalityMatch,
        equipmentScore: Math.round(equipmentScore * 100),
        distanceScore: Math.round(distanceScore * 100),
        capacityScore: Math.round(capacityScore * 100),
        staffScore: Math.round(staffScore * 100),
      },
      recommendationReason,
    };
  });

  // Sort ranked by highest suitability score descending
  return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}