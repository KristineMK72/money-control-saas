"use client";

function getTimeMode() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export default function BenWorldWeatherOverlay({
  storm = false,
  fog = true,
}: {
  storm?: boolean;
  fog?: boolean;
}) {
  const mode = getTimeMode();

  return (
    <div className={`benworld-weather benworld-${mode}`}>
      <div className="cloud-layer cloud-one" />
      <div className="cloud-layer cloud-two" />

      {fog && <div className="fog-layer" />}
      {storm && <div className="storm-flash" />}
    </div>
  );
}
