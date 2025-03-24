import { AppController } from "./lib/AppController.js";
import { Config } from "./lib/Config.js";

// Load the Google Maps API dynamically after getting the API key
const loadGoogleMapsAPI = (apiKey) => {
  const script = document.createElement("script");
  script.innerHTML = `
    (g => { 
      var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; 
      b = b[c] || (b[c] = {}); 
      var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { 
        await (a = m.createElement("script")); 
        e.set("libraries", [...r] + ""); 
        for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); 
        e.set("callback", c + ".maps." + q); 
        a.src = \`https://maps.\${c}apis.com/maps/api/js?\` + e; 
        d[q] = f; 
        a.onerror = () => h = n(Error(p + " could not load.")); 
        a.nonce = m.querySelector("script[nonce]")?.nonce || ""; 
        m.head.append(a) 
      })); 
      d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) 
    })({
      key: "${apiKey}",
      v: "weekly"
    });
  `;
  document.getElementById("maps-script-container").appendChild(script);
};

// Initialize the application
const initApp = async () => {
  // Wait for the API key to be loaded
  const checkApiKey = async () => {
    if (Config.API_KEY) {
      // API key is loaded, initialize Google Maps API
      loadGoogleMapsAPI(Config.API_KEY);

      const app = new AppController();

      if (Config.WELL_LOCATIONS.length > 0) {
        await app.initMap();
      } else {
        Config.onDataLoaded = async () => await app.initMap();
      }
    } else {
      // Wait and check again
      setTimeout(checkApiKey, 100);
    }
  };

  // Start checking for API key
  checkApiKey();
};

// Initialize the application
initApp();

// TODO run route optimizer upon edit of polygon
