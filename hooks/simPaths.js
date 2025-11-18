// simPaths.js - example 401 routes for Virtual Car Simulation (JS + JSDoc)

/** @typedef {{ lat:number, lng:number }} Position */
/** @typedef {"Eastbound"|"Westbound"|"Unknown"} Direction */
/** @typedef {{ id:string, name:string, start: Position, end: Position }} SimPath */

/** @type {SimPath} */
export const HWY401_PROVIDED_EAST = {
  id: "401_provided_east",
  name: "HWY 401: Provided A → B (Eastbound)",
  start: { lat: 43.721393, lng: -79.485637 },
  end: { lat: 43.918912, lng: -78.958862 },
};

/** @type {SimPath} */
export const HWY401_PROVIDED_WEST = {
  id: "401_provided_west",
  name: "HWY 401: Provided B → A (Westbound)",
  start: { lat: 43.918912, lng: -78.958862 },
  end: { lat: 43.721393, lng: -79.485637 },
};

/** @type {SimPath} */
export const HWY401_KEELE_TO_412_EAST = {
  id: "401_keele_to_412_east",
  name: "HWY 401: Keele → 412 (Eastbound)",
  // Approximate coords
  start: { lat: 43.7265, lng: -79.4687 }, // around Keele/401 area
  end: { lat: 43.8873, lng: -78.942 }, // around Hwy 412/401 area
};

/** @type {SimPath} */
export const HWY401_412_TO_KEELE_WEST = {
  id: "401_412_to_keele_west",
  name: "HWY 401: 412 → Keele (Westbound)",
  start: { lat: 43.8873, lng: -78.942 },
  end: { lat: 43.7265, lng: -79.4687 },
};

/** @type {SimPath[]} */
export const DEFAULT_SIM_PATHS = [
  HWY401_PROVIDED_EAST,
  HWY401_PROVIDED_WEST,
  HWY401_KEELE_TO_412_EAST,
  HWY401_412_TO_KEELE_WEST,
];
