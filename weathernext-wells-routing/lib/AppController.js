import { Config } from "./Config.js";
import { MapLoader } from "./MapLoader.js";
import { MarkerManager } from "./MarkerManager.js";
import { PolygonManager } from "./PolygonManager.js";
import { RouteCalculator } from "./RouteCalculator.js";
import { UIManager } from "./UIManager.js";

// AppController - Orchestrates the application components
export class AppController {
  constructor() {
    this.map = null;
    this.markerManager = null;
    this.polygonManager = null;
    this.routeCalculator = null;
    this.uiManager = new UIManager();
  }

  // async initMap() {
  async initMap() {
    this.map = await MapLoader.loadGoogleMapsAPI();
    // Initialize managers
    this.markerManager = await MarkerManager.create(this.map);
    this.polygonManager = await PolygonManager.create(this.map);
    this.routeCalculator = await RouteCalculator.create(this.map);

    // Create markers
    this.markerManager.createDepotMarker();
    const wells = this.markerManager.createWellMarkers();

    // Initialize drawing manager
    const drawingManager = this.polygonManager.initDrawingManager();

    // Set up event listeners
    this._setupEventListeners(drawingManager);

    // Update UI
    this.uiManager.updateWellsStatusList(wells);

    // automatically display the happy path
    await this._calculateRoute();
  }

  _setupEventListeners(drawingManager) {
    // Event listener for polygon completion
    google.maps.event.addListener(
      drawingManager,
      "polygoncomplete",
      (polygon) => this._handlePolygonComplete(polygon)
    );

    // Set up button event listeners
    // document
    //   .getElementById("calculate-route")
    //   .addEventListener("click", () => this._calculateRoute());

    document
      .getElementById("draw-polygon")
      .addEventListener("click", () => this.polygonManager.startDrawing());

    document
      .getElementById("clear-polygon")
      .addEventListener("click", () => this._clearWeatherPolygon());

    document
      .getElementById("use-default-polygon")
      .addEventListener("click", () => this._useDefaultWeatherPolygon());
  }

  _handlePolygonComplete(polygon) {
    this.polygonManager.setPolygon(polygon);
    this.polygonManager.stopDrawing();
    this._checkWellsInPolygon();
    this._calculateRoute();
  }

  _checkWellsInPolygon() {
    const isDepotInPolygon = this.polygonManager.isPointInPolygon(
      Config.CENTER_SPOT
    );
    this.markerManager.updateDepotMarkerStatus(isDepotInPolygon);
    this.markerManager.wells.forEach((well) => {
      const isInPolygon = this.polygonManager.isPointInPolygon(
        well.getPosition()
      );
      this.markerManager.updateWellMarkerStatus(well, isInPolygon);
    });

    this.uiManager.updateWellsStatusList(
      this.markerManager.wells,
      isDepotInPolygon
    );
  }

  async _calculateRoute() {
    if (!this.markerManager.isDepotOnline()) {
      alert("Cannot calculate route. Depot is offline due to weather event.");
      this.routeCalculator.clearRoute();
      this.routeCalculator._updateRouteStats(0, 0);
      return;
    }
    await this.routeCalculator.calculateOptimalRoute(this.markerManager.wells);
  }

  _clearWeatherPolygon() {
    this.polygonManager.clearPolygon();

    this.markerManager.updateDepotMarkerStatus(false);

    // Reset all wells to online
    this.markerManager.wells.forEach((well) => {
      this.markerManager.updateWellMarkerStatus(well, false);
    });

    this.uiManager.updateWellsStatusList(this.markerManager.wells, false);
    this._calculateRoute();
  }

  async _useDefaultWeatherPolygon() {
    this.polygonManager.createDefaultPolygon();
    this._checkWellsInPolygon();
    await this._calculateRoute();
  }
}
