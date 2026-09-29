/**
 * Google Maps Integration Service
 * Provides geocoding, directions, and distance matrix APIs
 */

import type { RouteInfo } from '../types';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Fallback to OSRM if Google Maps API key is not configured
const useGoogleMaps = Boolean(GOOGLE_MAPS_API_KEY);

/**
 * Geocode an address to lat/lng using Google Geocoding API
 * Falls back to Nominatim (OpenStreetMap) if Google Maps is not configured
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  if (!useGoogleMaps) {
    // Fall back to Nominatim (existing implementation)
    return geocodeWithNominatim(address);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Malaysia')}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const placeId = data.results[0].place_id;
        
        return {
          lat: location.lat,
          lon: location.lng,
          // placeId available but not part of the return type
        };
      }
    }
    
    // Fall back to Nominatim on error
    return geocodeWithNominatim(address);
  } catch (error) {
    console.warn('Google Geocoding failed, falling back to Nominatim:', error);
    return geocodeWithNominatim(address);
  }
}

/**
 * Reverse geocode lat/lng to address using Google Reverse Geocoding API
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  if (!useGoogleMaps) {
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
    }
  } catch (error) {
    console.warn('Google Reverse Geocoding failed:', error);
  }
  
  return null;
}

/**
 * Get driving directions between two points using Google Directions API
 * Falls back to OSRM if Google Maps is not configured
 */
export async function getDirections(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  options?: {
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
    departureTime?: Date;
  }
): Promise<RouteInfo> {
  if (!useGoogleMaps) {
    // Fall back to OSRM (existing implementation)
    return getDirectionsWithOSRM(fromLat, fromLon, toLat, toLon);
  }

  try {
    const mode = options?.mode || 'driving';
    const origin = `${fromLat},${fromLon}`;
    const destination = `${toLat},${toLon}`;
    
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
    
    if (options?.departureTime) {
      url += `&departure_time=${Math.floor(options.departureTime.getTime() / 1000)}`;
    }
    
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        // Decode polyline
        const polylineCoords = decodePolyline(route.overview_polyline.points);
        
        return {
          distanceKm: Math.round((leg.distance.value / 1000) * 10) / 10,
          durationMinutes: Math.round(leg.duration.value / 60),
          polylineCoords,
          durationInTraffic: leg.duration_in_traffic ? Math.round(leg.duration_in_traffic.value / 60) : undefined,
        };
      }
    }
    
    // Fall back to OSRM on error
    return getDirectionsWithOSRM(fromLat, fromLon, toLat, toLon);
  } catch (error) {
    console.warn('Google Directions failed, falling back to OSRM:', error);
    return getDirectionsWithOSRM(fromLat, fromLon, toLat, toLon);
  }
}

/**
 * Calculate distance matrix for multiple origins and destinations
 * Useful for IAS optimization (finding best radiographer for multiple cases)
 */
export async function getDistanceMatrix(
  origins: Array<{ lat: number; lon: number }>,
  destinations: Array<{ lat: number; lon: number }>,
  options?: {
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
    departureTime?: Date;
  }
): Promise<{
  rows: Array<{
    elements: Array<{
      distanceKm: number;
      durationMinutes: number;
      status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS';
    }>;
  }>;
}> {
  if (!useGoogleMaps) {
    throw new Error('Distance Matrix requires Google Maps API key');
  }

  const mode = options?.mode || 'driving';
  const originsStr = origins.map(o => `${o.lat},${o.lon}`).join('|');
  const destinationsStr = destinations.map(d => `${d.lat},${d.lon}`).join('|');
  
  let url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
  
  if (options?.departureTime) {
    url += `&departure_time=${Math.floor(options.departureTime.getTime() / 1000)}`;
  }
  
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  
  if (!response.ok) {
    throw new Error('Distance Matrix API request failed');
  }
  
  const data = await response.json();
  
  if (data.status !== 'OK') {
    throw new Error(`Distance Matrix API error: ${data.status}`);
  }
  
  return {
    rows: data.rows.map((row: any) => ({
      elements: row.elements.map((el: any) => ({
        distanceKm: el.status === 'OK' ? Math.round((el.distance.value / 1000) * 10) / 10 : 0,
        durationMinutes: el.status === 'OK' ? Math.round(el.duration.value / 60) : 0,
        status: el.status,
      })),
    })),
  };
}

/**
 * Get nearby places (e.g., hospitals, clinics) using Google Places API
 */
export async function getNearbyPlaces(
  lat: number,
  lon: number,
  type: 'hospital' | 'clinic' | 'pharmacy',
  radiusMeters: number = 5000
): Promise<Array<{
  name: string;
  address: string;
  lat: number;
  lon: number;
  placeId: string;
  rating?: number;
}>> {
  if (!useGoogleMaps) {
    return [];
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radiusMeters}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK') {
        return data.results.map((place: any) => ({
          name: place.name,
          address: place.vicinity,
          lat: place.geometry.location.lat,
          lon: place.geometry.location.lng,
          placeId: place.place_id,
          rating: place.rating,
        }));
      }
    }
  } catch (error) {
    console.warn('Google Places API failed:', error);
  }
  
  return [];
}

// ==================== FALLBACK IMPLEMENTATIONS ====================

/**
 * Fallback: Geocode with Nominatim (OpenStreetMap)
 */
async function geocodeWithNominatim(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const encoded = encodeURIComponent(address + ', Malaysia');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1&countrycodes=my`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    }
  } catch (error) {
    console.warn('Nominatim geocoding failed:', error);
  }
  
  return getKeywordFallback(address);
}

/**
 * Fallback: OSRM routing
 */
async function getDirectionsWithOSRM(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<RouteInfo> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    
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
  } catch (error) {
    console.warn('OSRM routing failed:', error);
  }
  
  // Ultimate fallback: Haversine distance
  return getHaversineFallback(fromLat, fromLon, toLat, toLon);
}

/**
 * Fallback: Keyword-based geocoding for Malaysian locations
 */
function getKeywordFallback(address: string): { lat: number; lon: number } {
  const lower = address.toLowerCase();
  const locations: { keywords: string[]; lat: number; lon: number }[] = [
    { keywords: ['tanjong karang', 'tanjung karang'], lat: 3.4242, lon: 101.1824 },
    { keywords: ['jeram'], lat: 3.2072, lon: 101.4633 },
    { keywords: ['batang berjuntai', 'ijok', 'bestari jaya'], lat: 3.3636, lon: 101.3843 },
    { keywords: ['putrajaya'], lat: 2.9264, lon: 101.6964 },
    { keywords: ['cyberjaya'], lat: 2.9213, lon: 101.6559 },
    { keywords: ['kuala lumpur', 'kl'], lat: 3.1390, lon: 101.6869 },
    { keywords: ['petaling jaya', 'pj'], lat: 3.1073, lon: 101.6067 },
    { keywords: ['shah alam'], lat: 3.0738, lon: 101.5183 },
  ];

  for (const loc of locations) {
    if (loc.keywords.some((kw) => lower.includes(kw))) {
      const jitter = () => (Math.random() - 0.5) * 0.01;
      return { lat: loc.lat + jitter(), lon: loc.lon + jitter() };
    }
  }

  // Default: central Selangor
  const jitter = () => (Math.random() - 0.5) * 0.05;
  return { lat: 3.0 + jitter(), lon: 101.65 + jitter() };
}

/**
 * Fallback: Haversine distance calculation
 */
function getHaversineFallback(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): RouteInfo {
  const R = 6371; // Earth radius in km
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  const roadFactor = 1.3;
  const adjustedDistance = Math.round(distance * roadFactor * 10) / 10;
  
  return {
    distanceKm: adjustedDistance,
    durationMinutes: Math.round((adjustedDistance / 40) * 60), // 40 km/h average
    polylineCoords: generateSimulatedPolyline(fromLat, fromLon, toLat, toLon),
  };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
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

/**
 * Decode Google Maps polyline to coordinates
 */
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}

let googleMapsLoaderPromise: Promise<typeof google> | null = null;

/**
 * Dynamically loads the official Google Maps JavaScript SDK
 */
export function loadGoogleMapsSDK(apiKey: string = GOOGLE_MAPS_API_KEY): Promise<typeof google> {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve((window as any).google);
  }

  if (!googleMapsLoaderPromise) {
    googleMapsLoaderPromise = new Promise((resolve, reject) => {
      if (!apiKey) {
        return reject(new Error('Google Maps API key is not configured'));
      }

      if (typeof document === 'undefined') {
        return reject(new Error('Window or document is not available'));
      }

      const existingScript = document.getElementById('google-maps-js-sdk');
      if (existingScript) {
        if ((window as any).google?.maps) {
          resolve((window as any).google);
        } else {
          existingScript.addEventListener('load', () => resolve((window as any).google));
          existingScript.addEventListener('error', (err) => reject(err));
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-js-sdk';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google?.maps) {
          resolve((window as any).google);
        } else {
          reject(new Error('Google Maps SDK loaded, but google.maps namespace was not found.'));
        }
      };
      script.onerror = (err) => {
        googleMapsLoaderPromise = null;
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  return googleMapsLoaderPromise;
}

// Re-export for convenience
export { useGoogleMaps, GOOGLE_MAPS_API_KEY };
