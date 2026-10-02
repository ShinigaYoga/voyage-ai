export interface WeatherForecast {
  date: string; // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  precipitationMm: number;
  condition: "clear" | "cloudy" | "rain" | "storm" | "snow";
  icon: string; // emoji
  description: string;
}

export interface WeatherProvider {
  getForecast(lat: number, lon: number, days?: number): Promise<WeatherForecast[]>;
  getCurrent(lat: number, lon: number): Promise<WeatherForecast>;
}

export interface GetWeatherParams {
  destination?: string;
  date?: string;
  coordinates?: { lat: number; lon: number };
}

export interface GetWeatherRangeParams {
  destination: string;
  startDate: string;
  endDate: string;
  coordinates?: { lat: number; lon: number };
}
