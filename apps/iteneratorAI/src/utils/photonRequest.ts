import { PhotonResponse } from "@/types/photon/PhotonTypes";
type Params =
  | {
      fromOrTo: "from";
      placeName: string;
      osm_key: "place";
      osm_id: number;
    }
  | {
      fromOrTo: "to";
      placeName: string;
      osm_key: "place" | "historic" | "tourism";
      osm_id: number;
    };

const photonUrlStringFunction = (fromOrTo: "from" | "to", query: string) => {
  if (fromOrTo === "from") {
    return `https://photon.komoot.io/api/?q=${query}&limit=10&osm_tag=place:city&osm_tag=place:state&osm_tag=place:village&osm_tag=place:town&osm_tag=place:country&lang=en`;
  } else if (fromOrTo === "to") {
    return `https://photon.komoot.io/api/?q=${query}&limit=10&osm_tag=place:city&osm_tag=place:state&osm_tag=place:village&osm_tag=place:town&osm_tag=place:country&osm_tag=historic&osm_tag=tourism&lang=en`;
  } else throw new Error("provide proper inputs");
};

const isPlaceFound = async (apiUrl: string, osm_id: number) => {
  try {
    const apiResponse = await fetch(apiUrl);
    if (!apiResponse.ok) {
      console.error("photon returned non-200 : " + apiResponse.status);
    }
    const apiResponseJson: PhotonResponse = await apiResponse
      .json()
      .catch(() => null);

    if (!apiResponseJson?.features?.length) {
      console.log("no features");
      return null;
    }
    const featuresArray = apiResponseJson.features;

    const foundPlaceExact = featuresArray.find(
      (element) => element.properties.osm_id === osm_id
    );
    if (!foundPlaceExact) return null;
    return foundPlaceExact;
  } catch (error) {
    console.error("fetch failed : " + error);
  }
};
export const photonRequestFunction = async (params: Params) => {
  if (params.fromOrTo === "from") {
    const apiUrl = photonUrlStringFunction("from", params.placeName);
    const placeFound = await isPlaceFound(apiUrl, params.osm_id);
    if (!placeFound) return null;
    return placeFound;
  } else if (params.fromOrTo === "to") {
    const apiUrl = photonUrlStringFunction("to", params.placeName);
    const placeFound = await isPlaceFound(apiUrl, params.osm_id);
    if (!placeFound) return null;
    return placeFound;
  } else return null;
};
