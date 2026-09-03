import { useEffect, useRef } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'
import './GhostFibers.css'

export interface GhostFibersProps {
  lineColor?: string
  glowColor?: string
  speed?: number
  scale?: number
  rotation?: number
  rotationSpeed?: number
  layers?: number
  waveAmplitude?: number
  waveFrequency?: number
  waveSpeed?: number
  layerSpeed?: number
  twist?: number
  twistFrequency?: number
  twistSpeed?: number
  lineFrequency?: number
  lineSpacing?: number
  lineSharpness?: number
  glowFalloff?: number
  glowIntensity?: number
  brightness?: number
  blueBoost?: number
  vignette?: number
  grain?: number
  lightMode?: boolean
  dpr?: number
  fps?: number
  paused?: boolean
  className?: string
}

const hexToRgb = (hex: string) => {
  const value = hex.trim().replace(/^#/, '')
  const normalized = value.length === 3 ? value.replace(/./g, (channel) => channel + channel) : value
  const match = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized)
  return match ? [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255] : [1, 1, 1]
}

const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const fragment = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uLayers;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uLayerSpeed;
uniform float uTwist;
uniform float uTwistFrequency;
uniform float uTwistSpeed;
uniform float uLineFrequency;
uniform float uLineSpacing;
uniform float uLineSharpness;
uniform float uGlowFalloff;
uniform float uGlowIntensity;
uniform float uBrightness;
uniform float uBlueBoost;
uniform float uVignette;
uniform float uGrain;
uniform float uRotationSpeed;
uniform float uLightMode;
uniform vec3 uLineColor;
uniform vec3 uGlowColor;
out vec4 fragColor;
#define MAX_LAYERS 10

mat2 rotate2d(float angle) { float s = sin(angle); float c = cos(angle); return mat2(c, -s, s, c); }
float grainHash(vec2 point) { point = floor(point); return fract(52.9829189 * fract(dot(point, vec2(0.065, 0.005)))); }
float layeredGrain(vec2 pixel) {
  vec2 point = mod(pixel + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
  vec2 rotated = mat2(0.8, -0.5, 0.5, 0.8) * point;
  return 0.40 * grainHash(rotated) + 0.25 * grainHash(rotated * 2.0 + 17.0) + 0.20 * grainHash(rotated * 4.0 + 47.0) + 0.10 * grainHash(rotated * 8.0 + 113.0) + 0.05 * grainHash(rotated * 16.0 + 191.0);
}

void main() {
  vec2 resolution = max(uResolution, vec2(1.0));
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  float time = uTime * uSpeed;
  vec3 backdrop = mix(vec3(0.070588, 0.058824, 0.090196), vec3(1.0), step(0.5, uLightMode));
  vec3 centerTone = max(uLineColor * 0.85567 - uGlowColor * 0.06186, vec3(0.0));
  vec3 cloudTone = uLineColor * 0.19588 + uGlowColor * 0.2268;
  vec2 p = rotate2d(radians(uRotation) + time * uRotationSpeed) * (uv / max(uScale, 0.05));
  vec3 color = vec3(0.0);
  float fiberField = 0.0;

  for (int index = 0; index < MAX_LAYERS; index++) {
    float fi = float(index) + 1.0;
    if (fi > uLayers) break;
    p += uWaveAmplitude * sin(p.yx * fi * uWaveFrequency + time * (uWaveSpeed + fi * uLayerSpeed));
    float radius = length(p);
    float polarAngle = atan(p.y, p.x) + sin(radius * uTwistFrequency - time * uTwistSpeed + fi) * uTwist;
    p = vec2(cos(polarAngle), sin(polarAngle)) * radius;
    float lines = abs(sin(p.x * (uLineFrequency + fi * uLineSpacing) + sin(p.y * 3.0 + time)));
    lines = pow(max(0.0, 1.0 - lines), uLineSharpness);
    fiberField += lines / fi;
    color += uLineColor * lines / fi;
    float glow = exp(-uGlowFalloff * abs(sin(p.x * 3.0 + time + fi)));
    color += uGlowColor * glow * uGlowIntensity / (fi * 2.0);
  }

  float center = exp(-2.2 * dot(uv, uv));
  color += centerTone * center;
  float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
  color += cloudTone * cloud;
  float edgeFade = mix(1.0 - uVignette, 1.0, 1.0 - smoothstep(0.35, 1.45, length(uv)));
  color *= edgeFade;
  color = 1.0 - exp(-color * uBrightness);
  color.b *= uBlueBoost;
  vec3 outputColor;
  if (uLightMode > 0.5) {
    float fibers = pow(smoothstep(0.12, 1.05, fiberField) * edgeFade, 1.5);
    vec3 fiberInk = mix(backdrop, uLineColor, 0.52);
    vec3 airColor = mix(backdrop, uGlowColor, 0.16);
    outputColor = mix(mix(backdrop, airColor, (center * 0.025 + cloud * 0.015) * edgeFade), fiberInk, fibers * 0.3);
  } else {
    outputColor = backdrop + color;
  }
  outputColor += (layeredGrain(gl_FragCoord.xy) - 0.5) * uGrain;
  fragColor = vec4(clamp(outputColor, 0.0, 1.0), 1.0);
}
`

export default function GhostFibers({
  lineColor = '#1a3d69', glowColor = '#4f8dce', speed = 0.16, scale = 2, rotation = 0, rotationSpeed = 0.12,
  layers = 4, waveAmplitude = 0.015, waveFrequency = 3, waveSpeed = 0.15, layerSpeed = 0.08, twist = 0.1,
  twistFrequency = 5, twistSpeed = 1.2, lineFrequency = 5, lineSpacing = 2, lineSharpness = 16, glowFalloff = 10,
  glowIntensity = 1.2, brightness = 1.6, blueBoost = 1.1, vignette = 0.72, grain = 0.025, lightMode = false,
  dpr = 1, fps = 30, paused = false, className = '',
}: GhostFibersProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let renderer: Renderer
    try {
      renderer = new Renderer({ webgl: 2, alpha: false, antialias: false, dpr: Math.min(Math.max(dpr, 0.5), 2) })
    } catch {
      return
    }
    const gl = renderer.gl
    const canvas = gl.canvas
    canvas.setAttribute('aria-hidden', 'true')
    container.appendChild(canvas)
    const program = new Program(gl, {
      vertex, fragment,
      uniforms: {
        uResolution: { value: new Float32Array([1, 1]) }, uTime: { value: 0 }, uSpeed: { value: speed }, uScale: { value: scale },
        uRotation: { value: rotation }, uRotationSpeed: { value: rotationSpeed }, uLayers: { value: Math.min(Math.max(Math.round(layers), 1), 10) },
        uWaveAmplitude: { value: waveAmplitude }, uWaveFrequency: { value: waveFrequency }, uWaveSpeed: { value: waveSpeed }, uLayerSpeed: { value: layerSpeed },
        uTwist: { value: twist }, uTwistFrequency: { value: twistFrequency }, uTwistSpeed: { value: twistSpeed }, uLineFrequency: { value: lineFrequency },
        uLineSpacing: { value: lineSpacing }, uLineSharpness: { value: lineSharpness }, uGlowFalloff: { value: glowFalloff }, uGlowIntensity: { value: glowIntensity },
        uBrightness: { value: brightness }, uBlueBoost: { value: blueBoost }, uVignette: { value: vignette }, uGrain: { value: grain }, uLightMode: { value: lightMode ? 1 : 0 },
        uLineColor: { value: new Float32Array(hexToRgb(lineColor)) }, uGlowColor: { value: new Float32Array(hexToRgb(glowColor)) },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
    let hasRendererError = false
    const render = () => {
      if (hasRendererError) return
      try {
        renderer.render({ scene: mesh })
      } catch {
        hasRendererError = true
        canvas.style.display = 'none'
      }
    }
    const resize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)))
      program.uniforms.uResolution.value[0] = gl.drawingBufferWidth
      program.uniforms.uResolution.value[1] = gl.drawingBufferHeight
      render()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frameId = 0
    let lastRender = 0
    const started = performance.now()
    const loop = (now: number) => {
      frameId = 0
      if (paused || document.hidden || mediaQuery.matches) return
      if (now - lastRender >= 1000 / Math.min(Math.max(fps, 1), 60)) {
        program.uniforms.uTime.value = (now - started) / 1000
        render()
        lastRender = now
      }
      frameId = requestAnimationFrame(loop)
    }
    const onVisibility = () => {
      if (!document.hidden && !paused && !mediaQuery.matches && !frameId) frameId = requestAnimationFrame(loop)
    }
    const onMotionChange = () => {
      if (mediaQuery.matches && frameId) {
        cancelAnimationFrame(frameId)
        frameId = 0
      }
      if (!mediaQuery.matches && !paused && !document.hidden && !frameId) frameId = requestAnimationFrame(loop)
    }
    resize()
    if (!paused && !mediaQuery.matches) frameId = requestAnimationFrame(loop)
    document.addEventListener('visibilitychange', onVisibility)
    mediaQuery.addEventListener('change', onMotionChange)
    return () => {
      if (frameId) cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      mediaQuery.removeEventListener('change', onMotionChange)
      if (canvas.parentNode === container) container.removeChild(canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [blueBoost, brightness, dpr, fps, glowColor, glowFalloff, glowIntensity, grain, layerSpeed, layers, lightMode, lineColor, lineFrequency, lineSharpness, lineSpacing, paused, rotation, rotationSpeed, scale, speed, twist, twistFrequency, twistSpeed, vignette, waveAmplitude, waveFrequency, waveSpeed])

  return <div ref={containerRef} className={`ghost-fibers-container ${className}`.trim()} />
}
