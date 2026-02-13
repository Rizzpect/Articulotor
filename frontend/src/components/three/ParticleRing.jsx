import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVoiceStore } from '../../store/voice-store';

const PARTICLE_COUNT = 150;

// Pure initialization outside component
function createParticleData() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const radius = 2.2 + Math.random() * 0.5;
    const height = (Math.random() - 0.5) * 1.5;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    sizes[i] = Math.random() * 0.08 + 0.02;
  }

  return { positions, sizes };
}

function createUniforms() {
  return {
    uTime: { value: 0 },
    uAudioLevel: { value: 0 },
    uColor1: { value: new THREE.Color('#667eea') },
    uColor2: { value: new THREE.Color('#764ba2') },
  };
}

export function ParticleRing() {
  const pointsRef = useRef(null);
  const { state, audioLevel } = useVoiceStore();

  // useState lazy init — React Compiler allows impure initializers here
  const [data] = useState(createParticleData);
  const { positions, sizes } = data;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, sizes]);

  const [uniforms] = useState(createUniforms);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const geo = pointsRef.current.geometry;
    const positionAttr = geo.attributes.position;

    uniforms.uTime.value += delta;
    uniforms.uAudioLevel.value +=
      (audioLevel - uniforms.uAudioLevel.value) * 0.1;

    const rotationSpeed =
      state === 'listening' ? 0.8 : state === 'processing' ? 1.2 : 0.2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      let x = positionAttr.array[i3];
      let y = positionAttr.array[i3 + 1];
      let z = positionAttr.array[i3 + 2];

      const angle = delta * rotationSpeed;
      const newX = x * Math.cos(angle) - z * Math.sin(angle);
      const newZ = x * Math.sin(angle) + z * Math.cos(angle);

      const wobble = audioLevel * 0.1;
      y += Math.sin(uniforms.uTime.value * 2 + i) * wobble * delta;

      const radius = Math.sqrt(newX * newX + newZ * newZ);
      if (radius < 2.0 || radius > 3.0) {
        const targetRadius = 2.5;
        const factor = targetRadius / radius;
        positionAttr.array[i3] = newX * factor;
        positionAttr.array[i3 + 2] = newZ * factor;
      } else {
        positionAttr.array[i3] = newX;
        positionAttr.array[i3 + 2] = newZ;
      }

      if (Math.abs(y) > 1.5) {
        y = Math.sign(y) * 1.5 * 0.9;
      }
      positionAttr.array[i3 + 1] = y;
    }

    positionAttr.needsUpdate = true;
  });

  const vertexShader = `
    uniform float uTime;
    uniform float uAudioLevel;
    attribute float size;
    varying float vAlpha;

    void main() {
      vAlpha = 0.4 + uAudioLevel * 0.4;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + uAudioLevel * 0.5);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uTime;
    varying float vAlpha;

    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
      vec3 color = mix(uColor1, uColor2, sin(uTime + gl_PointCoord.x * 3.14) * 0.5 + 0.5);
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
