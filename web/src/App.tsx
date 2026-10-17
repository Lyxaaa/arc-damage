import { Canvas } from '@react-three/fiber'
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei'
import { useEffect } from 'react'
import * as THREE from 'three'

declare global {
  interface Window {
    __arc?: unknown
  }
}

const errors: string[] = []
window.addEventListener('error', (e) => errors.push(e.message))

function Arc({ id }: { id: string }) {
  const { scene } = useGLTF(`/arcs/${id}.glb`)
  useEffect(() => {
    const meshes: { name: string; verts: number }[] = []
    const bones: string[] = []
    scene.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones.push(o.name)
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.material = new THREE.MeshStandardMaterial({ color: '#9aa4ad', flatShading: true })
        meshes.push({ name: o.name, verts: m.geometry.attributes.position.count })
      }
    })
    window.__arc = { id, ready: true, meshes, boneCount: bones.length, bones, errors }
  }, [scene, id])
  return <primitive object={scene} />
}

export default function App() {
  const id = new URLSearchParams(location.search).get('arc') ?? 'HeavyDroneMissile'
  return (
    <Canvas camera={{ position: [3, 2, 3] }} gl={{ preserveDrawingBuffer: true }}>
      <color attach="background" args={['#14171a']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={2} />
      <Bounds fit clip observe margin={1.4}>
        <Arc id={id} />
      </Bounds>
      <OrbitControls makeDefault />
    </Canvas>
  )
}
