export type PhotonResponse = {
  type: "FeatureCollection";
  features: PhotonFeature[];
};

interface PhotonFeature {
  type: "Feature";
  properties: PhotonProperties;
  geometry: PhotonGeometry;
}
interface PhotonGeometry {
  type: "Point";
  coordinates: [number, number];
}
interface PhotonProperties {
  osm_type: "N" | "W" | "R"; // Node, Way, or Relation
  osm_id: number;
  osm_key?: string; // e.g., "place"
  osm_value?: string; // e.g., "city", "town", "street"

  // Name and language fields
  name: string;
  housenumber?: string;

  // Administrative boundary fields
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  countrycode?: string; // ISO 3166-1 alpha-2 code (e.g., 'fr')

  // Extra fields
  extent?: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]

  // Fields for relevance/ranking
  type?: string;
  rank?: number;
  distance?: number;
}
