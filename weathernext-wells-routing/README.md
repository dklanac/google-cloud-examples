# Delaware Basin Well Route Optimizer

This application helps optimize routes for servicing oil wells in the Delaware Basin, with features to visualize well locations, weather events, and calculate optimal routes.

## Project Overview

The Delaware Basin Well Route Optimizer is a web application that:
- Displays oil well locations on an interactive map
- Allows drawing or using predefined weather event polygons
- Calculates optimal routes to service wells while accounting for weather conditions
- Provides information about well statuses and route details

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Google Cloud Platform](https://cloud.google.com/) account
- Google Maps API key (see setup instructions below)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd weathernext-wells-routing
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Google Cloud Project & API Key

This project requires a Google Maps API key from Google Cloud Platform:

1. Create a new Google Cloud project
2. Enable the required APIs:
   - Maps JavaScript API
   - Directions API (legacy)
3. Create an API key:
   - Go to **Google Maps Platform > Credentials** page
   - Click **Create credentials > API key**
   - For production, add API key restrictions to increase security

> **Important Note**: As of March 1, 2025, the Directions API has been moved to Legacy status and is not available for new projects. This project should be updated to use the Routes API instead. New developers will need to refactor the routing implementation to use the new Routes API. [More information on the transition](https://masterconcept.ai/news/google-maps-api-changes-2025-migration-guide-for-directions-api-distance-matrix-api/).

### 4. Configure Environment Variables

Create a `.env` file in the project root with the following content:

`GOOGLE_MAPS_API_KEY=your_api_key_here`

### 5. Run the Server

This project uses a single Express server to serve both the API and static files:

```bash
node server.js
```

The application will be available at `http://localhost:3000`.

## Project Structure

- `index.html` - Main HTML file for the web application that defines the UI layout
- `app.js` - Main application file that initializes the Google Maps API and bootstraps the application
- `server.js` - Express server for API endpoints and serving static files
- `styles.css` - CSS styles for the application UI
- `.env` - Environment file containing API keys and other configuration
- `package.json` - Node.js project dependencies and scripts

### Data Files:
- `wells.json` - Dataset containing oil well information and locations
- `cold_snap.geojson` - GeoJSON file with data representing the February 2021 arctic blast area
- `coordinates.json` - Additional coordinate data used for mapping
- `New_Mexico_Oil_FeaturesToJSO.geojson` - Comprehensive GeoJSON data for New Mexico oil features

### Library Files (`lib/` directory):
- `AppController.js` - Main controller for the application that orchestrates the app components
- `Config.js` - Configuration settings including API keys, map center coordinates, and UI options
- `MapLoader.js` - Handles loading the Google Maps API and initializing the map instance
- `RouteCalculator.js` - Logic for calculating optimal routes between wells based on various factors
- `WellManager.js` - Manages well data, including status updates and filtering capabilities
- `PolygonHandler.js` - Handles creation, editing, and display of polygon areas representing weather events
- `UIController.js` - Manages UI interactions and updates the display based on application state

### Data Models:
- `Well.js` - Data model representing an oil well with properties and methods

## Development Notes

### Using a Single Server

The project is configured to run both the API and serve static files from a single Express server on port 3000. This approach avoids CORS issues that would arise from using separate servers.

### Updating to Routes API

Current implementation uses the legacy Directions API. For new projects, modify the code to use the Routes API:

1. Update API imports and initialization to use the Routes API
2. Replace Directions API methods with equivalent Routes API methods
3. Update route calculation logic to use the new API format

## Troubleshooting

### Common Issues

1. **API Key Issues**: If you see "API key not loaded" errors, ensure your API key is correctly set in the `.env` file and that the required APIs are enabled in your Google Cloud project.

2. **Google Maps Not Loading**: If the map doesn't load, check the browser console for errors. The MapLoader utility includes mechanisms to wait for the API to load.
