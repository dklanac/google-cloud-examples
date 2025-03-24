// Server for weathernext-wells-routing app
require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory (where your index.html is)
app.use(express.static(path.join(__dirname, "./")));

// API endpoint to get the API key
app.get("/api/config", (req, res) => {
  res.json({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || "your-api-key",
  });
});

// Any other API routes you need
// app.get('/api/other-endpoint', ...);

// For single page applications - serve index.html for any route not found
// This ensures your client-side routing works if you're using it
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "./index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
