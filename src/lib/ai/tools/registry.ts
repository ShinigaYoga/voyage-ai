import { ToolDefinition } from "./types";
import { createTripTool } from "./createTrip";
import { getTripTool } from "./getTrip";
import { updateTripTool } from "./updateTrip";
import { createItineraryTool } from "./createItinerary";
import { updateItineraryTool } from "./updateItinerary";
import { calculateBudgetTool } from "./calculateBudget";
import { regenerateDayTool } from "./regenerateDay";
import { removeActivityTool } from "./removeActivity";
import { moveActivityTool } from "./moveActivity";
import { addCustomActivityTool } from "./addCustomActivity";
import { getWeatherTool } from "./getWeather";
import { searchTransportTool } from "./searchTransport";
import { compareTransportTool } from "./compareTransport";
import { selectTransportTool } from "./selectTransport";
import { searchHotelsTool } from "./searchHotels";
import { searchRestaurantsTool } from "./searchRestaurants";
import { searchAttractionsTool } from "./searchAttractions";
import { findNearbyPlacesTool } from "./findNearbyPlaces";
import { bookItemTool } from "./bookItem";
import { replanDayTool } from "./replanDay";

export const toolRegistry: Record<string, ToolDefinition> = {
  createTrip: createTripTool,
  getTrip: getTripTool,
  updateTrip: updateTripTool,
  createItinerary: createItineraryTool,
  updateItinerary: updateItineraryTool,
  calculateBudget: calculateBudgetTool,
  regenerateDay: regenerateDayTool,
  removeActivity: removeActivityTool,
  moveActivity: moveActivityTool,
  addCustomActivity: addCustomActivityTool,
  getWeather: getWeatherTool,
  searchTransport: searchTransportTool,
  compareTransport: compareTransportTool,
  selectTransport: selectTransportTool,
  searchHotels: searchHotelsTool,
  searchRestaurants: searchRestaurantsTool,
  searchAttractions: searchAttractionsTool,
  findNearbyPlaces: findNearbyPlacesTool,
  bookItem: bookItemTool,
  replanDay: replanDayTool,
};
