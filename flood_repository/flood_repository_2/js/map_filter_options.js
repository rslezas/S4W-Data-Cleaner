/**
 * Populate map filter dropdowns from project data.
 *
 * Paths are relative to the HTML page, not this JavaScript file.
 * Existing HTML options remain available if a file fails to load.
 *
 * This script populates options only. Your existing map script handles
 * location/evidence filtering. Watershed/river filtering still requires
 * matching event fields or geographic matching logic.
 */
(() => {
  "use strict";

  // Adjust paths and property names to match your files.
  const CONFIG = {
    watersheds: {
      // Example path: replace with your actual watershed GeoJSON.
      path: "data/geojson/watersheds.geojson",

      // First nonempty property is used as the option value and label.
      properties: ["name:en", "name", "watershed_name", "watershed"],
    },

    rivers: {
      path: "data/geojson/kathmandu_rivers.geojson",
      properties: ["name:en", "name", "river_name", "river"],
    },

    events: {
      path: "data/events.json",
    },
  };

  // Load and parse one JSON or GeoJSON file.
  async function loadJSON(path) {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`${path}: HTTP ${response.status}`);
    }

    return response.json();
  }

  // Find the first usable name in a feature's properties.
  function getFeatureName(feature, propertyNames) {
    const properties = feature.properties || {};

    for (const key of propertyNames) {
      const value = properties[key];

      if (
        (typeof value === "string" || typeof value === "number") &&
        String(value).trim() !== ""
      ) {
        return String(value).trim();
      }
    }

    return null;
  }

  // Replace options with a sorted, deduplicated list.
  function populateDropdown(id, allLabel, values) {
    const select = document.getElementById(id);
    if (!select) return;

    const previousValue = select.value;

    const uniqueValues = [...new Set(
      values.filter((value) =>
        typeof value === "string" &&
        value.trim() !== "" &&
        value !== "all"
      )
    )].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    select.replaceChildren(new Option(allLabel, "all"));

    for (const value of uniqueValues) {
      select.add(new Option(value, value));
    }

    // Preserve the user's selection if it still exists.
    select.value = uniqueValues.includes(previousValue)
      ? previousValue
      : "all";

    // Refresh existing map listeners only if the selection changed.
    if (select.value !== previousValue) {
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  // Populate a dropdown using named GeoJSON features.
  async function populateGeographicFilter(id, allLabel, config) {
    if (!document.getElementById(id)) return;

    try {
      const data = await loadJSON(config.path);

      if (
        data.type !== "FeatureCollection" ||
        !Array.isArray(data.features)
      ) {
        throw new Error("Expected a GeoJSON FeatureCollection.");
      }

      const names = data.features
        .map((feature) => getFeatureName(feature, config.properties))
        .filter((name) => name !== null);

      if (names.length === 0) {
        console.warn(
          `${id}: no named features found. Check the configured property names.`,
          config.path
        );
        return;
      }

      populateDropdown(id, allLabel, names);
    } catch (error) {
      // Keep the existing HTML options when loading fails.
      console.error(`Unable to populate ${id}:`, error);
    }
  }

  // Use event values so options match the existing event filter logic.
  async function populateEventFilters() {
    if (
      !document.getElementById("locationFilter") &&
      !document.getElementById("evidenceFilter")
    ) {
      return;
    }

    try {
      const events = await loadJSON(CONFIG.events.path);

      if (!Array.isArray(events)) {
        throw new Error("events.json must contain an array.");
      }

      populateDropdown(
        "locationFilter",
        "All Locations",
        events.map((event) => event.location)
      );

      populateDropdown(
        "evidenceFilter",
        "All Evidence Types",
        events.map((event) => event.evidenceType || "Not provided")
      );
    } catch (error) {
      console.error("Unable to populate event filters:", error);
    }
  }

  function initializeFilters() {
    // Independent requests: one missing file does not block the others.
    populateGeographicFilter(
      "watershedFilter",
      "All Watersheds",
      CONFIG.watersheds
    );

    populateGeographicFilter(
      "riverFilter",
      "All Rivers",
      CONFIG.rivers
    );

    populateEventFilters();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeFilters,
      { once: true }
    );
  } else {
    initializeFilters();
  }
})();