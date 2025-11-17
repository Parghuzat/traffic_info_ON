import { NextResponse } from "next/server";

/**
 * API route to fetch traffic events from 511 Ontario API
 */

export async function GET(request) {
  try {
    const apiUrl = `https://511on.ca/api/v2/get/event`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(
        `511 Ontario API error: ${response.status} ${response.statusText}`
      );
    }

    const raw = await response.json();

    // Derive an events array from possible shapes
    const events = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.events)
      ? raw.events
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.EventList)
      ? raw.EventList
      : []; // fallback empty

    // Helper to get a roadway name from an event object
    const extractRoadName = (ev) => {
      const candidates = [
        ev.roadway,
        ev.roadwayName,
        ev.RoadwayName,
        ev.roadName,
        ev.route,
        ev.highway,
        ev.corridor,
        ev.Road,
      ].filter(Boolean);
      if (!candidates.length) return null;
      let name = String(candidates[0]).trim();
      // Normalize common patterns
      name = name.replace(/\s+/g, " ");
      // Collapse variations like "Hwy 401 EB Express" -> keep first two tokens if very long
      const parts = name.split(" ");
      if (parts.length > 5) {
        name = parts.slice(0, 5).join(" ");
      }
      return name;
    };

    const roadCounts = new Map();
    for (const ev of events) {
      const road = extractRoadName(ev);
      if (!road) continue;
      roadCounts.set(road, (roadCounts.get(road) || 0) + 1);
    }

    const uniqueRoads = Array.from(roadCounts.keys()).sort();
    const countsObject = Object.fromEntries(
      Array.from(roadCounts.entries()).sort((a, b) => b[1] - a[1])
    );
    const topRoads = Object.entries(countsObject)
      .slice(0, 10)
      .map(([road, count]) => ({ road, count }));

    console.log(
      `Events fetched: ${events.length}. Unique roads: ${uniqueRoads.length}. Top roads:`,
      topRoads
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      roads: {
        list: uniqueRoads,
        counts: countsObject,
        totalUnique: uniqueRoads.length,
        top: topRoads,
      },
      data: raw,
    });
  } catch (error) {
    console.error("Error fetching events data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch events data",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
