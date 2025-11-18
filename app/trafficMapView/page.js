"use client";

import { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Spinner, Alert, Badge, Button } from "reactstrap";
import "leaflet/dist/leaflet.css";

// Lazy load leaflet only in browser to avoid SSR issues
let L;
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  L = require("leaflet");
}

export default function TrafficMapView() {
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch events");
      // Normalize events array from various possible shapes
      let raw = json.data;
      let arr = [];
      if (Array.isArray(raw)) arr = raw;
      else if (raw?.events && Array.isArray(raw.events)) arr = raw.events;
      else if (raw?.EventList && Array.isArray(raw.EventList))
        arr = raw.EventList;
      else if (raw?.data && Array.isArray(raw.data)) arr = raw.data;
      else arr = [];
      setEvents(arr);
      setLastUpdated(new Date(json.timestamp));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!L) return;
    if (!mapRef.current) {
      mapRef.current = L.map("trafficMap", {
        center: [43.75, -79.3], // Approx central Ontario corridor
        zoom: 8,
        minZoom: 4,
        maxZoom: 16,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);
    }
    // Clear existing markers layer
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
      markersLayerRef.current.remove();
      markersLayerRef.current = null;
    }
    markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

    const getStatus = (evt) => {
      const full = evt.IsFullClosure || evt.isFullClosure || evt.fullClosure;
      const lanes = (evt.LanesAffected || evt.lanesAffected || "")
        .toString()
        .toUpperCase();
      if (full) return { label: "Full Closure", color: "red" };
      if (lanes.includes("ALL LANES CLOSED"))
        return { label: "Full Closure", color: "red" };
      if (lanes.includes("LANE") && lanes.includes("CLOSED"))
        return { label: "Lane Closed", color: "orange" };
      return { label: "Active", color: "blue" };
    };

    events.forEach((evt) => {
      const lat = evt.Latitude || evt.latitude;
      const lng = evt.Longitude || evt.longitude;
      if (!lat || !lng) return;
      const status = getStatus(evt);
      const roadway =
        evt.RoadwayName || evt.roadwayName || evt.roadway || "Unknown";
      const direction =
        evt.DirectionOfTravel ||
        evt.directionOfTravel ||
        evt.direction ||
        "Unknown";
      const desc =
        evt.Description ||
        evt.description ||
        evt.Comment ||
        evt.comment ||
        "No description";
      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        color: status.color,
        weight: 2,
        fillColor: status.color,
        fillOpacity: 0.7,
      });
      marker.bindPopup(`
        <div style="min-width:200px;font-size:12px;">
          <strong>${roadway}</strong><br />
          <em>${direction}</em><br />
          <span style="color:${status.color}">${status.label}</span><br />
          <div style="margin-top:4px">${desc}</div>
        </div>
      `);
      marker.addTo(markersLayerRef.current);
    });
  }, [events]);

  return (
    <Container fluid className="py-3">
      <Row className="mb-3">
        <Col>
          <h1 className="h3 mb-2">Traffic Map View</h1>
          <p className="text-muted mb-0">Leaflet map of current events</p>
        </Col>
        <Col className="text-end">
          <Button
            color="primary"
            size="sm"
            onClick={fetchEvents}
            disabled={loading}
          >
            Refresh
          </Button>{" "}
          {lastUpdated && (
            <small className="text-muted">
              Updated: {lastUpdated.toLocaleTimeString()}
            </small>
          )}
        </Col>
      </Row>
      {error && (
        <Row className="mb-2">
          <Col>
            <Alert color="danger">{error}</Alert>
          </Col>
        </Row>
      )}
      {loading && (
        <Row className="mb-2">
          <Col>
            <Spinner size="sm" />{" "}
            <span className="ms-2">Loading events...</span>
          </Col>
        </Row>
      )}
      <Row>
        <Col style={{ height: "70vh" }}>
          <div
            id="trafficMap"
            style={{
              height: "100%",
              width: "100%",
              border: "1px solid #333",
              borderRadius: 6,
            }}
          />
        </Col>
        <Col
          md={3}
          className="mt-3 mt-md-0"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          <h6 className="mb-2">Events ({events.length})</h6>
          {events.slice(0, 200).map((evt, i) => {
            const roadway =
              evt.RoadwayName || evt.roadwayName || evt.roadway || "Unknown";
            const direction =
              evt.DirectionOfTravel ||
              evt.directionOfTravel ||
              evt.direction ||
              "Unknown";
            const desc =
              evt.Description ||
              evt.description ||
              evt.Comment ||
              evt.comment ||
              "No description";
            const status =
              evt.IsFullClosure || evt.isFullClosure ? "Full" : "Active";
            return (
              <div
                key={i}
                className="mb-2 p-2 border rounded"
                style={{ fontSize: "12px" }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <strong style={{ fontSize: "12px" }}>{roadway}</strong>
                  <Badge color={status === "Full" ? "danger" : "info"} pill>
                    {status}
                  </Badge>
                </div>
                <div className="text-muted" style={{ fontSize: "11px" }}>
                  {direction}
                </div>
                <div style={{ fontSize: "11px", marginTop: 4 }}>
                  {desc.substring(0, 140)}
                </div>
              </div>
            );
          })}
        </Col>
      </Row>
    </Container>
  );
}
