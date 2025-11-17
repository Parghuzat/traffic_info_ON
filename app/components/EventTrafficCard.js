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

  // Determine status category & colors
  const isFullClosure = !!(event.IsFullClosure || event.isFullClosure);
  const lanesText = (lanesAffected || "").toString().toLowerCase();
  const descLower = (description || "").toString().toLowerCase();

  let statusCategory = "ACTIVE";
  let statusColor = "#ff8c00"; // default active orange

  if (isFullClosure) {
    statusCategory = "FULL CLOSURE";
    statusColor = "#dc3545"; // red
  } else if (/lane/.test(lanesText) && /(closed|block)/.test(lanesText)) {
    statusCategory = "LANE BLOCKED";
    statusColor = "#ff8c00"; // orange
  } else if (
    /minor/.test(descLower) ||
    /delay/.test(descLower) ||
    /slow/.test(descLower)
  ) {
    statusCategory = "MINOR DELAY";
    statusColor = "#ffd34d"; // yellow
  } else if (
    /planned/.test(descLower) ||
    /schedule/.test(descLower) ||
    /mainten/.test(descLower)
  ) {
    statusCategory = "LOW IMPACT";
    statusColor = "#6c757d"; // gray
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1a1a",
        border: `3px solid ${statusColor}`,
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.4)",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Status Badge */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          right: "12px",
          backgroundColor: statusColor,
          color:
            statusCategory === "LANE BLOCKED" || statusCategory === "ACTIVE"
              ? "#fff"
              : "#fff",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.5px",
        }}
      >
        {statusCategory}
      </div>
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
