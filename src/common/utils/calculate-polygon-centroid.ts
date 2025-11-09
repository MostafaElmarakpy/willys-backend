import { Coordinate } from '../classes/coordinates';

export interface Centroid {
  lat: number;
  lng: number;
}

export function calculatePolygonCentroid(coordinates: Coordinate[]): Centroid {
  const len = coordinates.length;

  if (len === 0) {
    throw new Error('Coordinates array cannot be empty');
  }

  if (len === 1) {
    const coord = coordinates[0];
    return {
      lat: typeof coord.lat === 'string' ? parseFloat(coord.lat) : coord.lat,
      lng: typeof coord.lng === 'string' ? parseFloat(coord.lng) : coord.lng,
    };
  }

  if (len <= 3) {
    let sumLat = 0;
    let sumLng = 0;

    for (let i = 0; i < len; i++) {
      const coord = coordinates[i];
      const lat =
        typeof coord.lat === 'string' ? parseFloat(coord.lat) : coord.lat;
      const lng =
        typeof coord.lng === 'string' ? parseFloat(coord.lng) : coord.lng;
      sumLat += lat;
      sumLng += lng;
    }

    return {
      lat: sumLat / len,
      lng: sumLng / len,
    };
  }

  const first = coordinates[0];
  const last = coordinates[len - 1];
  const firstLat =
    typeof first.lat === 'string' ? parseFloat(first.lat) : first.lat;
  const firstLng =
    typeof first.lng === 'string' ? parseFloat(first.lng) : first.lng;
  const lastLat =
    typeof last.lat === 'string' ? parseFloat(last.lat) : last.lat;
  const lastLng =
    typeof last.lng === 'string' ? parseFloat(last.lng) : last.lng;

  const isClosed = firstLat === lastLat && firstLng === lastLng;
  const loopEnd = isClosed ? len - 1 : len;

  let area = 0;
  let centroidLat = 0;
  let centroidLng = 0;

  for (let i = 0; i < loopEnd; i++) {
    const curr = coordinates[i];
    const next = i === loopEnd - 1 ? coordinates[0] : coordinates[i + 1];

    const x0 = typeof curr.lng === 'string' ? parseFloat(curr.lng) : curr.lng;
    const y0 = typeof curr.lat === 'string' ? parseFloat(curr.lat) : curr.lat;
    const x1 = typeof next.lng === 'string' ? parseFloat(next.lng) : next.lng;
    const y1 = typeof next.lat === 'string' ? parseFloat(next.lat) : next.lat;

    const cross = x0 * y1 - x1 * y0;
    area += cross;
    centroidLat += (y0 + y1) * cross;
    centroidLng += (x0 + x1) * cross;
  }

  area *= 0.5;

  if (Math.abs(area) < 1e-10) {
    let sumLat = 0;
    let sumLng = 0;

    for (let i = 0; i < len; i++) {
      const coord = coordinates[i];
      const lat =
        typeof coord.lat === 'string' ? parseFloat(coord.lat) : coord.lat;
      const lng =
        typeof coord.lng === 'string' ? parseFloat(coord.lng) : coord.lng;
      sumLat += lat;
      sumLng += lng;
    }

    return {
      lat: sumLat / len,
      lng: sumLng / len,
    };
  }

  const sixArea = 6 * area;
  return {
    lat: centroidLat / sixArea,
    lng: centroidLng / sixArea,
  };
}
