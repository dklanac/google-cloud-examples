import { Config } from "./Config.js";
import { Well } from "./Well.js";

// MarkerManager - Single Responsibility for managing markers
export class MarkerManager {
  constructor(map, ...mapLib) {
    this.map = map;
    const [AdvancedMarkerElement] = mapLib;
    this.depotMarker = null;
    this.wells = [];
    this.depotStatus = null;
    this.AdvancedMarkerElement = AdvancedMarkerElement;
  }

  static async create(map) {
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    return new MarkerManager(map, AdvancedMarkerElement);
  }

  createDepotMarker() {
    this.depotMarker = new this.AdvancedMarkerElement({
      position: Config.CENTER_SPOT,
      map: this.map,
      title: "Depot (Midland, TX)",
      // icon: this._createIcon(Config.MARKER_ICONS.DEPOT),
    });
    return this.depotMarker;
  }

  createWellMarkers() {
    this.wells = Config.WELL_LOCATIONS.map((wellData) => {
      const well = new Well(
        wellData.id,
        wellData.lat,
        wellData.lng,
        wellData.name
      );

      const marker = new this.AdvancedMarkerElement({
        position: well.getPosition(),
        map: this.map,
        title: well.name,
        // icon: _createIcon(Config.MARKER_ICONS.WELL_ONLINE),
        // wellId: well.id,
      });

      well.marker = marker;

      // Add info window for each well
      // const infoWindow = new InfoWindow({
      //   content: `<div><strong>${well.name}</strong><br>Status: <span class="online">Online</span></div>`,
      // });

      // marker.addListener("gmp-click", () => {
      //   infoWindow.open(this.map, marker);
      // });

      return well;
    });

    return this.wells;
  }

  updateWellMarkerStatus(well, isInPolygon) {
    const status = isInPolygon ? "offline" : "online";
    well.setStatus(status);

    const iconConfig = isInPolygon
      ? Config.MARKER_ICONS.WELL_OFFLINE
      : Config.MARKER_ICONS.WELL_ONLINE;

    // well.marker.setIcon(this._createIcon(iconConfig));
  }

  updateDepotMarkerStatus(isInPolygon) {
    const status = isInPolygon ? "offline" : "online";
    this.depotStatus = status;
  }

  isDepotOnline() {
    return this.depotStatus !== "offline";
  }

  getOnlineWells() {
    return this.wells.filter((well) => well.isOnline());
  }

  _createIcon(iconConfig) {
    return {
      url: iconConfig.url,
      scaledSize: new google.maps.Size(
        iconConfig.scaledSize.width,
        iconConfig.scaledSize.height
      ),
    };
  }
}
