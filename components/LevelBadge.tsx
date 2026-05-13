type LevelBadgeProps = {
  level: number;
};

export default function LevelBadge({
  level,
}: LevelBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 shadow-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">
        {level}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-emerald-700">
          AskBen Level
        </p>

        <p className="text-sm font-bold text-emerald-900">
          Level {level}
        </p>
      </div>
    </div>
  );
}
