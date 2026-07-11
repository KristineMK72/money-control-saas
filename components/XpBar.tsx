import { getLevelProgress } from "@/lib/xp";

type XpBarProps = {
  xp: number;
  level: number;
};

export default function XpBar({ xp, level }: XpBarProps) {
  const progress = getLevelProgress(xp ?? 0, level ?? 1);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white/85 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            AskBen Level
          </p>
          <p className="text-2xl font-black text-slate-900">
            Level {level ?? 1}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-emerald-700">{xp ?? 0} XP</p>
          <p className="text-xs text-slate-500">
            {Math.max(0, progress.nextLevelXp - (xp ?? 0))} XP to next level
          </p>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Log bills, payments, income, and wins to level up Ben.
      </p>
    </div>
  );
}
