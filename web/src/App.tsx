import { Canvas } from '@react-three/fiber'
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei'
import { useEffect, useState } from 'react'
import * as THREE from 'three'

declare global {
  interface Window {
    __arc?: unknown
  }
}

interface ArcEntry {
  code: string
  name: string
  meshes: string[]
}

const errors: string[] = []
window.addEventListener('error', (e) => errors.push(e.message))

function Arc({ arc }: { arc: ArcEntry }) {
  const gltfs = useGLTF(arc.meshes.map((m) => `/arcs/${arc.code}/${m}`))
  useEffect(() => {
    const meshes: { name: string; verts: number }[] = []
    const bones: string[] = []
    for (const { scene } of gltfs)
      scene.traverse((o) => {
        if ((o as THREE.Bone).isBone) bones.push(o.name)
        const m = o as THREE.Mesh
        if (m.isMesh) {
          m.material = new THREE.MeshStandardMaterial({ color: '#9aa4ad', flatShading: true })
          meshes.push({ name: o.name, verts: m.geometry.attributes.position.count })
        }
      })
    window.__arc = { id: arc.code, name: arc.name, ready: true, meshes, boneCount: bones.length, bones, errors }
  }, [gltfs, arc])
  return (
    <>
      {gltfs.map((g, i) => (
        <primitive key={i} object={g.scene} />
      ))}
    </>
  )
}

export default function App() {
  const [index, setIndex] = useState<ArcEntry[]>([])
  const [code, setCode] = useState(new URLSearchParams(location.search).get('arc') ?? 'HeavyDroneMissile')
  useEffect(() => {
    fetch('/arcs/index.json').then((r) => r.json()).then(setIndex)
  }, [])
  useEffect(() => {
    history.replaceState(null, '', `?arc=${code}`)
  }, [code])
  const arc = index.find((a) => a.code === code)
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#14171a', color: '#cfd6dc', font: '14px system-ui' }}>
      <nav style={{ width: 190, overflowY: 'auto', padding: 8, borderRight: '1px solid #262b30' }}>
        {index.map((a) => (
          <div
            key={a.code}
            onClick={() => {
              window.__arc = undefined
              setCode(a.code)
            }}
            style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4, background: a.code === code ? '#2a3138' : undefined }}
          >
            {a.name}
          </div>
        ))}
      </nav>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 2, 3] }} gl={{ preserveDrawingBuffer: true }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={2} />
          {arc && (
            <Bounds key={arc.code} fit clip observe margin={1.4}>
              <Arc arc={arc} />
            </Bounds>
          )}
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    </div>
  )
}
