export function FIRST_PROMPT(destination: string, count: number = 12): string {
  return `You are a travel researcher. Return ONLY a JSON object for ${destination}. No markdown, no commentary.

Required: every entry in 'attractions' must be a REAL, NAMED, PHYSICAL tourist attraction, restaurant, or cafe that actually exists IN ${destination}.
Do NOT invent generic attractions or restaurants.

Identify famous landmarks and include 4 food picks (real restaurants/cafes).
Ask for ${count} attractions in total. Keep descriptions short (max 20 words).

JSON shape:
{
  "destination": "${destination}",
  "region": "...",
  "category": "mixed",
  "tagline": "...",
  "bestSeason": "...",
  "avgCostPerDayINR": 2500,
  "idealDurationDays": 3,
  "hubs": [{"name": "${destination}", "description": "Main area", "typicalStayDays": 3, "highlights": [], "coordinates": {"lat": 0, "lon": 0}}],
  "attractions": [
    {
      "name": "Taj Mahal",
      "hub": "${destination}",
      "category": "culture",
      "description": "Iconic marble mausoleum built by Shah Jahan.",
      "entryFeeINR": 1100,
      "durationMinutes": 120,
      "coordinates": {"lat": 27.1751, "lon": 78.0421},
      "popularityScore": 10
    }
  ],
  "localCuisine": ["Dish 1"],
  "transportModes": ["Taxi"],
  "notes": "",
  "researchedAt": 0,
  "researchQuality": "full",
  "expansionAttempted": false
}`;
}

export function SECOND_PROMPT(destination: string, existingCount: number, existingHubNames: string[]): string {
  const hubList = existingHubNames.join(", ");
  return `The first response for ${destination} only returned ${existingCount} attractions. Provide 8 MORE real named attractions.

These MUST be real, specific, named places located exactly in ${destination}. Do NOT invent generic places.

The "hub" field in each attraction MUST be one of these exact hub names: ${hubList}

Return ONLY a JSON array. No markdown.
[
  {
    "name": "Real Named Place",
    "hub": "${existingHubNames[0] || destination}",
    "category": "nature|culture|food|adventure|shopping|nightlife|rest",
    "description": "What specifically makes this place worth visiting",
    "entryFeeINR": 0,
    "durationMinutes": 60,
    "coordinates": {"lat": 0.0, "lon": 0.0},
    "popularityScore": 8
  }
]`;
}
