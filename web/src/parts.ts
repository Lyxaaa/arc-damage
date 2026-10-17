import * as THREE from 'three'

export type Layer = 'armor' | 'weakpoint' | 'component' | 'frame' | 'indestructible'

export interface PartInfo {
  bone: string
  parent: string | null
  tags: string[]
  layer: Layer
  armor?: string
  resist: string
  hp?: number
  hpQuery?: string
  attacks?: { type: string; damage: number }[]
}

export const LAYER_COLOR: Record<Layer, string> = {
  armor: '#8d96a0',
  weakpoint: '#e0b13a',
  component: '#4a8fd0',
  frame: '#5b6672',
  indestructible: '#3a4047',
}

/** Splits each SkinnedMesh into one SkinnedMesh per dominant bone (rigid skinning), sharing vertex buffers. */
export function splitByBone(root: THREE.Object3D): Map<string, THREE.SkinnedMesh[]> {
  const out = new Map<string, THREE.SkinnedMesh[]>()
  const skinned: THREE.SkinnedMesh[] = []
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh
    if (!m.isSkinnedMesh) return
    if (m.userData.bone) out.set(m.userData.bone, [...(out.get(m.userData.bone) ?? []), m]) // already split (StrictMode re-run)
    else skinned.push(m)
  })
  for (const sm of skinned) {
    const g = sm.geometry
    const si = g.getAttribute('skinIndex')
    const sw = g.getAttribute('skinWeight')
    const idx = g.index!
    const boneOf = new Array<string>(si.count)
    for (let v = 0; v < si.count; v++) {
      let best = 0
      for (let k = 1; k < 4; k++) if (sw.getComponent(v, k) > sw.getComponent(v, best)) best = k
      boneOf[v] = sm.skeleton.bones[si.getComponent(v, best)].name
    }
    const tris = new Map<string, number[]>()
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2)
      const bone = boneOf[a] === boneOf[b] || boneOf[a] === boneOf[c] ? boneOf[a] : boneOf[b]
      let l = tris.get(bone)
      if (!l) tris.set(bone, (l = []))
      l.push(a, b, c)
    }
    for (const [bone, list] of tris) {
      const geo = new THREE.BufferGeometry()
      for (const [name, attr] of Object.entries(g.attributes)) geo.setAttribute(name, attr)
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(list), 1))
      const m = new THREE.SkinnedMesh(geo)
      m.name = bone
      m.userData.bone = bone
      m.userData.tris = list.length / 3
      m.bind(sm.skeleton, sm.bindMatrix)
      m.frustumCulled = false
      sm.parent!.add(m)
      const arr = out.get(bone) ?? []
      arr.push(m)
      out.set(bone, arr)
    }
    sm.parent!.remove(sm)
  }
  return out
}

export interface TreeNode {
  part: PartInfo
  tris: number
  children: TreeNode[]
}

/** Tree of parts that have geometry; parents without geometry are skipped. */
export function buildTree(parts: PartInfo[], tris: Map<string, number>): TreeNode[] {
  const by = new Map(parts.map((p) => [p.bone, p]))
  const nodes = new Map<string, TreeNode>()
  for (const p of parts) if (tris.has(p.bone)) nodes.set(p.bone, { part: p, tris: tris.get(p.bone)!, children: [] })
  const roots: TreeNode[] = []
  for (const n of nodes.values()) {
    let a = n.part.parent
    while (a && !nodes.has(a)) a = by.get(a)?.parent ?? null
    ;(a ? nodes.get(a)!.children : roots).push(n)
  }
  return roots
}
