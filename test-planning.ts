import { TransportPlanningService } from "./src/lib/services/transport/TransportPlanningService";

const srv = new TransportPlanningService();

function runTests() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Trip >2 months away
  const d1 = new Date(today.getTime() + 100 * 24 * 60 * 60 * 1000);
  const plans1 = srv.generateTransportPlan("Delhi", "Agra", d1.toISOString());
  console.log("TEST 1: Trip 100 days away");
  console.log("Plans generated:", plans1.map(p => p.mode).join(", "));
  const flightPlan = plans1.find(p => p.mode === "flight") || plans1[0];
  console.log("Flight booking window:", flightPlan.bookingWindow);

  // 2. Trip 1 month away
  const d2 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const plans2 = srv.generateTransportPlan("Mumbai", "Pune", d2.toISOString());
  console.log("\nTEST 2: Trip 30 days away");
  console.log("Plans generated:", plans2.map(p => p.mode).join(", "));
  console.log("Window:", plans2[0]?.bookingWindow);

  // 3. Different origin/destination
  const plans3 = srv.generateTransportPlan("Chennai", "London", d1.toISOString());
  console.log("\nTEST 3: Chennai to London");
  console.log("Plans generated:", plans3.map(p => p.mode).join(", "));

  // 4. Close trip
  const d4 = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const plans4 = srv.generateTransportPlan("Delhi", "Jaipur", d4.toISOString());
  console.log("\nTEST 4: Trip 3 days away");
  console.log("Availability:", plans4[0]?.availability);
  console.log("Trend size:", plans4[0]?.trend.length);
}

runTests();
