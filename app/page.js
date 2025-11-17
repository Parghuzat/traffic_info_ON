"use client";

import { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  CardText,
  Spinner,
  Alert,
  Badge,
  Button,
  Label,
  Progress,
} from "reactstrap";
import EventTrafficCard from "./components/EventTrafficCard";

export default function Home() {
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataType, setDataType] = useState(null);
  const [apiCalls, setApiCalls] = useState([]);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [directionFilter, setDirectionFilter] = useState("ALL");
  // Roadway filter: focus on Highway 401 frequent usage
  const [roadwayFilter, setRoadwayFilter] = useState("ALL");
  // Dynamic road picked from backend list (overrides preset roadwayFilter when set)
  const [selectedRoad, setSelectedRoad] = useState("ALL");

  const MAX_CALLS = 10;
  const TIME_WINDOW = 60000; // 60 seconds in milliseconds
  const COOLDOWN_AFTER_LIMIT = 30000; // 30 second cooldown after hitting limit

  // Check if we can make a call (read-only, doesn't update state)
  const canMakeApiCall = () => {
    const now = Date.now();
    const recentCallCount = apiCalls.filter(
      (timestamp) => now - timestamp < TIME_WINDOW
    ).length;
    return recentCallCount < MAX_CALLS && cooldownSeconds === 0;
  };

  // Get recent call count for display (read-only)
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

  const fetchData = async (endpoint, type) => {
    if (!canMakeApiCall()) {
      setError(
        `Rate limit: Maximum ${MAX_CALLS} calls per 60 seconds. Please wait.`
      );
      return;
    }

    setLoading(true);
    setError(null);
    setDataType(type);

    try {
      const response = await fetch(`/api/${endpoint}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch ${type} data`);
      }

      setTrafficData(result);

      // Track this API call
      const now = Date.now();
      const newApiCalls = [...apiCalls, now];
      setApiCalls(newApiCalls);

      // If we've hit the limit, start cooldown
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

  const fetchEvents = () => fetchData("events", "Events");
  // Temporarily disabled other data types
  // const fetchAlerts = () => fetchData("alerts", "Alerts");
  // const fetchConstruction = () => fetchData("construction", "Construction");

  // Filter events by roadway (prior to direction filtering)
  const filterByRoadway = (data) => {
    if (!data || !Array.isArray(data)) return data;
    // If a specific road is selected from backend list, use it first
    if (selectedRoad && selectedRoad !== "ALL") {
      return data.filter((item) => {
        const roadway = (
          item.roadway ||
          item.roadwayName ||
          item.RoadwayName ||
          item.roadName ||
          ""
        )
          .toString()
          .toUpperCase();
        return roadway.includes(selectedRoad.toString().toUpperCase());
      });
    }

    if (roadwayFilter === "ALL") return data;

    const matches401 = (item) => {
      const roadway = (
        item.roadway ||
        item.roadwayName ||
        item.RoadwayName ||
        item.roadName ||
        ""
      )
        .toString()
        .toUpperCase();
      return roadway.includes("401");
    };

    const directionText = (
      item.direction ||
      item.directionOfTravel ||
      item.Direction ||
      item.DirectionOfTravel ||
      item.travel_direction ||
      ""
    )
      .toString()
      .toUpperCase();

    switch (roadwayFilter) {
      case "401":
        return data.filter((item) => matches401(item));
      case "401_E":
        return data.filter(
          (item) => matches401(item) && directionText.includes("EAST")
        );
      case "401_W":
        return data.filter(
          (item) => matches401(item) && directionText.includes("WEST")
        );
      case "OTHER":
        return data.filter((item) => !matches401(item));
      default:
        return data;
    }
  };

  // Filter events by direction
  const filterByDirection = (data) => {
    if (!data || !Array.isArray(data)) return data;
    if (directionFilter === "ALL") return data;

    return data.filter((item) => {
      const direction = (
        item.direction ||
        item.directionOfTravel ||
        item.Direction ||
        item.DirectionOfTravel ||
        item.travel_direction ||
        ""
      ).toUpperCase();

      // Match direction keywords
      if (directionFilter === "NORTH" && direction.includes("NORTH"))
        return true;
      if (directionFilter === "SOUTH" && direction.includes("SOUTH"))
        return true;
      if (directionFilter === "EAST" && direction.includes("EAST")) return true;
      if (directionFilter === "WEST" && direction.includes("WEST")) return true;

      return false;
    });
  };

  useEffect(() => {
    // Fetch events data on component mount - only run once
    fetchData("events", "Events");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center mb-3">Ontario Traffic Information</h1>
          <p className="text-center text-muted">
            Real-time traffic data from 511 Ontario API
          </p>
        </Col>
      </Row>

      {/* Combined Info Bar - Rate Limit and Data Info */}
      <Row className="mb-3">
        <Col md={{ size: 10, offset: 1 }}>
          <Card
            className={getRecentCallCount() >= MAX_CALLS ? "border-danger" : ""}
          >
            <CardBody className="py-2">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                {/* Left side: API Calls Counter */}
                <div style={{ minWidth: "200px" }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">
                      API Calls: {getRecentCallCount()}/{MAX_CALLS} in last 60s
                    </small>
                    {cooldownSeconds > 0 && (
                      <Badge color="warning" className="ms-2">
                        Cooldown: {cooldownSeconds}s
                      </Badge>
                    )}
                  </div>
                  <Progress
                    value={(getRecentCallCount() / MAX_CALLS) * 100}
                    color={
                      getRecentCallCount() >= MAX_CALLS
                        ? "danger"
                        : getRecentCallCount() >= 7
                        ? "warning"
                        : "success"
                    }
                    className="mb-0"
                    style={{ height: "8px" }}
                  />
                </div>

                {/* Right side: Data Type and Last Updated */}
                {trafficData && trafficData.success && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold">{dataType} Data</span>
                    <Badge color="success">Live</Badge>
                    <small className="text-muted">
                      Updated:{" "}
                      {new Date(trafficData.timestamp).toLocaleTimeString()}
                    </small>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={{ size: 10, offset: 1 }}>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Button
              color="primary"
              size="lg"
              onClick={fetchEvents}
              disabled={loading || !canMakeApiCall()}
              active={dataType === "Events"}
            >
              {loading && dataType === "Events" ? (
                <Spinner size="sm" className="me-2" />
              ) : null}
              Traffic Events
            </Button>
            {/* Alerts & Construction temporarily hidden */}
            {false && (
              <>
                <Button
                  color="warning"
                  size="lg"
                  // onClick={fetchAlerts}
                  disabled
                  active={dataType === "Alerts"}
                >
                  Traffic Alerts
                </Button>
                <Button
                  color="info"
                  size="lg"
                  // onClick={fetchConstruction}
                  disabled
                  active={dataType === "Construction"}
                >
                  Construction
                </Button>
              </>
            )}
          </div>
        </Col>
      </Row>

      {/* Direction Filter Buttons - Only show for Events */}
      {dataType === "Events" && trafficData && trafficData.success && (
        <Row className="mb-4">
          <Col>
            {/* Direction Filters */}
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <Button
                color={directionFilter === "ALL" ? "dark" : "outline-dark"}
                size="sm"
                onClick={() => setDirectionFilter("ALL")}
              >
                All Directions
              </Button>
              <Button
                color={
                  directionFilter === "NORTH" ? "primary" : "outline-primary"
                }
                size="sm"
                onClick={() => setDirectionFilter("NORTH")}
              >
                ⬆️ N
              </Button>
              <Button
                color={
                  directionFilter === "SOUTH" ? "primary" : "outline-primary"
                }
                size="sm"
                onClick={() => setDirectionFilter("SOUTH")}
              >
                ⬇️ S
              </Button>
              <Button
                color={
                  directionFilter === "EAST" ? "success" : "outline-success"
                }
                size="sm"
                onClick={() => setDirectionFilter("EAST")}
              >
                ➡️ E
              </Button>
              <Button
                color={
                  directionFilter === "WEST" ? "success" : "outline-success"
                }
                size="sm"
                onClick={() => setDirectionFilter("WEST")}
              >
                ⬅️ W
              </Button>
            </div>
            {/* Backend Roads List Selector */}
            {trafficData?.roads?.list &&
              Array.isArray(trafficData.roads.list) && (
                <div className="d-flex justify-content-center align-items-center gap-2 mt-3 flex-wrap">
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      outline
                      color="secondary"
                      size="sm"
                      active={selectedRoad === "ALL"}
                      onClick={() => setSelectedRoad("ALL")}
                    >
                      All Roads
                    </Button>
                    {(() => {
                      const top = Array.isArray(trafficData?.roads?.top)
                        ? trafficData.roads.top.map((t) => t.road)
                        : [];
                      const list = Array.isArray(trafficData?.roads?.list)
                        ? trafficData.roads.list
                        : [];
                      const roads = top.length > 0 ? top : list;
                      return roads.slice(0, 12).map((road, idx) => (
                        <Button
                          key={`${road}-${idx}`}
                          outline
                          color="primary"
                          size="sm"
                          active={selectedRoad === road}
                          onClick={() => {
                            setSelectedRoad(road);
                            if (road !== "ALL") setRoadwayFilter("ALL");
                          }}
                        >
                          {road}
                        </Button>
                      ));
                    })()}
                  </div>
                </div>
              )}
          </Col>
        </Row>
      )}

      {error && (
        <Row className="mb-4">
          <Col md={{ size: 8, offset: 2 }}>
            <Alert color="danger">
              <strong>Error:</strong> {error}
            </Alert>
          </Col>
        </Row>
      )}

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

      {trafficData && trafficData.success && (
        <Row>
          <Col>
            {trafficData.data &&
            Array.isArray(trafficData.data) &&
            trafficData.data.length > 0 ? (
              dataType === "Events" ? (
                // Use EventTrafficCard for Events data with direction filter
                (() => {
                  // Apply roadway then direction filters
                  let filteredData = filterByRoadway(trafficData.data);
                  filteredData = filterByDirection(filteredData);
                  return filteredData.length > 0 ? (
                    <div>
                      <p className="text-muted mb-3">
                        Showing {filteredData.length} of{" "}
                        {trafficData.data.length} events
                        {selectedRoad !== "ALL" && ` | Road: ${selectedRoad}`}
                        {roadwayFilter !== "ALL" &&
                          ` | Road: ${roadwayFilter.replace("_", " ")}`}
                        {directionFilter !== "ALL" &&
                          ` | Dir: ${directionFilter}`}
                      </p>
                      <Row>
                        {filteredData.slice(0, 50).map((item, index) => (
                          <Col
                            key={index}
                            xs={12}
                            sm={6}
                            md={6}
                            lg={4}
                            xl={3}
                            className="mb-3"
                          >
                            <EventTrafficCard event={item} />
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ) : (
                    <Alert color="warning">
                      No events found for {directionFilter}BOUND direction. Try
                      a different filter.
                    </Alert>
                  );
                })()
              ) : (
                // Default card layout for Alerts and Construction
                <Row>
                  {trafficData.data.slice(0, 20).map((item, index) => (
                    <Col md={6} lg={4} key={index} className="mb-3">
                      <Card>
                        <CardBody>
                          <CardTitle tag="h6">
                            {item.event_type || item.type || "Traffic Event"}
                          </CardTitle>
                          <CardText>
                            {item.description ||
                              item.headline ||
                              JSON.stringify(item).substring(0, 100)}
                          </CardText>
                          {item.severity && (
                            <Badge
                              color={
                                item.severity.toLowerCase() === "high"
                                  ? "danger"
                                  : item.severity.toLowerCase() === "medium"
                                  ? "warning"
                                  : "info"
                              }
                            >
                              {item.severity}
                            </Badge>
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )
            ) : (
              <Alert color="info">
                <h5>Raw API Response</h5>
                <pre
                  style={{
                    maxHeight: "400px",
                    overflow: "auto",
                    fontSize: "0.85rem",
                  }}
                >
                  {JSON.stringify(trafficData.data, null, 2)}
                </pre>
              </Alert>
            )}
          </Col>
        </Row>
      )}
    </Container>
  );
}
