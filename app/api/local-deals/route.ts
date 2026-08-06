import { NextResponse } from "next/server";

const CATEGORY_TYPES: Record<string, string[]> = {
  groceries: ["supermarket"],
  gas: ["gas_station"],
  eating_out: ["cafe", "restaurant"],
  kids: ["supermarket"],
  self_care: ["pharmacy"],
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  priceLevel?: string;
};

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ alternatives: [], message: "Deals unavailable" });
  }

  let body: { lat?: number; lng?: number; category?: string; merchant?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ alternatives: [], message: "Location is required" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ alternatives: [], message: "Location is required" }, { status: 400 });
  }

  const includedTypes = CATEGORY_TYPES[body.category || ""] || ["store"];

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.googleMapsUri,places.priceLevel",
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 8,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: 3000 },
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Google Places nearby search failed", response.status);
      return NextResponse.json({ alternatives: [], message: "Nearby options are temporarily unavailable" });
    }

    const data = await response.json() as { places?: GooglePlace[] };
    const currentMerchant = body.merchant?.trim().toLowerCase();
    const alternatives = (data.places || [])
      .map((place) => {
        const name = place.displayName?.text?.trim();
        const placeLat = place.location?.latitude;
        const placeLng = place.location?.longitude;
        if (!name || !Number.isFinite(placeLat) || !Number.isFinite(placeLng)) return null;
        return {
          name,
          distanceMi: Number(distanceMiles(lat, lng, placeLat!, placeLng!).toFixed(1)),
          mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${placeLat},${placeLng}`)}`,
          ...(place.priceLevel ? { priceLevel: place.priceLevel } : {}),
        };
      })
      .filter((place): place is NonNullable<typeof place> => !!place)
      .filter((place) => !currentMerchant || place.name.toLowerCase() !== currentMerchant)
      .slice(0, 5);

    return NextResponse.json({
      alternatives,
      message: alternatives.length ? "Nearby places that may be worth comparing" : "No nearby alternatives found",
    });
  } catch (error) {
    console.error("Local deals request failed", error);
    return NextResponse.json({ alternatives: [], message: "Nearby options are temporarily unavailable" });
  }
}
