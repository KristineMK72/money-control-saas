"use client";

import { Text } from "@react-three/drei";

export default function CoordinateGrid() {
  const lines = [];

  const SIZE = 240;
  const STEP = 10;

  // Vertical lines (X)
  for (let x = -SIZE; x <= SIZE; x += STEP) {
    lines.push(
      <group key={`x-${x}`}>
        <mesh position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, SIZE * 2]} />
          <meshBasicMaterial
            color={x === 0 ? "#ff4444" : "#444444"}
            transparent
            opacity={0.28}
          />
        </mesh>

        <Text
          position={[x, 0.05, -SIZE]}
          fontSize={1.2}
          color="#888"
          anchorX="center"
        >
          {x}
        </Text>
      </group>
    );
  }

  // Horizontal lines (Z)
  for (let z = -SIZE; z <= SIZE; z += STEP) {
    lines.push(
      <group key={`z-${z}`}>
        <mesh position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SIZE * 2, 0.08]} />
          <meshBasicMaterial
            color={z === 0 ? "#44ff44" : "#444444"}
            transparent
            opacity={0.28}
          />
        </mesh>

        <Text
          position={[-SIZE, 0.05, z]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={1.2}
          color="#888"
          anchorX="center"
        >
          {z}
        </Text>
      </group>
    );
  }

  return <>{lines}</>;
}
