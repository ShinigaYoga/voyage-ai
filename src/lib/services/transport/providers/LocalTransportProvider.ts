import { TransportOption, TransportSearchParams } from "../types";
import { TransportService } from "../TransportService";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class LocalTransportProvider implements TransportService {
  async search(params: TransportSearchParams): Promise<TransportOption[]> {
    const origin = (params.origin || "Delhi").trim();
    const destination = (params.destination || "Goa").trim();
    const key = `${origin.toLowerCase()}->${destination.toLowerCase()}`;

    // Seeded route dictionary
    const SEEDED_ROUTES: Record<string, TransportOption[]> = {
      "delhi->goa": [
        { id: "fl_del_goa_1", mode: "flight", provider: "IndiGo 6E-204", departureCity: "Delhi", arrivalCity: "Goa", departureTime: "06:15", arrivalTime: "09:05", durationMinutes: 170, price: 4850, stops: 0, availability: "available" },
        { id: "fl_del_goa_2", mode: "flight", provider: "Air India AI-883", departureCity: "Delhi", arrivalCity: "Goa", departureTime: "14:40", arrivalTime: "17:35", durationMinutes: 175, price: 6200, stops: 0, availability: "few-seats" },
        { id: "tr_del_goa_1", mode: "train", provider: "Goa Sampark Kranti Express (12484)", departureCity: "Delhi", arrivalCity: "Madgaon", departureTime: "15:00", arrivalTime: "18:45", durationMinutes: 1665, price: 1850, stops: 4, availability: "available" },
        { id: "tr_del_goa_2", mode: "train", provider: "Rajdhani Express (12432)", departureCity: "Delhi", arrivalCity: "Madgaon", departureTime: "11:00", arrivalTime: "12:15", durationMinutes: 1515, price: 3200, stops: 3, availability: "few-seats" },
        { id: "bs_del_goa_1", mode: "bus", provider: "IntrCity SmartBus", departureCity: "Delhi", arrivalCity: "Goa", departureTime: "12:00", arrivalTime: "20:00", durationMinutes: 1920, price: 1400, stops: 8, availability: "available" },
      ],
      "mumbai->goa": [
        { id: "fl_bom_goa_1", mode: "flight", provider: "Akasa Air QP-1102", departureCity: "Mumbai", arrivalCity: "Goa", departureTime: "08:30", arrivalTime: "09:45", durationMinutes: 75, price: 2800, stops: 0, availability: "available" },
        { id: "fl_bom_goa_2", mode: "flight", provider: "IndiGo 6E-5312", departureCity: "Mumbai", arrivalCity: "Goa", departureTime: "17:15", arrivalTime: "18:30", durationMinutes: 75, price: 3450, stops: 0, availability: "available" },
        { id: "tr_bom_goa_1", mode: "train", provider: "Vande Bharat Express (22229)", departureCity: "Mumbai", arrivalCity: "Madgaon", departureTime: "05:25", arrivalTime: "13:10", durationMinutes: 465, price: 1650, stops: 2, availability: "available" },
        { id: "tr_bom_goa_2", mode: "train", provider: "Mandovi Express (10103)", departureCity: "Mumbai", arrivalCity: "Madgaon", departureTime: "07:10", arrivalTime: "19:00", durationMinutes: 710, price: 850, stops: 12, availability: "available" },
        { id: "bs_bom_goa_1", mode: "bus", provider: "VRL Travels Volvo AC", departureCity: "Mumbai", arrivalCity: "Goa", departureTime: "20:00", arrivalTime: "07:30", durationMinutes: 690, price: 1100, stops: 4, availability: "available" },
      ],
      "delhi->manali": [
        { id: "fl_del_kmu_1", mode: "flight", provider: "Alliance Air 9I-805 (to Kullu)", departureCity: "Delhi", arrivalCity: "Bhuntar (Kullu)", departureTime: "06:45", arrivalTime: "08:00", durationMinutes: 75, price: 7200, stops: 0, availability: "few-seats" },
        { id: "tr_del_chd_1", mode: "train", provider: "Vande Bharat (22447) + Taxi", departureCity: "Delhi", arrivalCity: "Manali", departureTime: "05:50", arrivalTime: "14:30", durationMinutes: 520, price: 2100, stops: 2, availability: "available" },
        { id: "bs_del_mnl_1", mode: "bus", provider: "HPTDC Volvo Sleeper", departureCity: "Delhi", arrivalCity: "Manali", departureTime: "20:15", arrivalTime: "08:30", durationMinutes: 735, price: 1450, stops: 3, availability: "available" },
        { id: "bs_del_mnl_2", mode: "bus", provider: "Zingbus Premium AC", departureCity: "Delhi", arrivalCity: "Manali", departureTime: "21:30", arrivalTime: "09:45", durationMinutes: 735, price: 1150, stops: 2, availability: "available" },
      ],
      "chandigarh->manali": [
        { id: "tr_chd_mnl_1", mode: "train", provider: "Express + Taxi via Mandi", departureCity: "Chandigarh", arrivalCity: "Manali", departureTime: "08:00", arrivalTime: "15:00", durationMinutes: 420, price: 1200, stops: 1, availability: "available" },
        { id: "bs_chd_mnl_1", mode: "bus", provider: "HRTC Volvo AC", departureCity: "Chandigarh", arrivalCity: "Manali", departureTime: "10:30", arrivalTime: "18:00", durationMinutes: 450, price: 850, stops: 2, availability: "available" },
      ]
    };

    if (SEEDED_ROUTES[key]) {
      return SEEDED_ROUTES[key];
    }

    // Unseeded fallback generator (deterministic using hash)
    const seed = hashString(key);
    const flightPrice = 3500 + (seed % 3000);
    const trainPrice = 1100 + (seed % 1200);
    const busPrice = 750 + (seed % 500);

    return [
      {
        id: `fl_gen_${seed}_1`,
        mode: "flight",
        provider: "IndiGo Express",
        departureCity: origin,
        arrivalCity: destination,
        departureTime: "07:30",
        arrivalTime: "09:45",
        durationMinutes: 135,
        price: flightPrice,
        stops: 0,
        availability: "available",
      },
      {
        id: `tr_gen_${seed}_1`,
        mode: "train",
        provider: "Superfast Express (12901)",
        departureCity: origin,
        arrivalCity: destination,
        departureTime: "16:20",
        arrivalTime: "04:10",
        durationMinutes: 710,
        price: trainPrice,
        stops: 4,
        availability: "available",
      },
      {
        id: `bs_gen_${seed}_1`,
        mode: "bus",
        provider: "Intercity AC Sleeper",
        departureCity: origin,
        arrivalCity: destination,
        departureTime: "21:00",
        arrivalTime: "08:30",
        durationMinutes: 690,
        price: busPrice,
        stops: 3,
        availability: "available",
      },
    ];
  }
}
