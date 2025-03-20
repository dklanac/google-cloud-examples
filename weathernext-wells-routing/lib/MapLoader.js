// MapLoader - Single Responsibility for loading the map API
import { Config } from "./Config.js";

export class MapLoader {
  static #Map = null;

  static {
    this.mapLib = (async () => {
      const { Map } = await google.maps.importLibrary("maps");
      this.#Map = Map;
    })();
  }

  static async loadGoogleMapsAPI() {
    await this.mapLib;
    // const position = Config.CENTER_SPOT;
    const position = { lat: 32.514, lng: -103.5415 };

    const map = new this.#Map(document.getElementById("map"), {
      zoom: 9,
      center: position,
      mapId: "OIL_WELLS_WEATHER",
    });

    return map;
  }
}
