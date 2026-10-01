import { estimateBudget, adjustItineraryForBudget } from "../src/lib/budget/engine.js";

const sampleProfile = {
  destination: "Agra",
  region: "Uttar Pradesh",
  category: "culture",
  tagline: "City of Taj Mahal",
  bestSeason: "Oct-Mar",
  avgCostPerDayINR: 2500,
  idealDurationDays: 3,
  hubs: [{ name: "Agra", description: "Agra Center", typicalStayDays: 3, highlights: [], coordinates: { lat: 27.18, lon: 78.0 } }],
  attractions: [
    { name: "Taj Mahal", hub: "Agra", category: "culture", description: "Iconic marble mausoleum", entryFeeINR: 1100, durationMinutes: 120, coordinates: { lat: 27.17, lon: 78.04 }, popularityScore: 10 },
    { name: "Agra Fort", hub: "Agra", category: "culture", description: "Historic red sandstone fort", entryFeeINR: 600, durationMinutes: 90, coordinates: { lat: 27.17, lon: 78.02 }, popularityScore: 9 },
    { name: "Mehtab Bagh", hub: "Agra", category: "culture", description: "Garden complex opposite Taj Mahal", entryFeeINR: 300, durationMinutes: 60, coordinates: { lat: 27.18, lon: 78.04 }, popularityScore: 8 },
    { name: "Itmad-ud-Daula", hub: "Agra", category: "culture", description: "Baby Taj tomb", entryFeeINR: 300, durationMinutes: 60, coordinates: { lat: 27.19, lon: 78.03 }, popularityScore: 7 },
    { name: "Agra Heritage Walk", hub: "Agra", category: "culture", description: "Self-guided old city street walking tour", entryFeeINR: 0, durationMinutes: 90, coordinates: { lat: 27.18, lon: 78.01 }, popularityScore: 6 },
    { name: "Taj Nature Walk", hub: "Agra", category: "nature", description: "Peaceful nature park near Taj Mahal", entryFeeINR: 50, durationMinutes: 60, coordinates: { lat: 27.17, lon: 78.05 }, popularityScore: 6 },
    { name: "Pinch of Spice", hub: "Agra", category: "food", description: "Famous North Indian dining", entryFeeINR: 600, durationMinutes: 60, coordinates: { lat: 27.20, lon: 78.01 }, popularityScore: 8 },
    { name: "Shankara Veg Thali", hub: "Agra", category: "food", description: "Budget thali restaurant", entryFeeINR: 150, durationMinutes: 45, coordinates: { lat: 27.17, lon: 78.04 }, popularityScore: 7 }
  ],
  localCuisine: ["Petha"],
  transportModes: ["Auto"],
  notes: "",
  researchedAt: Date.now(),
  researchQuality: "full",
  expansionAttempted: false
};

const baseTrip = {
  id: "test-trip-1",
  name: "Agra Expedition",
  destination: "Agra",
  travelers: 2,
  budget: "₹50,000",
  dates: "3 days",
  destinationProfile: sampleProfile,
  itinerary: {
    days: [
      {
        dayIndex: 0,
        activities: [
          { id: "a1", name: "Taj Mahal", location: "Agra", startTime: "08:00", durationMinutes: 120, price: 1100, category: "culture", description: "Iconic mausoleum" },
          { id: "a2", name: "Pinch of Spice", location: "Agra", startTime: "13:00", durationMinutes: 60, price: 600, category: "food", description: "Dining" },
          { id: "a3", name: "Itmad-ud-Daula", location: "Agra", startTime: "15:30", durationMinutes: 60, price: 300, category: "culture", description: "Baby Taj" }
        ]
      },
      {
        dayIndex: 1,
        activities: [
          { id: "a4", name: "Agra Fort", location: "Agra", startTime: "09:00", durationMinutes: 90, price: 600, category: "culture", description: "Historic fort" },
          { id: "a5", name: "Mehtab Bagh", location: "Agra", startTime: "16:00", durationMinutes: 60, price: 300, category: "culture", description: "Garden view" }
        ]
      }
    ]
  }
};

console.log("================================================");
console.log("VERIFYING BUDGET-AWARE ITINERARY ENGINE");
console.log("================================================");

// (a) Comfortable Budget
console.log("\n--- TEST (a): COMFORTABLE BUDGET (₹50,000) ---");
const resultA = adjustItineraryForBudget({ ...baseTrip, budget: "₹50,000" }, sampleProfile);
console.log(`Budget: ₹${resultA.breakdown.budget.toLocaleString('en-IN')}`);
console.log(`Estimated Total: ₹${resultA.breakdown.total.toLocaleString('en-IN')}`);
console.log(`Remaining: ₹${resultA.breakdown.remaining.toLocaleString('en-IN')}`);
console.log(`Status: ${resultA.breakdown.status}`);
console.log(`Adjustments: ${resultA.adjustments.length > 0 ? resultA.adjustments.join(', ') : 'None'}`);

// (b) Very Tight Budget
console.log("\n--- TEST (b): VERY TIGHT BUDGET (₹10,000) ---");
const resultB = adjustItineraryForBudget({ ...baseTrip, budget: "₹10,000" }, sampleProfile);
console.log(`Budget: ₹${resultB.breakdown.budget.toLocaleString('en-IN')}`);
console.log(`Estimated Total: ₹${resultB.breakdown.total.toLocaleString('en-IN')}`);
console.log(`Remaining/Over: ₹${resultB.breakdown.remaining.toLocaleString('en-IN')}`);
console.log(`Status: ${resultB.breakdown.status}`);
console.log(`Adjustments Made (${resultB.adjustments.length}):`);
resultB.adjustments.forEach(adj => console.log(`  • ${adj}`));

// Verify major attractions preserved in (b)
const day1ActivitiesB = resultB.updatedTrip.itinerary.days[0].activities.map(a => a.name);
const day2ActivitiesB = resultB.updatedTrip.itinerary.days[1].activities.map(a => a.name);
const allBAttractions = [...day1ActivitiesB, ...day2ActivitiesB];

console.log(`\nActivities in Tight Budget (b):`, allBAttractions);
const TajPreserved = allBAttractions.includes("Taj Mahal");
const FortPreserved = allBAttractions.includes("Agra Fort");
console.log(`Major Attraction Preserved (Taj Mahal): ${TajPreserved ? 'YES ✅' : 'NO ❌'}`);
console.log(`Major Attraction Preserved (Agra Fort): ${FortPreserved ? 'YES ✅' : 'NO ❌'}`);

// (c) Budget changed then recalculated
console.log("\n--- TEST (c): RECALCULATED BUDGET CHANGE (₹50,000 -> ₹10,000 -> ₹35,000) ---");
const resultC = adjustItineraryForBudget({ ...resultB.updatedTrip, budget: "₹35,000" }, sampleProfile);
console.log(`Recalculated Budget: ₹${resultC.breakdown.budget.toLocaleString('en-IN')}`);
console.log(`Estimated Total: ₹${resultC.breakdown.total.toLocaleString('en-IN')}`);
console.log(`Remaining: ₹${resultC.breakdown.remaining.toLocaleString('en-IN')}`);
console.log(`Status: ${resultC.breakdown.status}`);
console.log(`Adjustments: ${resultC.adjustments.length > 0 ? resultC.adjustments.join(', ') : 'None'}`);

