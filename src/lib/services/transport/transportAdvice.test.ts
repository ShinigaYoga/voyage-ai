import { test } from "node:test";
import { strict as assert } from "node:assert";
import { EstimateTransportProvider } from "./providers/EstimateTransportProvider";
import { calculateTransportBookingAdvice, isTransportIntent, parseTransportDates } from "./transportAdvice";

const today = "2026-10-01";

test("round-trip month dates parse with the current future year", () => {
  assert.deepEqual(parseTransportDates("Oct 7 to Oct 10", today), {
    departureDate: "2026-10-07",
    returnDate: "2026-10-10",
  });
});

test("relative dates written as days away parse from the fixed current date", () => {
  assert.deepEqual(parseTransportDates("I'm travelling from A to B on a date 6 days away", today), {
    departureDate: "2026-10-07",
    returnDate: undefined,
  });
});

test("booking timing and yes follow-ups stay in structured transport handling", () => {
  assert.equal(isTransportIntent("When should I book my transport?"), true);
  assert.equal(isTransportIntent("yes", [
    { role: "assistant", content: "Would you like to see transport options?" },
  ]), true);
  assert.equal(isTransportIntent("yes", [
    { role: "user", content: "I'm travelling from A to B on Oct 7" },
    { role: "assistant", content: "When should you book?" },
  ]), true);
});

test("departures inside a week recommend booking now without past dates", () => {
  const advice = calculateTransportBookingAdvice("2026-10-07", today);
  assert.equal(advice.bookNow, true);
  assert.equal(advice.daysToGo, 6);
  assert.equal(advice.windowStart, today);
  assert.ok(advice.milestones.every(date => date >= today));
});

test("medium and long booking windows use dated future milestones", () => {
  const twoMonths = calculateTransportBookingAdvice("2026-12-01", today);
  const fiveMonths = calculateTransportBookingAdvice("2027-03-01", today);
  assert.equal(twoMonths.bookNow, false);
  assert.equal(twoMonths.windowStart, today);
  assert.equal(fiveMonths.bookNow, false);
  assert.equal(fiveMonths.windowStart, today);
  assert.ok(fiveMonths.windowEnd > today);
  assert.ok([...twoMonths.milestones, ...fiveMonths.milestones].every(date => date >= today));
});

test("a trip at the two-month boundary gets a scaled dated booking window", () => {
  const advice = calculateTransportBookingAdvice("2026-12-01", today);
  assert.equal(advice.windowStart, today);
  assert.equal(advice.windowEnd, "2026-12-01");
  assert.deepEqual(advice.milestones, ["2026-10-01", "2026-10-31", "2026-12-01"]);
});

test("past departures never produce booking-window dates before today", () => {
  const advice = calculateTransportBookingAdvice("2026-09-30", today);
  assert.equal(advice.bookNow, true);
  assert.equal(advice.windowStart, today);
  assert.equal(advice.windowEnd, today);
  assert.deepEqual(advice.milestones, [today]);
});

test("estimated provider results are stable and have no invented operator names", async () => {
  const provider = new EstimateTransportProvider();
  const query = { origin: "A", destination: "B", date: "2026-10-07" };
  const first = await provider.search(query);
  const second = await provider.search(query);
  assert.deepEqual(second, first);
  assert.ok(first.every(option => option.isEstimate && !option.provider && option.priceRange));
});
