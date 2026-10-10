
import { useEffect, useRef } from "react";
import { Marker } from "maplibre-gl";

export default function HouseholdMarker({
  map,
  location,
  selected,
  onSelect,
}) {
  const markerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const button = document.createElement("button");

    button.type = "button";
    button.className = "ca-household-marker";
    button.textContent = "⌂";
    button.title =
      `Registered location ${location.location_code}`;

    button.setAttribute(
      "aria-label",
      `Select registered location ${location.location_code}`
    );

    // Prevent a marker click from also selecting
    // an ordinary point on the map.
    const handleClick = (event) => {
      event.stopPropagation();
      onSelect(location.id);
    };

    button.addEventListener("click", handleClick);

    const marker = new Marker({
      element: button,
      anchor: "bottom",
    })
      .setLngLat([
        location.longitude,
        location.latitude,
      ])
      .addTo(map);

    markerRef.current = marker;
    buttonRef.current = button;

    return () => {
      button.removeEventListener("click", handleClick);
      marker.remove();
      markerRef.current = null;
      buttonRef.current = null;
    };
  }, [
    map,
    location.id,
    location.location_code,
    location.latitude,
    location.longitude,
    onSelect,
  ]);

  useEffect(() => {
    if (!buttonRef.current) return;

    buttonRef.current.classList.toggle(
      "is-selected",
      selected
    );

    buttonRef.current.setAttribute(
      "aria-pressed",
      String(selected)
    );
  }, [selected]);

  return null;
}
