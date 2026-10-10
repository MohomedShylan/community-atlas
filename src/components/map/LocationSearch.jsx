
import { useEffect, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";

export default function LocationSearch({
  apiKey,
  onSelectPlace,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const controllerRef = useRef(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();

    const term = query.trim();
    if (term.length < 2) return;

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const url = new URL(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(term)}.json`
      );

      url.searchParams.set("key", apiKey);
      url.searchParams.set("limit", "5");
      url.searchParams.set("country", "lk");
      url.searchParams.set("autocomplete", "false");

      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Place search failed (${response.status}).`
        );
      }

      const data = await response.json();

      const places = (data.features ?? [])
        .filter(
          (feature) =>
            Array.isArray(feature.center) &&
            feature.center.length >= 2
        )
        .map((feature) => ({
          id: feature.id,
          label:
            feature.place_name ||
            feature.text ||
            "Unnamed place",
          lng: Number(feature.center[0]),
          lat: Number(feature.center[1]),
        }))
        .filter(
          (place) =>
            Number.isFinite(place.lng) &&
            Number.isFinite(place.lat)
        );

      if (!controller.signal.aborted) {
        setResults(places);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleChoose = (place) => {
    onSelectPlace(place);
    setQuery(place.label);
    setResults([]);
  };

  return (
    <div className="ca-place-search">
      <form
        className="ca-place-search-form"
        onSubmit={handleSearch}
      >
        <label
          className="ca-visually-hidden"
          htmlFor="public-place-search"
        >
          Search a public place in Sri Lanka
        </label>

        <Search size={18} aria-hidden="true" />

        <input
          id="public-place-search"
          type="search"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search city, road or public place"
          maxLength={120}
        />

        <button
          type="submit"
          disabled={
            loading ||
            !apiKey ||
            query.trim().length < 2
          }
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <p className="ca-search-error" role="alert">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="ca-search-results">
          <p>Public place results</p>

          {results.map((place, index) => (
            <button
              type="button"
              key={`${place.id ?? "place"}-${index}`}
              onClick={() => handleChoose(place)}
            >
              <MapPin size={16} />
              <span>{place.label}</span>
            </button>
          ))}
        </div>
      )}

      <p className="ca-search-hint">
        Public place search is separate from
        registered household records.
      </p>
    </div>
  );
}
