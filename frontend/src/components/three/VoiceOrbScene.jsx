import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { AuroraOrb } from './AuroraOrb';
import { ParticleRing } from './ParticleRing';
import { RippleRings } from './RippleRings';
import { SparkleParticles } from './SparkleParticles';

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#667eea" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#764ba2" />

      <Environment preset="night" />

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
        <AuroraOrb />
      </Float>

      <ParticleRing />
      <RippleRings />
      <SparkleParticles />

      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.0005, 0.0005]}
        />
      </EffectComposer>
    </>
  );
}

export function VoiceOrbScene({ size = 400 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'radial-gradient(circle, #0a0a1a 0%, #050508 100%)',
        boxShadow: '0 0 80px rgba(102, 126, 234, 0.15), 0 0 160px rgba(118, 75, 162, 0.08)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
