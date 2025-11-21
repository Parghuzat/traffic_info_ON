"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Spinner,
  Alert,
  Badge,
  Button,
  Progress,
} from "reactstrap";
import EventTrafficCard from "../components/EventTrafficCard";
import { dummyRoutes, routeLabels } from "./dummyData";

function NearbyTrafficContent() {
  const searchParams = useSearchParams();
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle, requesting, tracking, ready, error
  const [gpsQuality, setGpsQuality] = useState("none"); // none, high, low, lastKnown
  const [userLocation, setUserLocation] = useState(null);
  const [userDirection, setUserDirection] = useState(null); // bearing in degrees
  const [nearestRoad, setNearestRoad] = useState(null);
  const [usingDummy, setUsingDummy] = useState(false);
  const [selectedDummyRouteKey, setSelectedDummyRouteKey] = useState(null);
  const [travelDirection, setTravelDirection] = useState(null); // N, S, E, W

  // API rate limiting
  const [apiCalls, setApiCalls] = useState([]);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const MAX_CALLS = 10;
  const TIME_WINDOW = 60000;
  const COOLDOWN_AFTER_LIMIT = 30000;

  const locationIntervalRef = useRef(null);
  const dataFetchIntervalRef = useRef(null);
  const lastPositionRef = useRef(null);
  const dummyIndexRef = useRef(0);
  const useHighAccuracyRef = useRef(true);
  const retryDelayRef = useRef(5000);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (locationIntervalRef.current)
        clearInterval(locationIntervalRef.current);
      if (dataFetchIntervalRef.current)
        clearInterval(dataFetchIntervalRef.current);
    };
  }, []);

  // Check if we can make API call
  const canMakeApiCall = () => {
    const now = Date.now();
    const recentCallCount = apiCalls.filter(
      (timestamp) => now - timestamp < TIME_WINDOW
    ).length;
    return recentCallCount < MAX_CALLS && cooldownSeconds === 0;
  };

  const getRecentCallCount = () => {
    const now = Date.now();
    return apiCalls.filter((timestamp) => now - timestamp < TIME_WINDOW).length;
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Calculate bearing between two coordinates
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
  };

  // Convert bearing to cardinal direction
  const bearingToDirection = (bearing) => {
    if (bearing >= 315 || bearing < 45) return "NORTH";
    if (bearing >= 45 && bearing < 135) return "EAST";
    if (bearing >= 135 && bearing < 225) return "SOUTH";
    if (bearing >= 225 && bearing < 315) return "WEST";
    return "NORTH";
  };

  // Activate a dummy route: simulate two points to derive direction
  const activateDummyRoute = (routeKey) => {
    const route = dummyRoutes[routeKey];
    if (!route || route.length < 2) return;
    setUsingDummy(true);
    setSelectedDummyRouteKey(routeKey);
    setLocationStatus("tracking");
    firstPosition.current = {
      lat: route[0].lat,
      lon: route[0].lon,
      timestamp: Date.now(),
    };
    const last = route[route.length - 1];
    secondPosition.current = {
      lat: last.lat,
      lon: last.lon,
      timestamp: Date.now() + 4000,
    };
    const bearing = calculateBearing(
      firstPosition.current.lat,
      firstPosition.current.lon,
      secondPosition.current.lat,
      secondPosition.current.lon
    );
    const distance = calculateDistance(
      firstPosition.current.lat,
      firstPosition.current.lon,
      secondPosition.current.lat,
      secondPosition.current.lon
    );
    if (distance > 0.01) {
      setUserDirection(bearing);
      setTravelDirection(bearingToDirection(bearing));
    }
    setUserLocation(secondPosition.current);
    setLocationStatus("ready");
    fetchTrafficData();
  };

  // Find nearest road from events data
  const findNearestRoad = (lat, lon, eventsData) => {
    if (!eventsData || !Array.isArray(eventsData) || eventsData.length === 0) {
      return null;
    }

    let nearest = null;
    let minDistance = Infinity;

    eventsData.forEach((event) => {
      const eventLat = event.Latitude || event.latitude;
      const eventLon = event.Longitude || event.longitude;

      if (eventLat && eventLon) {
        const distance = calculateDistance(lat, lon, eventLat, eventLon);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            road:
              event.RoadwayName ||
              event.roadwayName ||
              event.roadway ||
              "Unknown",
            distance: distance,
          };
        }
      }
    });

    return nearest;
  };

  // Request location permission and start tracking
  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLocationStatus("error");
      return;
    }

    setLocationStatus("requesting");
    setError(null);

    const handlePosition = (position) => {
      const newPos = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        timestamp: position.timestamp,
      };

      // Reset retry delay on success
      retryDelayRef.current = 5000;

      // Update GPS quality status
      setGpsQuality(useHighAccuracyRef.current ? "high" : "low");

      if (lastPositionRef.current) {
        const distance = calculateDistance(
          lastPositionRef.current.lat,
          lastPositionRef.current.lon,
          newPos.lat,
          newPos.lon
        );
        // Threshold 10 meters (0.01 km)
        if (distance > 0.01) {
          const bearing = calculateBearing(
            lastPositionRef.current.lat,
            lastPositionRef.current.lon,
            newPos.lat,
            newPos.lon
          );
          setUserDirection(bearing);
          setTravelDirection(bearingToDirection(bearing));
        }
      }

      lastPositionRef.current = newPos;
      setUserLocation(newPos);
      if (locationStatus !== "ready") setLocationStatus("ready");

      // Schedule next update
      if (locationIntervalRef.current)
        clearTimeout(locationIntervalRef.current);
      locationIntervalRef.current = setTimeout(getPosition, 5000);
    };

    const handleError = (err) => {
      console.error("Location error:", err);
      let msg = err.message;
      let shouldRetry = true;
      let isFatal = false;

      // Map error codes to user-friendly messages
      if (!msg) {
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            msg =
              "Location permission denied. Please enable location services.";
            shouldRetry = false;
            isFatal = true;
            break;
          case 2: // POSITION_UNAVAILABLE
            msg =
              "GPS signal lost or unavailable. Please check your device settings.";
            break;
          case 3: // TIMEOUT
            msg = "Location request timed out.";
            break;
          default:
            msg = "Unknown location error.";
        }
      }

      // Handle fallback logic for timeout/unavailable
      if (shouldRetry && (err.code === 2 || err.code === 3)) {
        if (useHighAccuracyRef.current) {
          // If high accuracy failed, switch to low accuracy immediately
          console.warn("High accuracy GPS failed, switching to fallback mode.");
          useHighAccuracyRef.current = false;
          // Retry immediately with new settings
          getPosition();
          return;
        } else {
          // If already in fallback mode and failing, back off
          retryDelayRef.current = Math.min(retryDelayRef.current * 1.5, 30000); // Cap at 30s
        }
      }

      // If we have a last known position, don't show error, just warn
      if (lastPositionRef.current && !isFatal) {
        console.warn(
          "Transient location error, using last known position:",
          msg
        );
        setGpsQuality("lastKnown");
        // Keep status as ready so UI doesn't break
        setLocationStatus("ready");
      } else {
        // No previous position or fatal error
        setError(msg);
        setLocationStatus("error");
        setGpsQuality("none");
      }

      // Schedule retry if applicable
      if (shouldRetry) {
        if (locationIntervalRef.current)
          clearTimeout(locationIntervalRef.current);
        locationIntervalRef.current = setTimeout(
          getPosition,
          retryDelayRef.current
        );
      }
    };

    const getPosition = () => {
      const options = useHighAccuracyRef.current
        ? { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        : { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 };

      navigator.geolocation.getCurrentPosition(
        handlePosition,
        handleError,
        options
      );
    };

    // Start the loop
    getPosition();
  };

  // Auto-start tracking if requested via query param
  useEffect(() => {
    const autoStart = searchParams.get("autoStart");
    if (autoStart === "true" && locationStatus === "idle") {
      startLocationTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch traffic data
  const fetchTrafficData = async () => {
    if (!canMakeApiCall()) {
      setError(
        `Rate limit: Maximum ${MAX_CALLS} calls per 60 seconds. Please wait.`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/events");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch traffic data");
      }

      setTrafficData(result);

      // Find nearest road
      if (userLocation && result.data) {
        const nearest = findNearestRoad(
          userLocation.lat,
          userLocation.lon,
          result.data
        );
        setNearestRoad(nearest);
      }

      // Track API call
      const now = Date.now();
      const newApiCalls = [...apiCalls, now];
      setApiCalls(newApiCalls);

      if (
        newApiCalls.filter((timestamp) => now - timestamp < TIME_WINDOW)
          .length >= MAX_CALLS
      ) {
        setCooldownSeconds(30);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ref for fetchTrafficData to use in interval
  const fetchTrafficDataRef = useRef(fetchTrafficData);
  useEffect(() => {
    fetchTrafficDataRef.current = fetchTrafficData;
  }, [fetchTrafficData]);

  // Auto-fetch traffic data when location is ready and every 15s
  useEffect(() => {
    if (locationStatus === "ready" && !usingDummy) {
      // Initial fetch
      fetchTrafficDataRef.current();

      // Start interval
      if (dataFetchIntervalRef.current)
        clearInterval(dataFetchIntervalRef.current);
      dataFetchIntervalRef.current = setInterval(() => {
        fetchTrafficDataRef.current();
      }, 15000);
    }
    return () => {
      if (dataFetchIntervalRef.current)
        clearInterval(dataFetchIntervalRef.current);
    };
  }, [locationStatus, usingDummy]);

  // Filter and sort events by proximity and direction
  const getFilteredEvents = () => {
    if (!trafficData?.data || !Array.isArray(trafficData.data)) {
      return [];
    }

    let filtered = trafficData.data;

    // Filter by nearest road if available
    if (nearestRoad && nearestRoad.road !== "Unknown") {
      filtered = filtered.filter((event) => {
        const roadway = (
          event.RoadwayName ||
          event.roadwayName ||
          event.roadway ||
          ""
        ).toUpperCase();
        return roadway.includes(nearestRoad.road.toUpperCase());
      });
    }

    // Filter by travel direction if available
    if (travelDirection) {
      filtered = filtered.filter((event) => {
        const direction = (
          event.DirectionOfTravel ||
          event.directionOfTravel ||
          event.direction ||
          ""
        ).toUpperCase();
        return direction.includes(travelDirection);
      });
    }

    // Sort by distance from user location
    if (userLocation) {
      filtered = filtered
        .map((event) => {
          const eventLat = event.Latitude || event.latitude;
          const eventLon = event.Longitude || event.longitude;
          const distance =
            eventLat && eventLon
              ? calculateDistance(
                  userLocation.lat,
                  userLocation.lon,
                  eventLat,
                  eventLon
                )
              : Infinity;
          return { ...event, distance };
        })
        .sort((a, b) => a.distance - b.distance);
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <Button color="secondary" outline size="sm" href="/" tag="a">
              ← Back to Main Menu
            </Button>
          </div>
        </Col>
      </Row>

      {/* API Rate Limiting Info */}
      <Row className="mb-3">
        <Col>
          <Card>
            <CardBody className="py-2">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <small className="text-muted">
                    API Calls: {getRecentCallCount()}/{MAX_CALLS}
                  </small>
                  {cooldownSeconds > 0 && (
                    <Badge color="warning">Cooldown: {cooldownSeconds}s</Badge>
                  )}
                </div>
                <div className="d-flex align-items-center gap-2">
                  {locationStatus !== "idle" && (
                    <Badge
                      color={
                        locationStatus === "ready"
                          ? gpsQuality === "lastKnown"
                            ? "warning"
                            : "success"
                          : locationStatus === "error"
                          ? "danger"
                          : "info"
                      }
                    >
                      {locationStatus === "requesting" &&
                        "Requesting location..."}
                      {locationStatus === "tracking" && "Tracking movement..."}
                      {locationStatus === "ready" &&
                        (gpsQuality === "lastKnown"
                          ? "Using last known location"
                          : "Location ready")}
                      {locationStatus === "error" && "Location error"}
                    </Badge>
                  )}
                  {trafficData && (
                    <small className="text-muted">
                      Last updated:{" "}
                      {new Date(trafficData.timestamp).toLocaleTimeString()}
                    </small>
                  )}
                </div>
              </div>
              {getRecentCallCount() > 0 && (
                <Progress
                  value={(getRecentCallCount() / MAX_CALLS) * 100}
                  color={
                    getRecentCallCount() >= MAX_CALLS
                      ? "danger"
                      : getRecentCallCount() >= MAX_CALLS * 0.7
                      ? "warning"
                      : "success"
                  }
                  className="mt-2"
                  style={{ height: "4px" }}
                />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Location Control */}
      {locationStatus === "idle" && !usingDummy && (
        <Row className="mb-4">
          <Col md={{ size: 6, offset: 3 }}>
            <Card>
              <CardBody className="text-center">
                <h5>Enable Location Services</h5>
                <p className="text-muted mb-3">
                  Allow access to your location to automatically show traffic
                  events ahead on your route
                </p>
                <Button
                  color="primary"
                  size="lg"
                  onClick={startLocationTracking}
                  disabled={loading}
                >
                  📍 Use My Location
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {/* Location Info Display */}
      {userLocation && locationStatus !== "idle" && (
        <Row className="mb-4">
          <Col>
            <Card>
              <CardBody>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <strong>GPS:</strong>{" "}
                    <small className="text-muted">
                      {userLocation.lat.toFixed(4)},{" "}
                      {userLocation.lon.toFixed(4)}
                    </small>
                  </div>
                  {travelDirection && (
                    <div>
                      <strong>Direction:</strong>{" "}
                      <Badge color="success" style={{ fontSize: "1.2em" }}>
                        {travelDirection}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <Button
                      color="secondary"
                      size="sm"
                      onClick={fetchTrafficData}
                      disabled={loading || !canMakeApiCall()}
                    >
                      {loading ? <Spinner size="sm" /> : "🔄 Refresh"}
                    </Button>
                    {usingDummy && (
                      <Button
                        color="danger"
                        outline
                        size="sm"
                        className="ms-2"
                        onClick={() => {
                          setUsingDummy(false);
                          setSelectedDummyRouteKey(null);
                          setUserLocation(null);
                          setTravelDirection(null);
                          setUserDirection(null);
                          setNearestRoad(null);
                          setLocationStatus("idle");
                        }}
                      >
                        ✖ Clear Dummy
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {/* Error Display */}
      {error && (
        <Row className="mb-4">
          <Col md={{ size: 8, offset: 2 }}>
            <Alert color="danger">
              <strong>Error:</strong> {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Loading Spinner */}
      {loading && (
        <Row>
          <Col className="text-center">
            <Spinner
              color="primary"
              style={{ width: "3rem", height: "3rem" }}
            />
            <p className="mt-3">Loading traffic data...</p>
          </Col>
        </Row>
      )}

      {/* Traffic Events Display */}
      {trafficData && trafficData.success && filteredEvents.length > 0 && (
        <Row>
          <Col>
            <div className="mb-3">
              <p className="text-muted">
                Showing{" "}
                {travelDirection ? 1 : filteredEvents.slice(0, 50).length} event
                {!travelDirection && filteredEvents.length > 1 ? "s" : ""}
                {nearestRoad && ` on ${nearestRoad.road}`}
                {travelDirection && ` (${travelDirection}BOUND)`}
                {travelDirection && " - Closest Event"}
              </p>
            </div>
            <Row>
              {(travelDirection
                ? filteredEvents.slice(0, 1)
                : filteredEvents.slice(0, 50)
              ).map((item, index) => (
                <Col
                  key={index}
                  xs={12}
                  sm={travelDirection ? 12 : 6}
                  md={travelDirection ? 12 : 6}
                  lg={travelDirection ? 12 : 4}
                  xl={travelDirection ? 12 : 3}
                  className="mb-3"
                >
                  <div className="position-relative">
                    <EventTrafficCard event={item} />
                    {item.distance !== undefined &&
                      item.distance !== Infinity && (
                        <Badge
                          color="dark"
                          className="position-absolute"
                          style={{
                            top: "10px",
                            left: "10px",
                            fontSize: "0.7rem",
                          }}
                        >
                          {item.distance.toFixed(1)} km
                        </Badge>
                      )}
                  </div>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      )}

      {/* No Results */}
      {trafficData && trafficData.success && filteredEvents.length === 0 && (
        <Row>
          <Col md={{ size: 6, offset: 3 }}>
            <Alert color="success">
              <h5>🎉 All Clear!</h5>
              <p className="mb-0">
                No traffic events found
                {nearestRoad && ` on ${nearestRoad.road}`}
                {travelDirection && ` in ${travelDirection}BOUND direction`}.
              </p>
            </Alert>
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default function NearbyTraffic() {
  return (
    <Suspense
      fallback={
        <Container className="py-4 text-center">
          <Spinner color="primary" />
          <p className="mt-3">Loading...</p>
        </Container>
      }
    >
      <NearbyTrafficContent />
    </Suspense>
  );
}
