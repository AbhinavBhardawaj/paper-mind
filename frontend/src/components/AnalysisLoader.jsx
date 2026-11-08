import { useEffect, useRef } from 'react'

export default function AnalysisLoader() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let disposed = false
    let renderer
    let scene
    let frameId
    let three

    const initialize = async () => {
      try {
        three = await import('three')
      } catch (error) {
        console.warn('[AnalysisLoader] Three.js could not load; showing the CSS loader instead.', error)
        return
      }

      if (disposed) return

      try {
        renderer = new three.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
      } catch (error) {
        console.warn('[AnalysisLoader] WebGL unavailable; showing the CSS loader instead.', error)
        return
      }

      scene = new three.Scene()
      const camera = new three.PerspectiveCamera(36, 180 / 160, 0.1, 20)
      camera.position.z = 4.5

      const core = new three.Group()
      const planet = new three.Mesh(
        new three.IcosahedronGeometry(0.66, 2),
        new three.MeshStandardMaterial({ color: '#315d7d', roughness: 0.32, metalness: 0.28 })
      )
      const wireframe = new three.Mesh(
        new three.IcosahedronGeometry(0.76, 1),
        new three.MeshBasicMaterial({ color: '#ff7a59', wireframe: true, transparent: true, opacity: 0.65 })
      )
      core.add(planet, wireframe)
      scene.add(core)

      const orbit = new three.Group()
      const ring = new three.Mesh(
        new three.TorusGeometry(1.05, 0.012, 8, 96),
        new three.MeshBasicMaterial({ color: '#8ba2b2', transparent: true, opacity: 0.8 })
      )
      ring.rotation.x = Math.PI * 0.38
      orbit.add(ring)

      const satellite = new three.Mesh(
        new three.SphereGeometry(0.1, 20, 20),
        new three.MeshStandardMaterial({ color: '#ff7a59', roughness: 0.28, metalness: 0.18 })
      )
      satellite.position.set(1.02, 0, 0)
      orbit.add(satellite)

      const secondRing = new three.Mesh(
        new three.TorusGeometry(1.28, 0.008, 8, 96),
        new three.MeshBasicMaterial({ color: '#557994', transparent: true, opacity: 0.45 })
      )
      secondRing.rotation.set(Math.PI * 0.82, Math.PI * 0.18, 0)
      orbit.add(secondRing)
      scene.add(orbit)

      scene.add(new three.HemisphereLight('#ffffff', '#557994', 2))
      const keyLight = new three.DirectionalLight('#ffffff', 2.4)
      keyLight.position.set(-2, 3, 4)
      scene.add(keyLight)

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(180, 160, false)
      renderer.outputColorSpace = three.SRGBColorSpace
      mount.appendChild(renderer.domElement)
      mount.parentElement?.classList.add('webgl-ready')

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const draw = (time = 0) => {
        const seconds = time / 1000
        core.rotation.set(seconds * 0.24, seconds * 0.42, seconds * 0.12)
        const pulse = 1 + Math.sin(seconds * 2.4) * 0.055
        core.scale.setScalar(reducedMotion ? 1 : pulse)
        orbit.rotation.set(seconds * 0.18, seconds * 0.34, seconds * 0.12)
        renderer.render(scene, camera)
        if (!reducedMotion) frameId = window.requestAnimationFrame(draw)
      }

      draw()
    }

    void initialize()

    return () => {
      disposed = true
      window.cancelAnimationFrame(frameId)
      scene?.traverse((object) => {
        if (object instanceof three.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
      renderer?.dispose()
      renderer?.domElement.remove()
      mount.parentElement?.classList.remove('webgl-ready')
    }
  }, [])

  return (
    <div className="research-loader-visual" aria-hidden="true">
      <div className="research-loader-fallback">
        <span className="research-loader-orbit research-loader-orbit-outer" />
        <span className="research-loader-orbit research-loader-orbit-inner" />
        <span className="material-symbols-outlined">auto_stories</span>
      </div>
      <div ref={mountRef} className="research-loader-canvas" />
    </div>
  )
}
