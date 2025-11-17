import { NextResponse } from "next/server";

/**
 * API route to fetch construction data from 511 Ontario API
 */

export async function GET(request) {
  try {
    const apiUrl = `https://511on.ca/api/v2/get/construction`;

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

    const data = await response.json();

    console.log(
      "511 Ontario Construction Response:",
      JSON.stringify(data, null, 2)
    );

    return NextResponse.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching construction data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch construction data",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
