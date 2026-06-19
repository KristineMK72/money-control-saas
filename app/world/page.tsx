import BenWorldMap from "@/components/BenWorldMap";
import TreasuryCoinMenu from "@/components/TreasuryCoinMenu";

export default function WorldPage() {
  return (
    <main className="min-h-screen bg-[#080706] p-3 md:p-6">
      <TreasuryCoinMenu />

      <div className="mx-auto max-w-6xl">
        <BenWorldMap />
      </div>
    </main>
  );
}
