// Dummy GPS route samples for testing without real geolocation
// Each route: array of { lat, lon, timestamp }
// Timestamps are relative (ms offsets) and will be normalized when used.

export const dummyRoutes = {
  // Approximate HWY 401 Eastbound segment (Toronto -> Pickering)
  hwy401East: [
    { lat: 43.6415, lon: -79.3802, t: 0 }, // Near downtown Toronto
    { lat: 43.6477, lon: -79.3601, t: 3000 }, // Moving east
    { lat: 43.6611, lon: -79.3304, t: 6000 }, // Further east
    { lat: 43.6698, lon: -79.3003, t: 9000 }, // Near Scarborough
    { lat: 43.6805, lon: -79.2701, t: 12000 }, // East progression
    { lat: 43.6924, lon: -79.2401, t: 15000 }, // Approaching Pickering
  ],
  // HWY 400 Northbound sample (Vaughan -> Barrie direction)
  hwy400North: [
    { lat: 43.7902, lon: -79.5201, t: 0 }, // Vaughan area
    { lat: 43.8204, lon: -79.5503, t: 4000 },
    { lat: 43.8608, lon: -79.5805, t: 8000 },
    { lat: 43.9001, lon: -79.6004, t: 12000 },
    { lat: 43.9403, lon: -79.6202, t: 16000 }, // Approaching Barrie
  ],
  // QEW Toronto Bound (Niagara -> Toronto direction, simplified)
  qewTorontoBound: [
    { lat: 43.2001, lon: -79.0601, t: 0 }, // Niagara Falls area
    { lat: 43.2504, lon: -79.1002, t: 5000 },
    { lat: 43.3008, lon: -79.1504, t: 10000 },
    { lat: 43.3509, lon: -79.2003, t: 15000 },
    { lat: 43.4002, lon: -79.2501, t: 20000 }, // Toward Hamilton
  ],
};

export const routeLabels = {
  hwy401East: "HWY 401 Eastbound (Dummy)",
  hwy400North: "HWY 400 Northbound (Dummy)",
  qewTorontoBound: "QEW Toronto Bound (Dummy)",
};
