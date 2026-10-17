import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { LAYER_COLOR, buildTree, splitByBone, type Layer, type PartInfo, type TreeNode } from './parts'
import { useView } from './store'
import { shotsToBreak, type Weapon } from './damage'

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
interface PartsFile {
  parts: PartInfo[]
}

const initial = new URLSearchParams(location.search)
const errors: string[] = []
window.addEventListener('error', (e) => errors.push(e.message))

const solid = Object.fromEntries(
  Object.entries(LAYER_COLOR).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, flatShading: true })]),
) as Record<Layer, THREE.MeshStandardMaterial>
const ghostMat = new THREE.MeshBasicMaterial({ color: '#9fb6c8', transparent: true, opacity: 0.12, depthWrite: false })
const selectedMat = new THREE.MeshStandardMaterial({ color: '#ff5a3c', flatShading: true, emissive: '#601808' })

const isHidden = (p: PartInfo, hidden: Set<string>, strip: boolean) => hidden.has(p.bone) || (strip && p.layer === 'armor')

function Arc({ arc, parts, onTree }: { arc: ArcEntry; parts: PartInfo[]; onTree: (t: TreeNode[]) => void }) {
  const gltfs = useGLTF(arc.meshes.map((m) => `/arcs/${arc.code}/${m}`))
  const { hidden, selected, ghost, strip, select } = useView()
  const byBone = useMemo(() => {
    const m = new Map<string, THREE.SkinnedMesh[]>()
    for (const g of gltfs) for (const [k, v] of splitByBone(g.scene)) m.set(k, [...(m.get(k) ?? []), ...v])
    return m
  }, [gltfs])
  const info = useMemo(() => new Map(parts.map((p) => [p.bone, p])), [parts])

  useEffect(() => {
    onTree(buildTree(parts, new Map([...byBone].map(([k, v]) => [k, v.reduce((s, m) => s + m.userData.tris, 0)]))))
  }, [byBone, parts, onTree])

  useEffect(() => {
    const state: Record<string, unknown>[] = []
    for (const [bone, meshes] of byBone) {
      const p = info.get(bone)
      const hide = p ? isHidden(p, hidden, strip) : false
      for (const m of meshes) {
        m.visible = !hide || ghost
        m.material = hide ? ghostMat : bone === selected ? selectedMat : solid[p?.layer ?? 'component']
        m.raycast = hide ? () => {} : THREE.Mesh.prototype.raycast
      }
      state.push({ bone, layer: p?.layer, armor: p?.armor, hp: p?.hp, tris: meshes[0].userData.tris, visible: !hide, ghosted: hide && ghost })
    }
    window.__arc = { id: arc.code, name: arc.name, ready: true, selected, strip, ghost, hidden: [...hidden], partCount: state.length, parts: state, errors }
  }, [byBone, info, hidden, selected, ghost, strip, arc])

  return (
    <>
      {gltfs.map((g, i) => (
        <primitive
          key={i}
          object={g.scene}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            select(e.object.userData.bone ?? null)
          }}
        />
      ))}
    </>
  )
}

function Row({ n, depth }: { n: TreeNode; depth: number }) {
  const { hidden, selected, strip, toggle, select } = useView()
  const off = isHidden(n.part, hidden, strip)
  return (
    <>
      <div
        onClick={() => select(n.part.bone)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '1px 4px', paddingLeft: 4 + depth * 12, cursor: 'pointer',
          background: selected === n.part.bone ? '#2a3138' : undefined, opacity: off ? 0.4 : 1,
        }}
      >
        <span style={{ width: 8, height: 8, flex: 'none', background: LAYER_COLOR[n.part.layer] }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={n.part.bone}>{n.part.bone}</span>
        {n.part.armor && <span style={{ color: '#8a949d', fontSize: 11 }}>{n.part.armor}</span>}
        <span style={{ color: '#cfd6dc', fontSize: 11, minWidth: 34, textAlign: 'right' }}>{n.part.hp ?? '–'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); toggle(n.part.bone) }}
          style={{ all: 'unset', cursor: 'pointer', width: 18, textAlign: 'center' }}
          title="Hide / show (H)"
        >
          {hidden.has(n.part.bone) ? '○' : '●'}
        </button>
      </div>
      {n.children.map((c) => <Row key={c.part.bone} n={c} depth={depth + 1} />)}
    </>
  )
}

function Shots({ w, sel, parts }: { w: Weapon; sel: PartInfo; parts: PartInfo[] }) {
  const r = shotsToBreak(w, sel, parts)
  const n = (v: number | null) => (v === null ? '–' : v)
  return (
    <div style={{ marginTop: 4 }}>
      <div>{w.id}: {n(r.exposed ?? r.withArmor)} hit(s) to break{r.exposed !== null && r.withArmor !== null ? ` (${n(r.withArmor)} with armour on)` : ''} <span style={{ color: '#8a949d' }}>· estimate</span></div>
      {r.armor.length > 0 && <div style={{ color: '#8a949d' }}>plates: {r.armor.map((p) => `${p.bone} ${p.hits}`).join(', ')}</div>}
    </div>
  )
}

function Panel({ tree, parts }: { tree: TreeNode[]; parts: PartInfo[] }) {
  const { strip, ghost, setStrip, setGhost, reset, selected, weapon, setWeapon } = useView()
  const [weapons, setWeapons] = useState<Weapon[]>([])
  useEffect(() => {
    fetch('/data/weapons.json').then((r) => r.json()).then(setWeapons).catch(() => {})
  }, [])
  const w = weapons.find((x) => x.id === weapon)
  const sel = parts.find((p) => p.bone === selected)
  const legend = Object.entries(LAYER_COLOR)
  const sum = (l: Layer) => parts.filter((p) => p.layer === l).reduce((s, p) => s + (p.hp ?? 0), 0)
  const totals = `HP pools: armour ${sum('armor')} · weak point ${sum('weakpoint')} · frame ${sum('frame')} · components ${sum('component')} (sum of parts, not kill threshold)`
  return (
    <aside style={{ width: 300, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #262b30' }}>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4, borderBottom: '1px solid #262b30' }}>
        <label><input type="checkbox" checked={strip} onChange={(e) => setStrip(e.target.checked)} /> Strip armour</label>
        <label><input type="checkbox" checked={ghost} onChange={(e) => setGhost(e.target.checked)} /> Show removed as ghost</label>
        <div style={{ fontSize: 12, color: '#8a949d' }}>{totals}</div>
        <select value={weapon ?? ''} onChange={(e) => setWeapon(e.target.value || null)}>
          <option value="">Weapon…</option>
          {weapons.map((x) => <option key={x.id} value={x.id}>{x.id.replace(/_01$/, '').replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={reset} style={{ alignSelf: 'flex-start' }}>Reset</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#8a949d' }}>
          {legend.map(([k, c]) => <span key={k}><span style={{ display: 'inline-block', width: 8, height: 8, background: c, marginRight: 3 }} />{k}</span>)}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', fontSize: 12 }}>{tree.map((n) => <Row key={n.part.bone} n={n} depth={0} />)}</div>
      {sel && (
        <div style={{ padding: 8, borderTop: '1px solid #262b30', fontSize: 12, wordBreak: 'break-word' }}>
          <b>{sel.bone}</b> · {sel.layer}{sel.armor ? ` (${sel.armor})` : ''} · {sel.resist}
          <div>HP {sel.hp ?? 'untracked'}{sel.hpQuery ? <span style={{ color: '#8a949d' }}> · from “{sel.hpQuery.replace(/Part\.Decorator\./g, '')}” · game data</span> : null}</div>
          {w && <Shots w={w} sel={sel} parts={parts} />}
          {sel.attacks?.map((x, i) => <div key={i}>Attack: {x.damage} {x.type}</div>)}
          <div style={{ color: '#8a949d' }}>{sel.tags.map((t) => t.replace('Part.Decorator.', '')).join(', ') || 'no tags'}</div>
        </div>
      )}
    </aside>
  )
}

export default function App() {
  const [index, setIndex] = useState<ArcEntry[]>([])
  const [code, setCode] = useState(new URLSearchParams(location.search).get('arc') ?? 'HeavyDroneMissile')
  const [parts, setParts] = useState<PartInfo[] | null>(null)
  const [tree, setTree] = useState<TreeNode[]>([])
  const reset = useView((s) => s.reset)
  useEffect(() => {
    fetch('/arcs/index.json').then((r) => r.json()).then(setIndex)
  }, [])
  useEffect(() => {
    history.replaceState(null, '', `?arc=${code}`)
    setParts(null)
    setTree([])
    reset()
    if (code === initial.get('arc')) {
      // ?strip=1&ghost=1&hide=a,b&sel=bone seeds view state (probes, shared links)
      useView.setState({
        strip: initial.get('strip') === '1',
        ghost: initial.get('ghost') === '1',
        hidden: new Set(initial.get('hide')?.split(',').filter(Boolean)),
        selected: initial.get('sel'),
      })
    }
    fetch(`/arcs/${code}/parts.json`).then((r) => r.json()).then((f: PartsFile) => setParts(f.parts))
  }, [code, reset])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const s = useView.getState()
      if (e.key.toLowerCase() === 'h' && s.selected) s.toggle(s.selected)
      if (e.key === 'Escape') s.select(null)
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [])
  const arc = index.find((a) => a.code === code)
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#14171a', color: '#cfd6dc', font: '14px system-ui' }}>
      <nav style={{ width: 170, overflowY: 'auto', padding: 8, borderRight: '1px solid #262b30' }}>
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
        <Canvas camera={{ position: [3, 2, 3] }} gl={{ preserveDrawingBuffer: true }} onPointerMissed={() => useView.getState().select(null)}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={2} />
          {arc && parts && (
            <Bounds key={arc.code} fit clip observe margin={1.4}>
              <Arc arc={arc} parts={parts} onTree={setTree} />
            </Bounds>
          )}
          <OrbitControls makeDefault />
        </Canvas>
      </div>
      {parts && <Panel tree={tree} parts={parts} />}
    </div>
  )
}
