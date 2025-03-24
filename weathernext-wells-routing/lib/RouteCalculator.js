import { Config } from "./Config.js";

// RouteCalculator - Single Responsibility for calculating routes
export class RouteCalculator {
  constructor(map, ...mapsLib) {
    this.map = map;
    const [
      DirectionsService,
      DirectionsStatus,
      TravelMode,
      DirectionsRenderer,
    ] = mapsLib;
    this.directionsService = DirectionsService;
    this.directionsStatus = DirectionsStatus;
    this.travelMode = TravelMode;
    this.directionsRenderer = new DirectionsRenderer({
      map: this.map,
      suppressMarkers: true,
    });
  }

  static async create(map) {
    const {
      DirectionsService,
      DirectionsStatus,
      TravelMode,
      DirectionsRenderer,
    } = await google.maps.importLibrary("routes");
    return new RouteCalculator(
      map,
      DirectionsService,
      DirectionsStatus,
      TravelMode,
      DirectionsRenderer
    );
  }

  async calculateOptimalRoute(wells) {
    const onlineWells = wells.filter((well) => well.isOnline());

    if (onlineWells.length === 0) {
      alert("No online wells available for routing.");
      this._updateRouteStats(0, 0);
      this.directionsRenderer.setDirections({ routes: [] });
      return;
    }

    const waypoints = onlineWells.map((well) => ({
      location: new google.maps.LatLng(well.lat, well.lng),
      stopover: true,
    }));

    const request = {
      origin: Config.CENTER_SPOT,
      destination: Config.CENTER_SPOT,
      waypoints: waypoints,
      optimizeWaypoints: true,
      travelMode: this.travelMode.DRIVING,
      avoidTolls: true,
    };

    const directionsClient = new this.directionsService();
    const result = await directionsClient.route(request);

    if (result && result.status === this.directionsStatus.OK) {
      // const directionsRendererClient = new this.directionsRenderer();
      this.directionsRenderer.setDirections(result);
      this._calculateAndDisplayStats(result);
    } else {
      // alert("Directions request failed due to " + status);
      console.log("Directions request failed due to " + result.status);
    }
  }

  _calculateAndDisplayStats(result) {
    let totalDistance = 0;
    let totalDuration = 0;

    const route = result.routes[0];
    for (let i = 0; i < route.legs.length; i++) {
      totalDistance += route.legs[i].distance.value;
      totalDuration += route.legs[i].duration.value;
    }

    // Convert to miles and minutes
    const distanceMiles = (totalDistance / 1609.34).toFixed(2);
    const durationMinutes = Math.round(totalDuration / 60);

    this._updateRouteStats(distanceMiles, durationMinutes);
  }

  _updateRouteStats(distance, time) {
    document.getElementById("total-distance").textContent = distance;
    // document.getElementById("estimated-time").textContent = time;
  }

  clearRoute() {
    this.directionsRenderer.setDirections({ routes: [] });
  }
}
