// Geocoding Service - Convert addresses to lat/lng coordinates
// Uses government data.gouv.fr API for French addresses (free, no API key required)

interface GeocodingResult {
  success: boolean;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  confidence?: number;
  error?: string;
}

interface DataGouvFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
  };
}

interface DataGouvResponse {
  type: string;
  features: DataGouvFeature[];
}

// Geocode a French address using data.gouv.fr API
export const geocodeAddress = async (
  address: string,
  postalCode?: string,
  city?: string
): Promise<GeocodingResult> => {
  try {
    // Build the query
    let query = address;
    if (postalCode) query += ` ${postalCode}`;
    if (city) query += ` ${city}`;

    const encodedQuery = encodeURIComponent(query);
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodedQuery}&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data: DataGouvResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        error: 'Address not found',
      };
    }

    const feature = data.features[0];
    const [lng, lat] = feature.geometry.coordinates;

    return {
      success: true,
      lat,
      lng,
      formattedAddress: feature.properties.label,
      confidence: feature.properties.score,
    };
  } catch (error: any) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Batch geocode multiple addresses
export const batchGeocode = async (
  addresses: Array<{
    id: string;
    address: string;
    postalCode?: string;
    city?: string;
  }>
): Promise<Map<string, GeocodingResult>> => {
  const results = new Map<string, GeocodingResult>();

  for (const addr of addresses) {
    const result = await geocodeAddress(addr.address, addr.postalCode, addr.city);
    results.set(addr.id, result);

    // Rate limiting - max 50 requests per second for data.gouv.fr
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  return results;
};

// Reverse geocode - get address from coordinates
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<GeocodingResult> => {
  try {
    const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`;

    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data: DataGouvResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        error: 'Location not found',
      };
    }

    const feature = data.features[0];
    const [returnedLng, returnedLat] = feature.geometry.coordinates;

    return {
      success: true,
      lat: returnedLat,
      lng: returnedLng,
      formattedAddress: feature.properties.label,
      confidence: feature.properties.score,
    };
  } catch (error: any) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculate estimated travel time (assuming average speed)
export const estimateTravelTime = (distanceKm: number, avgSpeedKmh: number = 50): number => {
  return Math.round((distanceKm / avgSpeedKmh) * 60); // Returns minutes
};

// Optimize route order for minimum distance (simple nearest neighbor algorithm)
export const optimizeRoute = (
  points: Array<{ id: string; lat: number; lng: number }>
): string[] => {
  if (points.length <= 2) {
    return points.map(p => p.id);
  }

  const visited = new Set<string>();
  const route: string[] = [];
  let current = points[0];

  visited.add(current.id);
  route.push(current.id);

  while (visited.size < points.length) {
    let nearestId = '';
    let nearestDist = Infinity;

    for (const point of points) {
      if (visited.has(point.id)) continue;

      const dist = calculateDistance(current.lat, current.lng, point.lat, point.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = point.id;
      }
    }

    if (nearestId) {
      visited.add(nearestId);
      route.push(nearestId);
      current = points.find(p => p.id === nearestId)!;
    }
  }

  return route;
};

export default {
  geocodeAddress,
  batchGeocode,
  reverseGeocode,
  calculateDistance,
  estimateTravelTime,
  optimizeRoute,
};
