import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Trip } from "@/lib/types";
import { classifyDayReplanFocus, detectDayReplanIntent } from "./dayReplanning";

const today = "2026-10-01";
const trip: Trip = {
  id: "trip-1",
  name: "Test trip",
  destination: "Test destination",
  travelers: 1,
  dates: "2026-10-02 to 2026-10-04",
  itinerary: {
    days: [
      { dayIndex: 0, date: "2026-10-02", activities: [] },
      { dayIndex: 1, date: "2026-10-03", activities: [] },
      { dayIndex: 2, date: "2026-10-04", activities: [] },
    ],
  },
  createdAt: 0,
  updatedAt: 0,
};

test("detects the target day and constraint for common replanning requests", () => {
  const cases = [
    ["It will rain on Day 1, replan Day 1.", 0, "weather-rain"],
    ["Day 2 will be very hot, make it more suitable.", 1, "weather-heat"],
    ["Change Day 3 to have fewer activities.", 2, "relaxed"],
    ["Replace the outdoor activities on Day 1.", 0, "indoor"],
    ["Change Day 2 because of rain. Keep the rest of my itinerary unchanged.", 1, "weather-rain"],
    ["Replace the activities on Day 3 with nearby attractions.", 2, "nearby"],
    ["Day 1 is too packed, make it more relaxed.", 0, "relaxed"],
    ["Day 1 has too many activities.", 0, "relaxed"],
    ["Change Day 2 to focus on sightseeing.", 1, "sightseeing"],
    ["Rain is expected tomorrow, rearrange that day's itinerary.", 0, "weather-rain"],
    ["It's going to rain on Day 1, replan that day and keep the rest of my itinerary unchanged.", 0, "weather-rain"],
  ] as const;

  for (const [message, dayIndex, focus] of cases) {
    const result = detectDayReplanIntent(message, [], trip, today);
    assert.equal(result.requested, true, message);
    assert.equal(result.intent?.dayIndex, dayIndex, message);
    assert.equal(result.intent?.focus, focus, message);
  }
});

test("maps tomorrow, weekdays, and conversational day references to itinerary dates", () => {
  const tomorrow = detectDayReplanIntent("It's raining tomorrow, change the plan.", [], trip, today);
  assert.equal(tomorrow.intent?.dayIndex, 0);
  assert.equal(tomorrow.intent?.targetDate, "2026-10-02");

  const weekday = detectDayReplanIntent("Change Friday to focus on sightseeing.", [], trip, today);
  assert.equal(weekday.intent?.dayIndex, 0);
  assert.equal(weekday.intent?.targetDate, "2026-10-02");

  const contextual = detectDayReplanIntent(
    "Rearrange that day because of rain.",
    [{ role: "user", content: "It will rain on Day 2, replan Day 2." }],
    trip,
    today,
  );
  assert.equal(contextual.intent?.dayIndex, 1);
  assert.equal(contextual.intent?.focus, "weather-rain");
});

test("uses the latest explicit day and does not replan for a weather question", () => {
  const latestDay = detectDayReplanIntent(
    "Actually, change Day 3 to be more relaxed.",
    [{ role: "user", content: "It will rain on Day 1, replan Day 1." }],
    trip,
    today,
  );
  assert.equal(latestDay.intent?.dayIndex, 2);
  assert.equal(latestDay.intent?.focus, "relaxed");

  const weatherQuestion = detectDayReplanIntent("Will it rain on Day 1?", [], trip, today);
  assert.equal(weatherQuestion.requested, false);
});

test("prefers indoor activities when the user asks to replace outdoor activities", () => {
  assert.equal(classifyDayReplanFocus("Replace the outdoor activities on Day 1."), "indoor");
  assert.equal(classifyDayReplanFocus("I don't want outdoor activities on Day 1."), "indoor");
  assert.equal(classifyDayReplanFocus("It will snow on Day 2, plan indoors."), "weather-cold");
});
