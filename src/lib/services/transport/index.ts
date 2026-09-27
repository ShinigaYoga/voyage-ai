import { TransportService } from "./TransportService";
import { LocalTransportProvider } from "./providers/LocalTransportProvider";

export * from "./types";
export * from "./TransportService";
export * from "./scorer";

export function getTransportService(): TransportService {
  return new LocalTransportProvider();
}
