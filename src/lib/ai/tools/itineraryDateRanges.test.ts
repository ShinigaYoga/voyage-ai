import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseItineraryDateRequest } from "./itineraryDates";

const today = "2026-10-02";

test("parses full month ranges, abbreviated ranges, and ordinal day ranges", () => {
  assert.deepEqual(parseItineraryDateRequest("Oct 7 to Oct 9", today), {
    startDate: "2026-10-07",
    endDate: "2026-10-09",
    days: 3,
  });
  assert.deepEqual(parseItineraryDateRequest("October 7-9", today), {
    startDate: "2026-10-07",
    endDate: "2026-10-09",
    days: 3,
  });
  assert.deepEqual(parseItineraryDateRequest("7th–9th October", today), {
    startDate: "2026-10-07",
    endDate: "2026-10-09",
    days: 3,
  });
  assert.deepEqual(parseItineraryDateRequest("Oct 7 to Oct 7", today), {
    startDate: "2026-10-07",
    endDate: "2026-10-07",
    days: 1,
  });
});

test("parses a relative weekday duration and hyphenated trip length", () => {
  assert.deepEqual(parseItineraryDateRequest("next Friday for 3 days", today), {
    startDate: "2026-10-09",
    endDate: "2026-10-11",
    days: 3,
  });
  assert.deepEqual(parseItineraryDateRequest("I want a 3-day trip to Ladakh", today), {
    days: 3,
  });
});
