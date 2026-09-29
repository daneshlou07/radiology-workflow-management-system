/**
 * Malaysian Predictive Address Service
 * Provides real-time dynamic autocompletion, fuzzy local search, and GPS reverse geocoding
 * optimized for Malaysian residential addresses, postcodes, and landmarks.
 */

import { reverseGeocode as googleReverseGeocode, loadGoogleMapsSDK } from './googleMapsService';
import { MALAYSIAN_HEALTHCARE_FACILITIES } from '../data/malaysianHealthcareFacilities';

export interface AddressSuggestion {
  id: string;
  formattedAddress: string;
  street?: string;
  areaOrTaman?: string;
  city: string;
  postcode?: string;
  state: string;
  type: 'street' | 'taman' | 'city' | 'postcode' | 'landmark' | 'hospital';
  lat?: number;
  lon?: number;
  source: 'api' | 'local' | 'gps';
}

// Extensive offline database covering major Malaysian regions, postcodes, and landmarks
export const MALAYSIAN_ADDRESS_DATABASE: AddressSuggestion[] = [
  // Selangor - Petaling / Cyberjaya / Putrajaya / Klang Valley
  {
    id: 'my-loc-1',
    formattedAddress: '8, Jalan Puteri 5D/3, Bandar Puteri, 47100 Puchong, Selangor',
    street: 'Jalan Puteri 5D/3',
    areaOrTaman: 'Bandar Puteri',
    city: 'Puchong',
    postcode: '47100',
    state: 'Selangor',
    type: 'taman',
    lat: 3.0232,
    lon: 101.6171,
    source: 'local'
  },
  {
    id: 'my-loc-2',
    formattedAddress: 'Persiaran APEC, Cyber 12, 63000 Cyberjaya, Selangor',
    street: 'Persiaran APEC',
    areaOrTaman: 'Cyber 12',
    city: 'Cyberjaya',
    postcode: '63000',
    state: 'Selangor',
    type: 'street',
    lat: 2.9213,
    lon: 101.6559,
    source: 'local'
  },
  {
    id: 'my-loc-3',
    formattedAddress: 'Jalan P18, Presint 18, 62150 Putrajaya',
    street: 'Jalan P18',
    areaOrTaman: 'Presint 18',
    city: 'Putrajaya',
    postcode: '62150',
    state: 'Wilayah Persekutuan Putrajaya',
    type: 'taman',
    lat: 2.9264,
    lon: 101.6964,
    source: 'local'
  },
  {
    id: 'my-loc-4',
    formattedAddress: 'Jalan Reko, 43650 Bandar Baru Bangi, Selangor',
    street: 'Jalan Reko',
    areaOrTaman: 'Bandar Baru Bangi',
    city: 'Kajang',
    postcode: '43650',
    state: 'Selangor',
    type: 'street',
    lat: 2.9469,
    lon: 101.7636,
    source: 'local'
  },
  {
    id: 'my-loc-5',
    formattedAddress: 'Universiti Tenaga Nasional, Putrajaya Campus, 43000 Kajang, Selangor',
    street: 'Jalan IKRAM-UNITEN',
    areaOrTaman: 'UNITEN Campus',
    city: 'Kajang',
    postcode: '43000',
    state: 'Selangor',
    type: 'landmark',
    lat: 2.9686,
    lon: 101.7344,
    source: 'local'
  },
  {
    id: 'my-loc-6',
    formattedAddress: 'KM8, Jalan Sungai Terap 5, 45500 Tanjong Karang, Selangor',
    street: 'Jalan Sungai Terap 5',
    areaOrTaman: 'Kampung Sungai Terap',
    city: 'Tanjong Karang',
    postcode: '45500',
    state: 'Selangor',
    type: 'street',
    lat: 3.4242,
    lon: 101.1824,
    source: 'local'
  },
  {
    id: 'my-loc-7',
    formattedAddress: 'JKR 1087, Jln 14, Ijok, 45600 Batang Berjuntai, Selangor',
    street: 'Jalan 14',
    areaOrTaman: 'Pekan Ijok',
    city: 'Bestari Jaya',
    postcode: '45600',
    state: 'Selangor',
    type: 'street',
    lat: 3.3636,
    lon: 101.3843,
    source: 'local'
  },
  {
    id: 'my-loc-8',
    formattedAddress: 'Jln Rizab Masjid, Kampung Bukit Cherakah, 45800 Jeram, Selangor',
    street: 'Jalan Rizab Masjid',
    areaOrTaman: 'Kampung Bukit Cherakah',
    city: 'Jeram',
    postcode: '45800',
    state: 'Selangor',
    type: 'street',
    lat: 3.2072,
    lon: 101.4633,
    source: 'local'
  },
  {
    id: 'my-loc-9',
    formattedAddress: '15, Jalan SS 15/4D, Subang Jaya, 47500 Subang Jaya, Selangor',
    street: 'Jalan SS 15/4D',
    areaOrTaman: 'SS 15',
    city: 'Subang Jaya',
    postcode: '47500',
    state: 'Selangor',
    type: 'taman',
    lat: 3.0765,
    lon: 101.5866,
    source: 'local'
  },
  {
    id: 'my-loc-10',
    formattedAddress: 'Jalan Universiti, Section 11, 46200 Petaling Jaya, Selangor',
    street: 'Jalan Universiti',
    areaOrTaman: 'Section 11',
    city: 'Petaling Jaya',
    postcode: '46200',
    state: 'Selangor',
    type: 'street',
    lat: 3.1186,
    lon: 101.6534,
    source: 'local'
  },
  {
    id: 'my-loc-11',
    formattedAddress: 'Persiaran Kewajipan, USJ 8, 47610 Subang Jaya, Selangor',
    street: 'Persiaran Kewajipan',
    areaOrTaman: 'USJ 8',
    city: 'Subang Jaya',
    postcode: '47610',
    state: 'Selangor',
    type: 'taman',
    lat: 3.0483,
    lon: 101.5902,
    source: 'local'
  },
  {
    id: 'my-loc-12',
    formattedAddress: 'Jalan Hospital, 40000 Shah Alam, Selangor',
    street: 'Jalan Hospital',
    areaOrTaman: 'Seksyen 7',
    city: 'Shah Alam',
    postcode: '40000',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.0738,
    lon: 101.5183,
    source: 'local'
  },

  // Kuala Lumpur
  {
    id: 'my-loc-13',
    formattedAddress: 'Jalan Ampang, Kampung Datuk Keramat, 50450 Kuala Lumpur',
    street: 'Jalan Ampang',
    areaOrTaman: 'Datuk Keramat',
    city: 'Kuala Lumpur',
    postcode: '50450',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'street',
    lat: 3.1597,
    lon: 101.7171,
    source: 'local'
  },
  {
    id: 'my-loc-14',
    formattedAddress: 'Jalan Tun Mohd Fuad, Taman Tun Dr Ismail, 60000 Kuala Lumpur',
    street: 'Jalan Tun Mohd Fuad',
    areaOrTaman: 'Taman Tun Dr Ismail (TTDI)',
    city: 'Kuala Lumpur',
    postcode: '60000',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'taman',
    lat: 3.1390,
    lon: 101.6289,
    source: 'local'
  },
  {
    id: 'my-loc-15',
    formattedAddress: 'Jalan Bukit Bintang, Bukit Bintang, 55100 Kuala Lumpur',
    street: 'Jalan Bukit Bintang',
    areaOrTaman: 'Bukit Bintang',
    city: 'Kuala Lumpur',
    postcode: '55100',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'street',
    lat: 3.1466,
    lon: 101.7114,
    source: 'local'
  },
  {
    id: 'my-loc-16',
    formattedAddress: 'Jalan Jalil Perkasa 1, Bukit Jalil, 57000 Kuala Lumpur',
    street: 'Jalan Jalil Perkasa 1',
    areaOrTaman: 'Bukit Jalil',
    city: 'Kuala Lumpur',
    postcode: '57000',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'taman',
    lat: 3.0581,
    lon: 101.6917,
    source: 'local'
  },
  {
    id: 'my-loc-17',
    formattedAddress: 'Jalan Cheras, Taman Connaught, 56000 Kuala Lumpur',
    street: 'Jalan Cheras',
    areaOrTaman: 'Taman Connaught',
    city: 'Kuala Lumpur',
    postcode: '56000',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'taman',
    lat: 3.0827,
    lon: 101.7371,
    source: 'local'
  },

  // Penang
  {
    id: 'my-loc-18',
    formattedAddress: 'Jalan Residency, 10450 George Town, Pulau Pinang',
    street: 'Jalan Residency',
    areaOrTaman: 'George Town',
    city: 'George Town',
    postcode: '10450',
    state: 'Pulau Pinang',
    type: 'street',
    lat: 5.4141,
    lon: 100.3288,
    source: 'local'
  },
  {
    id: 'my-loc-19',
    formattedAddress: 'Jalan Bayan Lepas, 11900 Bayan Lepas, Pulau Pinang',
    street: 'Jalan Bayan Lepas',
    areaOrTaman: 'Bayan Lepas',
    city: 'Bayan Lepas',
    postcode: '11900',
    state: 'Pulau Pinang',
    type: 'street',
    lat: 5.2974,
    lon: 100.2769,
    source: 'local'
  },

  // Johor
  {
    id: 'my-loc-20',
    formattedAddress: 'Jalan Skudai, Taman University, 81300 Skudai, Johor',
    street: 'Jalan Skudai',
    areaOrTaman: 'Taman Universiti',
    city: 'Skudai',
    postcode: '81300',
    state: 'Johor',
    type: 'taman',
    lat: 1.5362,
    lon: 103.6565,
    source: 'local'
  },
  {
    id: 'my-loc-21',
    formattedAddress: 'Jalan Tun Abdul Razak, 80000 Johor Bahru, Johor',
    street: 'Jalan Tun Abdul Razak',
    areaOrTaman: 'Pusat Bandar',
    city: 'Johor Bahru',
    postcode: '80000',
    state: 'Johor',
    type: 'street',
    lat: 1.4927,
    lon: 103.7414,
    source: 'local'
  },

  // Perak
  {
    id: 'my-loc-22',
    formattedAddress: 'Jalan Sultan Iskandar, 30000 Ipoh, Perak',
    street: 'Jalan Sultan Iskandar',
    areaOrTaman: 'Old Town',
    city: 'Ipoh',
    postcode: '30000',
    state: 'Perak',
    type: 'street',
    lat: 4.5975,
    lon: 101.0901,
    source: 'local'
  },

  // Malacca
  {
    id: 'my-loc-23',
    formattedAddress: 'Jalan Merdeka, Taman Melaka Raya, 75000 Melaka',
    street: 'Jalan Merdeka',
    areaOrTaman: 'Taman Melaka Raya',
    city: 'Melaka',
    postcode: '75000',
    state: 'Melaka',
    type: 'taman',
    lat: 2.1896,
    lon: 102.2501,
    source: 'local'
  },

  // Negeri Sembilan
  {
    id: 'my-loc-24',
    formattedAddress: 'Jalan Rasah, 70300 Seremban, Negeri Sembilan',
    street: 'Jalan Rasah',
    areaOrTaman: 'Rasah',
    city: 'Seremban',
    postcode: '70300',
    state: 'Negeri Sembilan',
    type: 'street',
    lat: 2.7258,
    lon: 101.9424,
    source: 'local'
  },

  // Pahang
  {
    id: 'my-loc-25',
    formattedAddress: 'Jalan Teluk Cempedak, 25050 Kuantan, Pahang',
    street: 'Jalan Teluk Cempedak',
    areaOrTaman: 'Teluk Cempedak',
    city: 'Kuantan',
    postcode: '25050',
    state: 'Pahang',
    type: 'street',
    lat: 3.8077,
    lon: 103.3256,
    source: 'local'
  },

  // Sabah & Sarawak
  {
    id: 'my-loc-26',
    formattedAddress: 'Jalan Tun Fuad Stephens, 88000 Kota Kinabalu, Sabah',
    street: 'Jalan Tun Fuad Stephens',
    areaOrTaman: 'Pusat Bandar',
    city: 'Kota Kinabalu',
    postcode: '88000',
    state: 'Sabah',
    type: 'street',
    lat: 5.9804,
    lon: 116.0735,
    source: 'local'
  },
  {
    id: 'my-loc-27',
    formattedAddress: 'Jalan Tun Abang Haji Openg, 93000 Kuching, Sarawak',
    street: 'Jalan Tun Abang Haji Openg',
    areaOrTaman: 'City Centre',
    city: 'Kuching',
    postcode: '93000',
    state: 'Sarawak',
    type: 'street',
    lat: 1.5535,
    lon: 110.3593,
    source: 'local'
  }
];

/**
 * Filter local database using fuzzy query matching and healthcare facility alias expansions
 */
function searchLocalDatabase(query: string): AddressSuggestion[] {
  let cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  // Alias expansions for common Malaysian healthcare acronyms
  const acronyms: Record<string, string> = {
    'hkl': 'hospital kuala lumpur',
    'ppum': 'pusat perubatan universiti malaya',
    'hctm': 'hospital canselor tuanku muhriz',
    'ikn': 'institut kanser negara',
    'htar': 'hospital tengku ampuan rahimah',
    'hrpb': 'hospital raja permaisuri bainun',
    'hsa': 'hospital sultanah aminah',
    'hsi': 'hospital sultan ismail',
    'htj': 'hospital tuanku ja\'afar',
    'htaa': 'hospital tengku ampuan afzan',
    'hrpz': 'hospital raja perempuan zainab',
    'hsnz': 'hospital sultanah nur zahirah',
    'sgh': 'hospital umum sarawak',
    'sjmc': 'subang jaya medical centre',
    'kpj': 'kpj damansara specialist',
  };

  const expandedQuery = acronyms[cleanQuery] || cleanQuery;
  const queryWords = expandedQuery.split(/[\s,]+/).filter(w => w.length > 0);

  // 1. Search healthcare facilities first (highest priority)
  const matchedFacilities = MALAYSIAN_HEALTHCARE_FACILITIES.filter(item => {
    const fullText = item.formattedAddress.toLowerCase();
    return queryWords.every(word => {
      if (word === 'kk' && fullText.includes('klinik kesihatan')) return true;
      if (word === 'kd' && fullText.includes('klinik desa')) return true;
      if (word === 'hosp' && fullText.includes('hospital')) return true;
      return fullText.includes(word);
    });
  });

  // 2. Search general addresses
  const matchedAddresses = MALAYSIAN_ADDRESS_DATABASE.filter(item => {
    const fullText = item.formattedAddress.toLowerCase();
    return queryWords.every(word => fullText.includes(word));
  });

  return [...matchedFacilities, ...matchedAddresses].slice(0, 10);
}

/**
 * Fetch predictive address suggestions from OpenStreetMap Photon API (fast, typeahead tuned)
 */
async function fetchPhotonSuggestions(query: string): Promise<AddressSuggestion[]> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&countrycode=my&limit=8&lat=4.2105&lon=101.9758`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features.map((feat: any, idx: number) => {
      const props = feat.properties || {};
      const coords = feat.geometry?.coordinates || [0, 0];
      const lon = coords[0];
      const lat = coords[1];

      const name = props.name || props.street || '';
      const housenumber = props.housenumber ? `${props.housenumber}, ` : '';
      const street = props.street || name;
      const district = props.district || props.suburb || props.locality || '';
      const city = props.city || props.town || props.county || 'Malaysia';
      const postcode = props.postcode || '';
      const state = props.state || '';

      // Build clean Malaysian formatted address string
      const addressParts = [
        `${housenumber}${name !== street ? name : street}`.trim(),
        district,
        postcode ? `${postcode} ${city}`.trim() : city,
        state
      ].filter(Boolean);

      const formatted = addressParts.join(', ');

      return {
        id: `photon-${idx}-${Date.now()}`,
        formattedAddress: formatted.includes('Malaysia') ? formatted : `${formatted}, Malaysia`,
        street: street,
        areaOrTaman: district,
        city: city,
        postcode: postcode,
        state: state,
        type: props.osm_value === 'hospital' ? 'hospital' : props.housenumber ? 'street' : 'taman',
        lat: lat,
        lon: lon,
      };
    }).filter((item: AddressSuggestion) => item.formattedAddress.length > 5);
  } catch (err) {
    console.warn('Photon autocomplete query failed:', err);
    return [];
  }
}

/**
 * Fetch predictive address suggestions from OpenStreetMap Nominatim API (Fallback API)
 */
async function fetchNominatimSuggestions(query: string): Promise<AddressSuggestion[]> {
  try {
    const encoded = encodeURIComponent(query + ', Malaysia');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=my&addressdetails=1&limit=6`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any, idx: number) => {
      return {
        id: `nom-${idx}-${Date.now()}`,
        formattedAddress: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.county || 'Malaysia',
        postcode: item.address?.postcode || '',
        state: item.address?.state || '',
        type: 'street' as const,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        source: 'api' as const
      };
    });
  } catch (err) {
    console.warn('Nominatim autocomplete query failed:', err);
    return [];
  }
}

let googleAutocompleteService: google.maps.places.AutocompleteService | null = null;

/**
 * Fetch real-time Malaysian address predictions from Google Places Autocomplete API
 */
async function fetchGooglePlacesSuggestions(query: string): Promise<AddressSuggestion[]> {
  try {
    const g = await loadGoogleMapsSDK();
    if (!g || !g.maps || !g.maps.places) return [];

    if (!googleAutocompleteService) {
      googleAutocompleteService = new g.maps.places.AutocompleteService();
    }

    const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve) => {
      googleAutocompleteService!.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'my' },
        },
        (results, status) => {
          if (status === g.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            resolve([]);
          }
        }
      );
    });

    return predictions.map((pred, idx) => {
      let type: AddressSuggestion['type'] = 'street';
      const types = pred.types || [];
      if (types.includes('hospital') || types.includes('health') || types.includes('doctor')) {
        type = 'hospital';
      } else if (
        types.includes('sublocality') ||
        types.includes('neighborhood') ||
        types.includes('administrative_area_level_3')
      ) {
        type = 'taman';
      } else if (types.includes('point_of_interest') || types.includes('establishment')) {
        type = 'landmark';
      }

      return {
        id: pred.place_id || `gplace-${idx}-${Date.now()}`,
        formattedAddress: pred.description,
        street: pred.structured_formatting?.main_text || '',
        city: pred.structured_formatting?.secondary_text || 'Malaysia',
        state: 'Malaysia',
        type,
        source: 'api' as const,
      };
    });
  } catch (err) {
    console.warn('Google Places autocomplete query failed, falling back to OSM:', err);
    return [];
  }
}

/**
 * Primary Search Function: Combines offline database & real-time online API suggestions (Google Places first, OSM fallback)
 */
export async function searchMalaysianAddresses(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // 1. Get instant local database results
  const localResults = searchLocalDatabase(trimmed);

  // 2. Fetch live Google Places Autocomplete suggestions
  try {
    const googleResults = await fetchGooglePlacesSuggestions(trimmed);
    if (googleResults.length > 0) {
      const existingAddresses = new Set(googleResults.map((r) => r.formattedAddress.toLowerCase()));
      const combined = [...googleResults];
      for (const loc of localResults) {
        if (!existingAddresses.has(loc.formattedAddress.toLowerCase())) {
          combined.push(loc);
        }
      }
      return combined.slice(0, 8);
    }
  } catch {
    // Fall back to OSM
  }

  // 3. Fallback to Photon / Nominatim if Google Places returns empty or on error
  try {
    const photonResults = await fetchPhotonSuggestions(trimmed);
    let combinedResults = [...photonResults];

    if (combinedResults.length === 0) {
      const nomResults = await fetchNominatimSuggestions(trimmed);
      combinedResults = [...nomResults];
    }

    // Merge API results with local results, avoiding exact duplicates
    const existingAddresses = new Set(combinedResults.map((r) => r.formattedAddress.toLowerCase()));
    for (const loc of localResults) {
      if (!existingAddresses.has(loc.formattedAddress.toLowerCase())) {
        combinedResults.push(loc);
      }
    }

    return combinedResults.slice(0, 8);
  } catch (error) {
    // If network fails, gracefully return local database matches
    return localResults;
  }
}

/**
 * GPS Geolocation helper to detect current location and reverse-geocode into a Malaysian address
 */
export async function getCurrentLocationAddress(): Promise<{ address: string; lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          // First attempt Google Reverse Geocode if available
          const googleAddr = await googleReverseGeocode(lat, lon);
          if (googleAddr) {
            resolve({ address: googleAddr, lat, lon });
            return;
          }

          // Fallback to OSM Nominatim Reverse Geocode
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              resolve({ address: data.display_name, lat, lon });
              return;
            }
          }
        } catch (e) {
          console.warn('Reverse geocoding failed:', e);
        }

        // Default coordinate string if reverse geocode service is unavailable
        resolve({ address: `GPS Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)} (Malaysia)`, lat, lon });
      },
      (err) => {
        console.warn('Geolocation permission denied or failed:', err);
        resolve(null);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}
