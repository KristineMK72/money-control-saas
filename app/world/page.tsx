import BenWorldMap from "@/components/BenWorldMap";
import BenWorldWeatherOverlay from "@/components/BenWorldWeatherOverlay";
import TreasuryCoinMenu from "@/components/TreasuryCoinMenu";

export default function WorldPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080706] p-3 md:p-6">
      <BenWorldWeatherOverlay fog storm={false} />
      <TreasuryCoinMenu />

      <div className="relative z-10 mx-auto max-w-6xl">
        <BenWorldMap />
      </div>
    </main>
  );
}
