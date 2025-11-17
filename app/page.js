"use client";

import { useState, useEffect } from "react";
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
} from "reactstrap";

export default function Home() {
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTrafficData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/traffic");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch traffic data");
      }

      setTrafficData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch traffic data on component mount
    fetchTrafficData();
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

      <Row className="mb-4">
        <Col md={{ size: 6, offset: 3 }} className="text-center">
          <Button
            color="primary"
            size="lg"
            onClick={fetchTrafficData}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Refresh Traffic Data"}
          </Button>
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
                  Traffic Data
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
