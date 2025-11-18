// useVirtualCar.js - Virtual car simulation hook (JavaScript with JSDoc types)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * @typedef {Object} Position
 * @property {number} lat
 * @property {number} lng
 */

/**
 * @typedef {"Eastbound"|"Westbound"|"Unknown"} Direction
 */

/**
 * @typedef {Object} SimPath
 * @property {string} id
 * @property {string} name
 * @property {Position} start
 * @property {Position} end
 */

/**
 * @param {Object} options
 * @param {SimPath} options.path
 * @param {number} [options.durationMs=300000]
 * @param {number} [options.tickMs=1000]
 * @returns {{
 *  position: Position,
 *  direction: Direction,
 *  progress: number,
 *  isRunning: boolean,
 *  start: () => void,
 *  pause: () => void,
 *  reset: () => void,
 * }}
 */
export default function useVirtualCar(options) {
  const path = options?.path;
  const durationMs = options?.durationMs ?? 300000; // 5 min
  const tickMs = options?.tickMs ?? 1000; // 1s

  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [direction, setDirection] = useState(
    /** @type {Direction} */ ("Unknown")
  );

  const startTimeRef = useRef(/** @type {number|null} */ (null));
  const lastLngRef = useRef(/** @type {number|null} */ (null));
  const intervalRef = useRef(/** @type {number|NodeJS.Timeout|null} */ (null));

  const position = useMemo(() => {
    if (!path) return { lat: 0, lng: 0 };
    const lat = path.start.lat + (path.end.lat - path.start.lat) * progress;
    const lng = path.start.lng + (path.end.lng - path.start.lng) * progress;
    return { lat, lng };
  }, [path, progress]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setProgress(0);
    setDirection("Unknown");
    startTimeRef.current = null;
    lastLngRef.current = null;
  }, [clearTimer]);

  const start = useCallback(() => {
    if (!path) return;
    // If finished, reset first
    if (progress >= 1) {
      setProgress(0);
      setDirection("Unknown");
      startTimeRef.current = null;
      lastLngRef.current = null;
    }
    setIsRunning(true);
    const now = Date.now();
    startTimeRef.current = now - progress * durationMs;

    clearTimer();
    intervalRef.current = setInterval(() => {
      const t = Date.now();
      const base = startTimeRef.current ?? t;
      const elapsed = Math.max(0, t - base);
      const nextProgress = Math.min(1, elapsed / durationMs);
      // Compute next interpolated position
      const nextLat =
        path.start.lat + (path.end.lat - path.start.lat) * nextProgress;
      const nextLng =
        path.start.lng + (path.end.lng - path.start.lng) * nextProgress;

      // Direction by change in longitude
      if (lastLngRef.current != null) {
        const diff = nextLng - lastLngRef.current;
        const EPS = 1e-7;
        if (Math.abs(diff) > EPS) {
          setDirection(diff > 0 ? "Eastbound" : "Westbound");
        }
      }
      lastLngRef.current = nextLng;

      setProgress(nextProgress);

      // Auto stop
      if (nextProgress >= 1) {
        clearTimer();
        setIsRunning(false);
      }
    }, tickMs);
  }, [path, progress, durationMs, tickMs, clearTimer]);

  // When options change, just clear interval and caches (no setState here)
  useEffect(() => {
    clearTimer();
    startTimeRef.current = null;
    lastLngRef.current = null;
  }, [path?.id, durationMs, tickMs, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Note: Avoid calling setState in effect. Consumers can restart manually after option changes.

  return {
    position,
    direction,
    progress,
    isRunning,
    start,
    pause,
    reset,
  };
}
