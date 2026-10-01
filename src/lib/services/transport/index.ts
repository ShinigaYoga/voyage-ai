import { TransportService } from "./TransportService";
import { EstimateTransportProvider } from "./providers/EstimateTransportProvider";

export * from "./types";
export * from "./TransportService";
export * from "./scorer";

export function getTransportService(): TransportService {
  return new EstimateTransportProvider();
}
