"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMoneyStore } from "@/lib/money/store";
import {
  initAudio,
  isAudioReady,
  playClick,
  setSoundEnabled,
} from "@/lib/sounds";

export default function AppInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseBrowserClient();
  const setAll = useMoneyStore((s) => s.setAll);
  const reset = useMoneyStore((s) => s.reset);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        reset();
        return;
      }

      const [bills, debts, income, spend, payments, profile] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("debts").select("*").eq("user_id", user.id),
        supabase.from("income_entries").select("*").eq("user_id", user.id),
        supabase.from("spend_entries").select("*").eq("user_id", user.id),
        supabase.from("payments").select("*").eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("sound_effects")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (!profile.error) {
        setSoundEnabled(profile.data?.sound_effects ?? true);
      }

      setAll({
        buckets: bills.data ?? [],
        debts: debts.data ?? [],
        income: income.data ?? [],
        spend: spend.data ?? [],
        payments: payments.data ?? [],
      });
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setAll, reset]);

  useEffect(() => {
    let active = true;

    const removeUnlockListeners = () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("touchend", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    const unlock = () => {
      void initAudio().then((ready) => {
        if (active && ready) removeUnlockListeners();
      });
    };
    const click = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("button, a")) playClick();
    };
    const restore = () => {
      if (document.visibilityState === "visible" && !isAudioReady()) unlock();
    };

    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("touchend", unlock, true);
    window.addEventListener("keydown", unlock, true);
    window.addEventListener("pageshow", restore);
    document.addEventListener("visibilitychange", restore);
    document.addEventListener("click", click);
    return () => {
      active = false;
      removeUnlockListeners();
      window.removeEventListener("pageshow", restore);
      document.removeEventListener("visibilitychange", restore);
      document.removeEventListener("click", click);
    };
  }, []);

  return <>{children}</>;
}
