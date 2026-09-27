import { Attraction } from "./types";
import { LocalAttractionProvider } from "./providers/LocalAttractionProvider";

export class AttractionService {
  private provider = new LocalAttractionProvider();

  async searchAttractions(destination: string, category?: string): Promise<Attraction[]> {
    return await this.provider.searchAttractions(destination, category);
  }
}
