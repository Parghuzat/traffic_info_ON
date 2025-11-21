"use client";

import { Container, Row, Col, Button } from "reactstrap";
import Link from "next/link";

export default function Home() {
  const buttonStyle = {
    backgroundColor: "#000",
    color: "#fff",
    border: "4px solid #FFA500", // Orange border
    borderRadius: "12px",
    padding: "40px 20px",
    fontSize: "2rem",
    fontWeight: "bold",
    width: "100%",
    marginBottom: "20px",
    textTransform: "uppercase",
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "200px", // Make them really big
  };

  return (
    <Container className="vh-100 d-flex flex-column justify-content-center align-items-center">
      <Row className="w-100">
        <Col md={{ size: 8, offset: 2 }} lg={{ size: 6, offset: 3 }}>
          <Link href="/nearby" passHref legacyBehavior>
            <Button style={buttonStyle} className="mb-4">
              Start Driving
            </Button>
          </Link>

          <Link href="/trafficMapView" passHref legacyBehavior>
            <Button style={buttonStyle}>Map Overview</Button>
          </Link>
        </Col>
      </Row>
    </Container>
  );
}
