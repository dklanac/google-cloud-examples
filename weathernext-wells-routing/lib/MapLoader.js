// MapLoader - Single Responsibility for loading the map API
import { Config } from "./Config.js";

export class MapLoader {
  static #Map = null;
  static #isGoogleMapsLoaded = false;

  // Helper method to check if Google Maps API is available
  static waitForGoogleMapsToLoad() {
    return new Promise((resolve) => {
      // If Google Maps is already loaded, resolve immediately
      if (window.google && window.google.maps) {
        this.#isGoogleMapsLoaded = true;
        resolve();
        return;
      }

      // Otherwise, check every 100ms until it's available
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps) {
          this.#isGoogleMapsLoaded = true;
          resolve();
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };

      checkGoogleMaps();
    });
  }

  static async loadGoogleMapsAPI() {
    // Wait for Google Maps to be loaded
    await this.waitForGoogleMapsToLoad();

    // Then import the maps library
    const { Map } = await google.maps.importLibrary("maps");
    this.#Map = Map;

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
