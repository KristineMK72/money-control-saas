"use client";

import { useEffect, useState } from "react";

const BENWORLD_BACKGROUNDS = [
  "/backgrounds/20260512_170124302_iOS.png",
  "/backgrounds/20260512_170235877_iOS.png",
  "/backgrounds/20260512_170359538_iOS.png",
  "/backgrounds/20260512_170458190_iOS.png",
  "/backgrounds/20260512_170613584_iOS.png",
  "/backgrounds/4A6B5519-9033-4B9B-92A2-BF08324142A4.png",
  "/backgrounds/580358FB-7F70-4074-9E72-3D23C1B5CD2C.png",
  "/backgrounds/6EB0EEEE-3150-4D90-9895-7E9789787E03.png",
  "/backgrounds/8521A659-2A7E-47F5-B275-ADFB9697FA8F.png",
  "/backgrounds/92825F5D-428A-4DEA-9242-D5FC60A82BF3.png",
  "/backgrounds/A3185024-4000-48DF-A1F1-0D811911EC2A.png",
  "/backgrounds/C66102D8-171F-4604-A693-0B734C48BFDC.png",
];

export default function BenWorldBackground() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * BENWORLD_BACKGROUNDS.length));

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % BENWORLD_BACKGROUNDS.length);
    }, 45000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -30,
          backgroundImage: `url(${BENWORLD_BACKGROUNDS[index]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transition: "background-image 1.2s ease-in-out",
        }}
      />

      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -20,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.30), rgba(255,255,255,0.18))",
          pointerEvents: "none",
        }}
      />
    </>
  );
}
