import { TransportOption, TransportSearchParams } from "./types";

export interface TransportService {
  search(params: TransportSearchParams): Promise<TransportOption[]>;
}
