import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVoiceStore } from '../../store/voice-store';

const SPARKLE_COUNT = 30;

// Pre-generate random data outside component (pure)
function createSparkleData() {
  const positions = new Float32Array(SPARKLE_COUNT * 3);
  const velocities = new Float32Array(SPARKLE_COUNT * 3);
  const lifetimes = new Float32Array(SPARKLE_COUNT);
  const maxLifetimes = new Float32Array(SPARKLE_COUNT);
  const sizes = new Float32Array(SPARKLE_COUNT);
  const displaySizes = new Float32Array(SPARKLE_COUNT);

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    lifetimes[i] = 0;
    maxLifetimes[i] = 1 + Math.random() * 1.5;
    sizes[i] = Math.random() * 0.15 + 0.05;
    displaySizes[i] = 0;
  }

  return { positions, velocities, lifetimes, maxLifetimes, sizes, displaySizes };
}

function createUniforms() {
  return { uTime: { value: 0 } };
}

export function SparkleParticles() {
  const pointsRef = useRef(null);
  const { state, audioLevel } = useVoiceStore();
  const lastStateRef = useRef(state);
  const burstTimeRef = useRef(0);

  // useState lazy init — React Compiler allows impure initializers here
  const [data] = useState(createSparkleData);
  const { positions, velocities, lifetimes, maxLifetimes, sizes, displaySizes } = data;

  const [uniforms] = useState(createUniforms);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(displaySizes, 1));
    return geo;
  }, [positions, displaySizes]);

  const spawnBurst = (count) => {
    if (!pointsRef.current) return;
    const positionAttr = pointsRef.current.geometry.attributes.position;

    for (let i = 0; i < count && i < SPARKLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 2;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      positionAttr.array[i * 3] = velocities[i * 3] * 0.3;
      positionAttr.array[i * 3 + 1] = velocities[i * 3 + 1] * 0.3;
      positionAttr.array[i * 3 + 2] = velocities[i * 3 + 2] * 0.3;

      lifetimes[i] = maxLifetimes[i];
    }
    positionAttr.needsUpdate = true;
  };

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const geo = pointsRef.current.geometry;
    const positionAttr = geo.attributes.position;
    const sizeAttr = geo.attributes.size;

    uniforms.uTime.value += delta;
    burstTimeRef.current += delta;

    if (state !== lastStateRef.current) {
      if (state === 'speaking' || state === 'listening') {
        spawnBurst(15);
      }
      lastStateRef.current = state;
    }

    if (state === 'speaking' && burstTimeRef.current > 0.3 && audioLevel > 0.3) {
      spawnBurst(5);
      burstTimeRef.current = 0;
    }

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const i3 = i * 3;

      if (lifetimes[i] > 0) {
        lifetimes[i] -= delta;

        positionAttr.array[i3] += velocities[i3] * delta;
        positionAttr.array[i3 + 1] += velocities[i3 + 1] * delta;
        positionAttr.array[i3 + 2] += velocities[i3 + 2] * delta;

        velocities[i3] *= 0.98;
        velocities[i3 + 1] *= 0.98;
        velocities[i3 + 2] *= 0.98;

        const lifeRatio = lifetimes[i] / maxLifetimes[i];
        sizeAttr.array[i] = sizes[i] * lifeRatio;
      } else {
        sizeAttr.array[i] = 0;
      }
    }

    positionAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  const vertexShader = `
    attribute float size;
    varying float vAlpha;
    void main() {
      vAlpha = size > 0.01 ? 1.0 : 0.0;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying float vAlpha;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
      vec3 color = vec3(1.0, 0.95, 0.8);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
