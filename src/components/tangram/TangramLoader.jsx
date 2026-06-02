import React, { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FIGURES, lerpPoints } from './tangramConfig'

const TOTAL = 5000
const HOLD = 800
const MORPH = 800
const CYCLE = HOLD + MORPH

function generateColors() {
  const accent = getCachedVar('--accent', '#d96b2d')
  const accentAlt = getCachedVar('--accent-alt', '#c44b6a')
  return [
    accent,
    accentAlt,
    mixColors(accent, accentAlt, 0.25),
    mixColors(accentAlt, accent, 0.25),
    mixColors(accent, accentAlt, 0.5),
    mixColors(accent, accentAlt, 0.75),
    mixColors(accentAlt, accent, 0.75),
  ]
}

function hexToRgb(h) {
  const v = parseInt(h.replace('#', ''), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')
}

function mixColors(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2)
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)
}

function getCachedVar(varName, fallback) {
  try {
    const cachedMode = localStorage.getItem('aura:activeMode') || 'light'
    const cachedRaw = localStorage.getItem('aura:themeSettingsCache')
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw)
      const modeKey = cachedMode === 'dark' || cachedMode === 'colorblind' ? cachedMode : 'light'
      const palettes = parsed.palettesByMode?.[modeKey]
      if (palettes?.length) {
        const activeId = parsed.activePaletteIds?.[modeKey]
        const active = palettes.find(p => p.id === activeId) || palettes[0]
        if (active?.values?.[varName]) return active.values[varName]
      }
    }
  } catch {}
  const root = document.documentElement
  return getComputedStyle(root).getPropertyValue(varName).trim() || fallback
}

const BG = getCachedVar('--bg', '#f6f0e6')
const COLORS = generateColors()
const SCALE = 0.35
const CX = 230
const EXTRUDE_SETTINGS = { depth: 14, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.2, bevelSegments: 4 }

export default function TangramLoader({ onComplete }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const meshesRef = useRef([])
  const ptsRef = useRef(FIGURES[0].pieces.map(p => [...p]))
  const rafRef = useRef(null)
  const startRef = useRef(null)

  // Init Three.js scene once
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.clientWidth || 400
    const h = container.clientHeight || 400

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(BG)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 2000)
    camera.position.set(0, 0, 580)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h, false)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dl = new THREE.DirectionalLight(0xffffff, 1.5)
    dl.position.set(200, 300, 200)
    dl.castShadow = true
    dl.shadow.mapSize.set(1024, 1024)
    scene.add(dl)
    const fl = new THREE.DirectionalLight(0x8888ff, 0.4)
    fl.position.set(-200, 100, -100)
    scene.add(fl)
    const rl = new THREE.DirectionalLight(0xffffff, 0.3)
    rl.position.set(0, -200, 100)
    scene.add(rl)

    // Ground shadow catcher
    const gnd = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.ShadowMaterial({ opacity: 0.08 })
    )
    gnd.rotation.x = -Math.PI / 2
    gnd.position.y = -100
    gnd.receiveShadow = true
    scene.add(gnd)

    // Create 7 meshes
    const meshes = []
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: COLORS[i],
        roughness: 0.4,
        metalness: 0.08
      })
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat)
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
      meshes.push(mesh)
    }
    meshesRef.current = meshes

    // Build initial shapes
    const initPts = FIGURES[0].pieces.map(p => [...p])
    ptsRef.current = initPts
    rebuildGeometries(meshes, initPts)

    const onResize = () => {
      const cw = container.clientWidth || 400
      const ch = container.clientHeight || 400
      camera.aspect = cw / ch
      camera.updateProjectionMatrix()
      renderer.setSize(cw, ch, false)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      meshes.forEach(m => { m.geometry.dispose(); m.material.dispose(); scene.remove(m) })
      renderer.dispose()
      window.removeEventListener('resize', onResize)
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  // Main loop: animate points + render
  useEffect(() => {
    startRef.current = performance.now()
    const clock = new THREE.Clock()

    const tick = () => {
      const elapsed = performance.now() - startRef.current

      if (elapsed >= TOTAL) {
        if (onComplete) onComplete()
        return
      }

      const cyclePos = elapsed % (CYCLE * 3)
      const cycleIdx = Math.floor(cyclePos / CYCLE) % 3
      const phaseTime = cyclePos % CYCLE
      const from = FIGURES[cycleIdx]
      const to = FIGURES[(cycleIdx + 1) % 3]
      let t = 0
      if (phaseTime >= HOLD) {
        t = (phaseTime - HOLD) / MORPH
        t = 1 - Math.pow(1 - t, 3)
      }

      // Update geometry directly without React re-render
      ptsRef.current = from.pieces.map((fp, i) => lerpPoints(fp, to.pieces[i], t))
      rebuildGeometries(meshesRef.current, ptsRef.current)

      const angle = Math.sin(clock.getElapsedTime() * 0.25) * 0.2
      const morphFlip = Math.sin(t * Math.PI) * 0.25
      const meshes = meshesRef.current
      meshes.forEach((m, i) => {
        if (m) {
          m.rotation.y = angle
          m.rotation.x = Math.sin(clock.getElapsedTime() * 0.2 + i) * 0.05 + morphFlip * (1 + i * 0.1)
          m.position.y = Math.sin(clock.getElapsedTime() * 0.12 + i * 0.7) * 0.8
        }
      })

      rendererRef.current?.render(sceneRef.current, cameraRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [onComplete])

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: BG, zIndex: 99999,
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: 'min(75vmin, 520px)',
          height: 'min(75vmin, 520px)',
          borderRadius: 20,
          overflow: 'hidden',
        }}
      />
    </div>
  )
}

function rebuildGeometries(meshes, pts) {
  if (!meshes || !meshes.length) return
  pts.forEach((poly, i) => {
    const m = meshes[i]
    if (!m) return
    const shape = new THREE.Shape()
    shape.moveTo((poly[0][0] - CX) * SCALE, -(poly[0][1] - 200) * SCALE)
    for (let j = 1; j < poly.length; j++) {
      shape.lineTo((poly[j][0] - CX) * SCALE, -(poly[j][1] - 200) * SCALE)
    }
    shape.closePath()

    const geo = new THREE.ExtrudeGeometry(shape, EXTRUDE_SETTINGS)
    m.geometry.dispose()
    m.geometry = geo
  })
}
