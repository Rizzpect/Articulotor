import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVoiceStore } from '../../store/voice-store';

const _tmpColor = new THREE.Color();
const RING_COUNT = 5;

export function RippleRings() {
  const groupRef = useRef(null);
  const ringsRef = useRef([]);
  const { state, audioLevel } = useVoiceStore();

  const ringMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.3 },
        uColor: { value: new THREE.Color('#667eea') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5)) * 2.0;
          float ring = smoothstep(0.9, 1.0, dist) * smoothstep(1.0, 0.95, dist);
          ring = max(ring, smoothstep(0.0, 0.05, dist) * smoothstep(0.1, 0.05, dist));
          float alpha = ring * uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  const rippleStates = useMemo(
    () =>
      Array.from({ length: RING_COUNT }, (_, i) => ({
        scale: 0.54 + i * 0.29,
        opacity: 0.3 - i * 0.05,
        speed: 0.3 + i * 0.1,
      })),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const isActive = state === 'listening' || state === 'speaking';
    const intensity = isActive ? 1 + audioLevel * 0.5 : 0.3;

    ringsRef.current.forEach((ring, i) => {
      if (!ring) return;

      const ripple = rippleStates[i];
      const material = ring.material;

      if (isActive) {
        ripple.scale += delta * ripple.speed * intensity;
        ripple.opacity -= delta * 0.15 * intensity;

        if (ripple.scale > 4 || ripple.opacity <= 0) {
          ripple.scale = 1;
          ripple.opacity = 0.4;
        }
      } else {
        ripple.scale += (1 + i * 0.3 - ripple.scale) * delta;
        ripple.opacity += (0.15 - ripple.opacity) * delta;
      }

      ring.scale.setScalar(ripple.scale);
      material.uniforms.uOpacity.value = ripple.opacity;

      const targetHex =
        state === 'speaking'
          ? '#ec4899'
          : state === 'listening'
            ? '#06b6d4'
            : '#667eea';
      material.uniforms.uColor.value.lerp(_tmpColor.set(targetHex), delta * 2);
    });

    groupRef.current.rotation.z += delta * 0.1;
  });

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
      {Array.from({ length: RING_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringsRef.current[i] = el;
          }}
          position={[0, 0, 0]}
          material={ringMaterial.clone()}
        >
          <ringGeometry args={[1.8, 2, 64]} />
        </mesh>
      ))}
    </group>
  );
}
