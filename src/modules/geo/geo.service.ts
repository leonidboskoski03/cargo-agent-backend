import { GeoRepository } from "./geo.repository.js";

const repo = new GeoRepository();

export class GeoService {
  listCountries() {
    return repo.listCountries();
  }

  listCities(input: { countryCode?: string; q?: string; pageSize?: number }) {
    return repo.listCities({
      countryCode: input.countryCode?.toUpperCase(),
      q: input.q?.trim(),
      pageSize: Math.min(input.pageSize ?? 20, 50),
    });
  }
}
