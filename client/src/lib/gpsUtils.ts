export function isBasicValidCoord(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterValidGpsCoords(
  coords: [number, number][],
  maxRadiusKm = 1000
): [number, number][] {
  const basic = coords.filter(([lat, lng]) => isBasicValidCoord(lat, lng));
  if (basic.length < 2) return basic;

  const sortedLats = basic.map(([lat]) => lat).sort((a, b) => a - b);
  const sortedLngs = basic.map(([, lng]) => lng).sort((a, b) => a - b);
  const mid = Math.floor(basic.length / 2);
  const medLat = sortedLats[mid];
  const medLng = sortedLngs[mid];

  return basic.filter(
    ([lat, lng]) => haversineKm(medLat, medLng, lat, lng) <= maxRadiusKm
  );
}
