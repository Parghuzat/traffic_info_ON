// usePosition.js - Unified position provider with optional simulation (JavaScript + JSDoc)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useVirtualCar from "@/hooks/useVirtualCar";

/**
 * @typedef {Object} Position
 * @property {number} lat
 * @property {number} lng
 */

/** @typedef {"Eastbound"|"Westbound"|"Unknown"} Direction */

/**
 * @typedef {Object} SimPath
 * @property {string} id
 * @property {string} name
 * @property {Position} start
 * @property {Position} end
 */

/**
 * @typedef {Object} UsePositionSimOptions
 * @property {SimPath} path
 * @property {number} [durationMs]
 * @property {number} [tickMs]
 */

/**
 * Single source of location + direction.
 * Does NOT replace existing pages automatically; import and opt-in where needed.
 *
 * @param {"real"|"sim"} [initialMode="real"]
 * @param {UsePositionSimOptions} [simOptions]
 */
export default function usePosition(initialMode = "real", simOptions) {
  const [mode, setMode] = useState(/** @type {"real"|"sim"} */ (initialMode));

  // Real mode state
  const [realPosition, setRealPosition] = useState(
    /** @type {Position|null} */ (null)
  );
  const [realDirection, setRealDirection] = useState(
    /** @type {Direction} */ ("Unknown")
  );
  const watchIdRef = useRef(/** @type {number|null} */ (null));
  const lastLngRef = useRef(/** @type {number|null} */ (null));

  // Sim mode via useVirtualCar
  const sim = useVirtualCar({
    path: simOptions?.path,
    durationMs: simOptions?.durationMs,
    tickMs: simOptions?.tickMs,
  });

  // Geolocation watch for real mode
  useEffect(() => {
    if (mode !== "real") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    // Start watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setRealPosition({ lat, lng });
        // Direction by lng delta
        if (lastLngRef.current != null) {
          const diff = lng - lastLngRef.current;
          const EPS = 1e-7;
          if (Math.abs(diff) > EPS) {
            setRealDirection(diff > 0 ? "Eastbound" : "Westbound");
          }
        }
        lastLngRef.current = lng;
      },
      () => {
        // ignore errors, keep null
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current != null && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    };
  }, [mode]);

  // Exposed API unifying both modes
  const value = useMemo(() => {
    if (mode === "sim") {
      return {
        position: sim.position,
        direction: sim.direction,
        mode,
        setMode,
        simControls: {
          isRunning: sim.isRunning,
          start: sim.start,
          pause: sim.pause,
          reset: sim.reset,
          progress: sim.progress,
        },
      };
    }
    return {
      position: realPosition,
      direction: realDirection,
      mode,
      setMode,
    };
  }, [
    mode,
    sim.position,
    sim.direction,
    sim.isRunning,
    sim.progress,
    sim.start,
    sim.pause,
    sim.reset,
    realPosition,
    realDirection,
  ]);

  return value;
}
