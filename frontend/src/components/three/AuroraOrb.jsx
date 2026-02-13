import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVoiceStore } from '../../store/voice-store';

// Pre-allocated temp color to avoid GC pressure in useFrame
const _tmpColor = new THREE.Color();

// Vertex shader for blob deformation
const vertexShader = `
  uniform float uTime;
  uniform float uAudioLevel;
  uniform float uStateIntensity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vNormal = normal;

    float baseFreq = 1.5;
    float baseAmp = 0.15;
    float audioFreq = 3.0 + uAudioLevel * 4.0;
    float audioAmp = uAudioLevel * 0.4 * uStateIntensity;

    float noise1 = snoise(position * baseFreq + uTime * 0.3);
    float noise2 = snoise(position * audioFreq + uTime * 0.8) * audioAmp;
    float noise3 = snoise(position * 2.0 + uTime * 0.5) * 0.1;

    float displacement = noise1 * baseAmp + noise2 + noise3;
    vDisplacement = displacement;

    vec3 newPosition = position + normal * displacement;
    vPosition = newPosition;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Fragment shader for aurora gradient
const fragmentShader = `
  uniform float uTime;
  uniform float uAudioLevel;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;
  uniform float uStateIntensity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);

    float t1 = sin(vPosition.x * 2.0 + uTime * 0.5) * 0.5 + 0.5;
    float t2 = cos(vPosition.y * 2.0 + uTime * 0.7) * 0.5 + 0.5;
    float t3 = sin(vPosition.z * 2.0 + uTime * 0.3) * 0.5 + 0.5;

    vec3 color = mix(uColor1, uColor2, t1);
    color = mix(color, uColor3, t2 * 0.5);
    color = mix(color, uColor4, t3 * 0.3);

    float brightness = 0.8 + vDisplacement * 0.5 + uAudioLevel * 0.3;
    color *= brightness;
    color += fresnel * uColor3 * (0.5 + uAudioLevel * 0.5);
    color *= 0.8 + uStateIntensity * 0.4;

    gl_FragColor = vec4(color, 0.95);
  }
`;

// Articulotor color scheme — indigo/purple palette
const stateColors = {
  idle: {
    color1: '#667eea', // Indigo (our accent)
    color2: '#764ba2', // Purple (our accent)
    color3: '#a855f7', // Violet
    color4: '#3b82f6', // Blue
  },
  listening: {
    color1: '#06b6d4', // Cyan
    color2: '#667eea', // Indigo
    color3: '#ec4899', // Pink
    color4: '#764ba2', // Purple
  },
  processing: {
    color1: '#764ba2', // Purple
    color2: '#a855f7', // Violet
    color3: '#667eea', // Indigo
    color4: '#7c3aed', // Deeper violet
  },
  speaking: {
    color1: '#ec4899', // Pink
    color2: '#f97316', // Orange
    color3: '#a855f7', // Violet
    color4: '#f43f5e', // Rose
  },
};

const stateIntensity = {
  idle: 0.3,
  listening: 1.0,
  processing: 0.7,
  speaking: 1.0,
};

export function AuroraOrb() {
  const meshRef = useRef(null);
  const { state, audioLevel } = useVoiceStore();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAudioLevel: { value: 0 },
      uStateIntensity: { value: 0.3 },
      uColor1: { value: new THREE.Color(stateColors.idle.color1) },
      uColor2: { value: new THREE.Color(stateColors.idle.color2) },
      uColor3: { value: new THREE.Color(stateColors.idle.color3) },
      uColor4: { value: new THREE.Color(stateColors.idle.color4) },
    }),
    []
  );

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const material = meshRef.current.material;
    material.uniforms.uTime.value += delta;

    // Smooth audio level
    material.uniforms.uAudioLevel.value +=
      (audioLevel - material.uniforms.uAudioLevel.value) * 0.1;

    // Smooth intensity
    const targetIntensity = stateIntensity[state];
    material.uniforms.uStateIntensity.value +=
      (targetIntensity - material.uniforms.uStateIntensity.value) * 0.05;

    // Smooth color transitions (reuse temp color to avoid GC pressure)
    const colors = stateColors[state];
    material.uniforms.uColor1.value.lerp(_tmpColor.set(colors.color1), 0.02);
    material.uniforms.uColor2.value.lerp(_tmpColor.set(colors.color2), 0.02);
    material.uniforms.uColor3.value.lerp(_tmpColor.set(colors.color3), 0.02);
    material.uniforms.uColor4.value.lerp(_tmpColor.set(colors.color4), 0.02);

    // Gentle rotation
    meshRef.current.rotation.y += delta * 0.1;
    meshRef.current.rotation.x = Math.sin(material.uniforms.uTime.value * 0.2) * 0.1;
  });

  return (
    <mesh ref={meshRef} scale={0.7}>
      <icosahedronGeometry args={[1, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
      />
    </mesh>
  );
}
