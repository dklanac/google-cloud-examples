// Config module - Single Responsibility for configuration
export const Config = {
  // We'll load this from window.ENV_API_KEY which will be set from .env
  API_KEY: "",
  // CENTER_SPOT: { lat: 32.7026, lng: -103.136 }, //Hobbs, NM
  CENTER_SPOT: { lat: 32.387416, lng: -104.2119776 }, //Carlsbad, NM

  WELL_LOCATIONS: [],

  DEFAULT_WEATHER_POLYGON: [],

  MARKER_ICONS: {
    DEPOT: {
      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      scaledSize: { width: 40, height: 40 },
    },
    WELL_ONLINE: {
      url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
      scaledSize: { width: 32, height: 32 },
    },
    WELL_OFFLINE: {
      url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      scaledSize: { width: 32, height: 32 },
    },
  },
  POLYGON_OPTIONS: {
    fillColor: "#FF0000",
    fillOpacity: 0.3,
    strokeWeight: 2,
    strokeColor: "#FF0000",
    clickable: true,
    editable: true,
    zIndex: 1,
  },
};

// Function to load API key from .env via a small server endpoint
const loadApiKey = async () => {
  try {
    const response = await fetch("/api/config");
    if (response.ok) {
      const data = await response.json();
      Config.API_KEY = data.apiKey;
    } else {
      console.error("Failed to load API key from server");
    }
  } catch (error) {
    console.error("Error loading API key:", error);
  }
};

// Try to load the API key
loadApiKey();

// Load the wells data in wells.json
fetch("wells.json")
  .then((r) => r.json())
  .then((data) => {
    Config.WELL_LOCATIONS = data.map((f) => ({
      id: f.id,
      lat: f.properties.latitude,
      lng: f.properties.longitude,
      name: f.properties.name,
      type: f.properties.type,
    }));

    if (Config.onDataLoaded) Config.onDataLoaded();
  })
  .catch((err) => {
    alert(`Error loading wells data: ${err}`);
  });

// Load the weather polygon data from cold_snap.geojson
fetch("cold_snap.geojson")
  .then((r) => r.json())
  .then((data) => {
    // Create a function to convert GeoJSON coordinates to {lat, lng} format
    const processCoordinates = (coords) =>
      coords.map((coord) => ({
        lng: coord[0],
        lat: coord[1],
      }));

    // Handle different GeoJSON types
    if (data.type === "Polygon") {
      // For Polygon type, process the first (and only) ring of coordinates
      Config.DEFAULT_WEATHER_POLYGON = processCoordinates(data.coordinates[0]);
    } else if (data.type === "MultiPolygon") {
      // For MultiPolygon, use the first polygon's outer ring
      // This is a simplification - in a full implementation you might want to handle all polygons
      Config.DEFAULT_WEATHER_POLYGON = processCoordinates(
        data.coordinates[0][0]
      );
    } else {
      console.error(`Unsupported GeoJSON type: ${data.type}`);
    }
  })
  .catch((err) => {
    console.error(`Error loading weather polygon data: ${err}`);
  });

Config.onDataLoaded = null;
