import { Config } from "./Config.js";

// PolygonManager - Single Responsibility for managing the weather polygon
export class PolygonManager {
  constructor(map, ...mapLib) {
    this.map = map;
    const [DrawingManager] = mapLib;
    this.weatherPolygon = null;
    this.drawingManagerClass = DrawingManager;
    this.drawingManager = null;
  }

  static async create(map) {
    const { DrawingManager } = await google.maps.importLibrary("drawing");
    return new PolygonManager(map, DrawingManager);
  }

  initDrawingManager() {
    this.drawingManager = new this.drawingManagerClass({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: Config.POLYGON_OPTIONS,
      map: this.map,
    });

    return this.drawingManager;
  }

  startDrawing() {
    this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
  }

  stopDrawing() {
    this.drawingManager.setDrawingMode(null);
  }

  setPolygon(polygon) {
    // Clear existing polygon
    this.clearPolygon();
    this.weatherPolygon = polygon;
  }

  createDefaultPolygon() {
    this.clearPolygon();

    this.weatherPolygon = new google.maps.Polygon({
      paths: Config.DEFAULT_WEATHER_POLYGON,
      ...Config.POLYGON_OPTIONS,
    });

    this.weatherPolygon.setMap(this.map);
    return this.weatherPolygon;
  }

  clearPolygon() {
    if (this.weatherPolygon) {
      this.weatherPolygon.setMap(null);
      this.weatherPolygon = null;
    }
  }

  isPointInPolygon(position) {
    if (!this.weatherPolygon) return false;

    return google.maps.geometry.poly.containsLocation(
      position instanceof google.maps.LatLng
        ? position
        : new google.maps.LatLng(position.lat, position.lng),
      this.weatherPolygon
    );
  }
}
