import { create } from 'zustand'

interface ViewState {
  hidden: Set<string>
  selected: string | null
  ghost: boolean
  weapon: string | null
  setWeapon: (id: string | null) => void
  strip: boolean
  select: (b: string | null) => void
  toggle: (b: string) => void
  setStrip: (v: boolean) => void
  setGhost: (v: boolean) => void
  reset: () => void
}

export const useView = create<ViewState>((set) => ({
  hidden: new Set(),
  selected: null,
  ghost: false,
  weapon: new URLSearchParams(location.search).get('weapon'),
  setWeapon: (weapon) => set({ weapon }),
  strip: false,
  select: (selected) => set({ selected }),
  toggle: (b) =>
    set((s) => {
      const hidden = new Set(s.hidden)
      if (!hidden.delete(b)) hidden.add(b)
      return { hidden }
    }),
  setStrip: (strip) => set({ strip }),
  setGhost: (ghost) => set({ ghost }),
  reset: () => set({ hidden: new Set(), selected: null, strip: false }),
}))
