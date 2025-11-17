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
  Input,
  FormGroup,
  Label,
  Progress,
} from "reactstrap";

export default function Home() {
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataType, setDataType] = useState(null);
  const [apiCalls, setApiCalls] = useState([]);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

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
  const fetchAlerts = () => fetchData("alerts", "Alerts");
  const fetchConstruction = () => fetchData("construction", "Construction");

  useEffect(() => {
    // Fetch events data on component mount - only run once
    fetchData("events", "Events");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center mb-3">511 Ontario Traffic Information</h1>
          <p className="text-center text-muted">
            Real-time traffic data from 511 Ontario API
          </p>
        </Col>
      </Row>

      {/* Rate Limit Indicator */}
      <Row className="mb-3">
        <Col md={{ size: 8, offset: 2 }}>
          <Card
            className={getRecentCallCount() >= MAX_CALLS ? "border-danger" : ""}
          >
            <CardBody className="py-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="text-muted">
                  API Calls: {getRecentCallCount()}/{MAX_CALLS} in last 60s
                </small>
                {cooldownSeconds > 0 && (
                  <Badge color="warning">Cooldown: {cooldownSeconds}s</Badge>
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
            <Button
              color="warning"
              size="lg"
              onClick={fetchAlerts}
              disabled={loading || !canMakeApiCall()}
              active={dataType === "Alerts"}
            >
              {loading && dataType === "Alerts" ? (
                <Spinner size="sm" className="me-2" />
              ) : null}
              Traffic Alerts
            </Button>
            <Button
              color="info"
              size="lg"
              onClick={fetchConstruction}
              disabled={loading || !canMakeApiCall()}
              active={dataType === "Construction"}
            >
              {loading && dataType === "Construction" ? (
                <Spinner size="sm" className="me-2" />
              ) : null}
              Construction
            </Button>
          </div>
        </Col>
      </Row>

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
            <Card className="mb-3">
              <CardBody>
                <CardTitle tag="h5">
                  {dataType} Data
                  <Badge color="success" className="ms-2">
                    Live
                  </Badge>
                </CardTitle>
                <CardText>
                  <small className="text-muted">
                    Last updated:{" "}
                    {new Date(trafficData.timestamp).toLocaleString()}
                  </small>
                </CardText>
              </CardBody>
            </Card>

            {trafficData.data &&
            Array.isArray(trafficData.data) &&
            trafficData.data.length > 0 ? (
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
