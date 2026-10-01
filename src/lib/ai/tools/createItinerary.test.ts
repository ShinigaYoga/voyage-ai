import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseItineraryDateRequest } from "./itineraryDates";

const today = "2026-10-01";

test("parses a conflicting duration and explicit range for clarification", () => {
  assert.deepEqual(
    parseItineraryDateRequest("create me an itinerary for 3 days from oct 3 to oct 6th", today),
    {
      startDate: "2026-10-03",
      endDate: "2026-10-06",
      days: 3,
      clarification: "You said 3 days but gave 2026-10-03 to 2026-10-06 (4 days). Which duration should I use?",
    }
  );
});

test("uses start plus duration minus one day when no end date is stated", () => {
  assert.deepEqual(parseItineraryDateRequest("3 days from oct 3", today), {
    startDate: "2026-10-03",
    endDate: "2026-10-05",
    days: 3,
  });
});

test("parses ordinal day-first dates and the next future occurrence", () => {
  assert.deepEqual(parseItineraryDateRequest("itinerary from 6th oct to 9 oct", today), {
    startDate: "2026-10-06",
    endDate: "2026-10-09",
    days: 4,
  });
  assert.deepEqual(parseItineraryDateRequest("travel on oct 6", "2026-10-07"), {
    startDate: "2027-10-06",
  });
});

test("matches a stated duration with an inclusive date range", () => {
  assert.deepEqual(parseItineraryDateRequest("4 days from Oct 3 to Oct 6", today), {
    startDate: "2026-10-03",
    endDate: "2026-10-06",
    days: 4,
  });
});
