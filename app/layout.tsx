import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Inter, Cormorant_Garamond, IM_Fell_English } from "next/font/google";

import AppInitializer from "@/components/AppInitializer";
import BenWorldBackground from "@/components/BenWorldBackground";
import SwipeHeader from "@/components/SwipeHeader";

import MobileMenu from "@/components/MobileMenu";
import LogoutButton from "@/components/LogoutButton";
import UserGreeting from "@/components/UserGreeting";

import BenPersona from "@/components/BenPersona";
import GovernorHeader from "@/components/GovernorHeader";
import GlobalBenAdvisor from "@/components/GlobalBenAdvisor";
import InstallBanner from "@/components/InstallBanner";
import OnboardingTour from "@/components/OnboardingTour";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const imFell = IM_Fell_English({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-im-fell",
});

export const metadata: Metadata = {
  title: "AskBen",
  description: "Financial triage without judgment.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/world", label: "Franklin's Landing" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/income", label: "Income" },
  { href: "/spend", label: "Spend" },
  { href: "/bills", label: "Bills" },
  { href: "/debt", label: "Debt" },
  { href: "/payments", label: "Payments" },
  { href: "/forecast", label: "Forecast" },
  { href: "/chat", label: "Ask Ben" },
];

function NavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 font-bold text-white backdrop-blur"
    >
      {children}
    </a>
  );
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${cormorant.variable} ${imFell.variable} app-shell`}
      >
        <BenWorldBackground />

        <AppInitializer>
          <SwipeHeader>
            <div className="mx-auto max-w-7xl px-4 py-3">

              <div className="flex items-center justify-between gap-3">

                <a
                  href="/"
                  className="flex items-center gap-3 text-white no-underline"
                >
                  <img
                    src="/ben.png"
                    alt="AskBen"
                    className="h-14 w-14 rounded-xl object-cover border border-white/20"
                  />

                  <div>
                    <div className="text-4xl font-black">
                      AskBen
                    </div>

                    <div className="text-xs text-white/70">
                      Financial triage without judgment
                    </div>
                  </div>
                </a>

                <div className="flex items-center gap-2">

                  <a
                    href="/login"
                    className="rounded-xl bg-white/10 px-5 py-3 font-bold text-white"
                  >
                    Login
                  </a>

                  <a
                    href="/signup"
                    className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black"
                  >
                    Sign Up
                  </a>

                  <a
                    href="/settings"
                    className="rounded-xl bg-white/10 px-4 py-3 text-white"
                  >
                    ⚙️
                  </a>

                  <MobileMenu />

                  <div className="hidden sm:block">
                    <UserGreeting />
                  </div>

                  <LogoutButton />
                </div>
              </div>

              <nav className="mt-4 hidden md:flex gap-2 overflow-x-auto">
                {navLinks.map((link) => (
                  <NavLink key={link.href} href={link.href}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>

            </div>

            <BenPersona />
          </SwipeHeader>

          <GovernorHeader />

          <GlobalBenAdvisor />

          <main className="relative z-10 min-h-[70vh]">
            {children}
          </main>

          <div className="mx-auto max-w-4xl px-4">
            <InstallBanner />
          </div>

          <OnboardingTour />
        </AppInitializer>
      </body>
    </html>
  );
}
