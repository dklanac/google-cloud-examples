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
