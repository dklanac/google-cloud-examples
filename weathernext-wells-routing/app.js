import { AppController } from "./lib/AppController.js";
import { Config } from "./lib/Config.js";

const app = new AppController();

if (Config.WELL_LOCATIONS.length > 0) {
  await app.initMap();
} else {
  Config.onDataLoaded = async () => await app.initMap();
}

// TODO run route optimizer upon edit of polygon
