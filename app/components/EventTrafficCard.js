export default function EventTrafficCard({ event }) {
  // Log the event object to see its structure (for debugging)
  console.log("Event object:", event);

  // Helper function to get nested properties
  const getProperty = (obj, ...keys) => {
    for (let key of keys) {
      if (obj && obj[key]) return obj[key];
    }
    return null;
  };

  // Helper function to format direction with proper capitalization
  const formatDirection = (dir) => {
    if (!dir || dir === "N/A") return "N/A";

    // Convert to lowercase first, then capitalize first letter of each word
    return dir
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Extract direction - try various possible property names
  const rawDirection =
    getProperty(
      event,
      "direction",
      "directionOfTravel",
      "Direction",
      "DirectionOfTravel",
      "travel_direction",
      "roadway"
    ) || "N/A";

  const direction = formatDirection(rawDirection);

  // Extract description - try various possible property names
  const description =
    getProperty(
      event,
      "description",
      "Description",
      "headline",
      "Headline",
      "eventDescription",
      "EventDescription",
      "roadwayName",
      "RoadwayName",
      "event_type",
      "EventType"
    ) || "No description available";

  // Extract lanes affected - try various possible property names
  const lanesAffected =
    getProperty(
      event,
      "lanesAffected",
      "LanesAffected",
      "lanes_affected",
      "lanesBlocked",
      "LanesBlocked",
      "affectedLanes",
      "impactedLanes"
    ) || "Unknown";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1a1a",
        border: "3px solid #FFA500",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.4)",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Direction of Travel - Highway Sign Style */}
      <div
        style={{
          color: "#FFA500",
          fontSize: "1.4rem",
          fontWeight: "700",
          letterSpacing: "0.5px",
          marginBottom: "8px",
        }}
      >
        {direction}
      </div>

      {/* Description - Main Alert Text */}
      <div
        style={{
          color: "#FFCC00",
          fontSize: "0.95rem",
          fontWeight: "600",
          lineHeight: "1.4",
          marginBottom: "6px",
          wordWrap: "break-word",
        }}
      >
        {description}
      </div>

      {/* Lanes Affected - Badge Style */}
      <div
        style={{
          color: "#FFA500",
          fontSize: "0.85rem",
          fontWeight: "600",
          letterSpacing: "0.3px",
        }}
      >
        🚧 {lanesAffected}
      </div>
    </div>
  );
}
