import { GuideContext } from "./src/lib/services/guide/GuideService";
import fs from "fs";

const ctx: GuideContext = {
  destination: "Goa",
  day: 2,
  trip: {
    id: "o15hbbajehj",
    name: "Goa Trip",
    destination: "Goa",
    travelers: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    itinerary: {
      days: [
        {
          dayIndex: 0,
          activities: [{ id: "1", name: "Arrival", location: "Goa", startTime: "10:00", durationMinutes: 60, price: 0, category: "transport", description: "" }]
        },
        {
          dayIndex: 1,
          activities: [
            { id: "2", name: "Sunrise Beach Walk", location: "Goa", startTime: "06:00", durationMinutes: 60, price: 0, category: "nature", description: "" },
            { id: "3", name: "Beachside Café Lunch", location: "Goa", startTime: "12:00", durationMinutes: 60, price: 0, category: "food", description: "" },
            { id: "4", name: "Spice Plantation Visit", location: "Goa", startTime: "14:00", durationMinutes: 120, price: 500, category: "culture", description: "" },
            { id: "5", name: "Seafood Dinner under Stars", location: "Goa", startTime: "19:00", durationMinutes: 120, price: 1000, category: "food", description: "" }
          ]
        }
      ]
    }
  }
};

let itineraryContext = "";
if (ctx.trip?.itinerary?.days && ctx.day !== undefined) {
  const dayData = ctx.trip.itinerary.days.find((d) => d.dayIndex === ctx.day! - 1);
  if (dayData) {
    const activityNames = dayData.activities.map((a) => a.name).join(", ");
    itineraryContext = `\nDay ${ctx.day} itinerary includes: ${activityNames || "no activities yet"}.`;
  } else {
    itineraryContext = "\nDayData not found for dayIndex " + (ctx.day - 1);
  }
} else {
  itineraryContext = "\nTrip itinerary days missing or day undefined.";
}

console.log("Itinerary Context generated:");
console.log(itineraryContext);
