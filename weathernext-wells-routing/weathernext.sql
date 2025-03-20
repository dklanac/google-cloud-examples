-- Select all weather events within a radius for a particular date

WITH params AS (
  SELECT 78 AS radius_miles
),
selected_polygons AS (
  SELECT
    geography_polygon
  FROM
    `oil-wells-weather.weathernext_gen_forecasts.126478713_1_0`,
    UNNEST(forecast) AS f
  WHERE
    TIMESTAMP_TRUNC(init_time, DAY) = TIMESTAMP("2021-02-14")
    AND ST_DWITHIN(
      geography,
      ST_GEOGPOINT(-102.2261204, 32.0221314), -- Midland coordinates
      (SELECT radius_miles * 1609.34 FROM params) -- Convert miles to meters
    )
    AND f.hours = 12
)
SELECT
  ST_ASGEOJSON(ST_UNION_AGG(geography_polygon)) AS combined_polygon_geojson
FROM
  selected_polygons


-- Select all tornadoes or greater weather events 
-- in the WeatherNext database within 60 miles regardless of date

-- Define input coordinates (replace with your own lat/lon)
DECLARE lon FLOAT64 DEFAULT -95.25;  -- Longitude
DECLARE lat FLOAT64 DEFAULT 29.7167; -- Latitude

-- Generate the city polygon with a 60 km radius
WITH city_polygon AS (
  SELECT ST_BUFFER(ST_GEOGPOINT(lon, lat), 60000) AS poly
)
-- Find all overlapping polygons where wind speed > 29 m/s at 10m
SELECT
  t.*,
  e.*
FROM `oil-wells-weather.weathernext_gen_forecasts.126478713_1_0` t,
     UNNEST(t.forecast) AS f,
     UNNEST(f.ensemble) AS e,
     city_polygon c
WHERE ST_INTERSECTS(t.geography_polygon, c.poly)
  AND SQRT(POW(e.10m_u_component_of_wind, 2) + POW(e.10m_v_component_of_wind, 2)) > 29
