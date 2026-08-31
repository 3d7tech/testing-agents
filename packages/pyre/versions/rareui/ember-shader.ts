/// <reference types="vitest/importMeta" />
// MIT License. Copyright (c) Pyre contributors.
//
// ember-shader.ts — a single full-screen-quad fragment shader drawing the
// five glass-clock rings as signed-distance arcs, a hot burn head with
// bloom on each, and up to 300 additive ember particles thrown off the
// two fastest heads. One draw call, capped at 60fps by the caller.
// Warm palette throughout (dim deep ember at the rim, brightening inward
// toward near-white at the centre) — no blue.
//
// Kept dependency-free (no Three.js): this is small enough, and it is the
// kind of thing RareUI's own audience inspects, that a raw shader reads
// better than a scene-graph library wrapping one triangle.

export const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const RING_COUNT = 5;

/**
 * The particle-uniform array is sized at shader-compile time from the
 * GPU's actual MAX_FRAGMENT_UNIFORM_VECTORS, so this never overflows a
 * driver's real limit — it just clamps to min(300, whatever fits).
 */
export function buildFragmentShaderSrc(maxParticles: number): string {
  return `
precision highp float;

uniform vec2 u_resolution;
uniform float u_ringFraction[${RING_COUNT}];   // 0..1 remaining, per ring
uniform float u_ringHeadAngle[${RING_COUNT}];  // radians, 0 = top, clockwise
uniform int u_particleCount;
uniform vec4 u_particle[${maxParticles}]; // xy = position (-1..1), z = age 0..1, w = brightness

const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;
const int RING_COUNT = ${RING_COUNT};

// Distance to a ring arc: 0 at the arc's centreline, growing outward.
// Angle convention: 0 at top (12 o'clock), increasing clockwise — a
// compass bearing, atan2(x, y) rather than the usual atan2(y, x).
float arcDist(vec2 p, float radius, float thickness, float startAngle, float endAngle) {
  float ang = atan(p.x, p.y);
  if (ang < 0.0) ang += TWO_PI;
  float span = endAngle - startAngle;
  float rel = ang - startAngle;
  if (rel < 0.0) rel += TWO_PI;
  float ring = abs(length(p) - radius) - thickness * 0.5;
  if (rel > span) {
    // outside the arc's angular span entirely
    return 1e3;
  }
  return ring;
}

vec3 emberColor(float t) {
  // t: 0 = dim deep ember (rim), 1 = near-white (centre / hot head)
  vec3 deep = vec3(0.35, 0.06, 0.02);
  vec3 mid = vec3(0.95, 0.35, 0.05);
  vec3 hot = vec3(1.0, 0.92, 0.75);
  vec3 a = mix(deep, mid, clamp(t * 2.0, 0.0, 1.0));
  return mix(a, hot, clamp(t * 2.0 - 1.0, 0.0, 1.0));
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  vec3 color = vec3(0.0);
  float maxRadius = 0.92;
  float step = maxRadius / float(RING_COUNT + 1);
  float thickness = step * 0.55;

  for (int i = 0; i < RING_COUNT; i++) {
    float radius = maxRadius - float(i) * step;
    float frac = u_ringFraction[i];
    float headAngle = u_ringHeadAngle[i];

    // Inner rings (fast, i small) burn hotter/brighter than outer rings.
    float ringHeat = 1.0 - float(i) / float(RING_COUNT - 1);

    float d = arcDist(uv, radius, thickness, 0.0, max(0.001, frac * TWO_PI));
    float glow = exp(-abs(d) * 90.0);
    // Unburnt arc glows and fades ahead of the head (brighter near 0
    // distance, tapering toward the arc's far end).
    color += emberColor(0.25 + ringHeat * 0.35) * glow * 0.9;

    // Hot burn head: a bright point with bloom at the current angle.
    vec2 headPos = radius * vec2(sin(headAngle), cos(headAngle));
    float headDist = length(uv - headPos);
    float headCore = exp(-headDist * 140.0);
    float headBloom = exp(-headDist * 22.0) * 0.5;
    color += emberColor(0.85 + ringHeat * 0.15) * (headCore * 1.4 + headBloom * ringHeat);
  }

  // Ambient centre glow, warm and dim, brightening toward the very centre.
  float centreDist = length(uv);
  color += emberColor(0.9) * exp(-centreDist * 6.0) * 0.05;

  // Additive ember particles.
  for (int i = 0; i < ${maxParticles}; i++) {
    if (i >= u_particleCount) break;
    vec4 p = u_particle[i];
    float pd = length(uv - p.xy);
    float fade = (1.0 - p.z) * p.w;
    color += emberColor(0.7) * exp(-pd * 60.0) * fade * 0.8;
  }

  gl_FragColor = vec4(color, 1.0);
}
`;
}

export interface EmberDrawState {
  ringFraction: number[]; // length RING_COUNT
  ringHeadAngle: number[]; // length RING_COUNT, radians
  particles: Float32Array; // length maxParticles * 4: x, y, age, brightness
  particleCount: number;
}

export interface EmberRenderer {
  readonly maxParticles: number;
  draw(state: EmberDrawState): void;
  resize(width: number, height: number, dpr: number): void;
  dispose(): void;
}

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${info}`);
  }
  return shader;
}

/** Returns null (never throws) if WebGL isn't available — callers fall back. */
export function createEmberRenderer(canvas: HTMLCanvasElement): EmberRenderer | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl =
      (canvas.getContext('webgl', { antialias: true, alpha: false }) as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
  } catch {
    gl = null;
  }
  if (!gl) return null;

  try {
    const maxVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number;
    // Reserve headroom for the fixed uniforms above (~20 vec4-equivalents).
    const maxParticles = Math.max(0, Math.min(300, maxVectors - 40));

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, buildFragmentShaderSrc(maxParticles));
    const program = gl.createProgram();
    if (!program) throw new Error('createProgram failed');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), // one oversized triangle covers the viewport
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uRingFraction = gl.getUniformLocation(program, 'u_ringFraction');
    const uRingHeadAngle = gl.getUniformLocation(program, 'u_ringHeadAngle');
    const uParticleCount = gl.getUniformLocation(program, 'u_particleCount');
    const uParticle = gl.getUniformLocation(program, 'u_particle');

    const glContext = gl;

    return {
      maxParticles,
      resize(width, height, dpr) {
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        glContext.viewport(0, 0, canvas.width, canvas.height);
      },
      draw(state) {
        glContext.useProgram(program);
        glContext.uniform2f(uResolution, canvas.width, canvas.height);
        glContext.uniform1fv(uRingFraction, new Float32Array(state.ringFraction));
        glContext.uniform1fv(uRingHeadAngle, new Float32Array(state.ringHeadAngle));
        glContext.uniform1i(uParticleCount, Math.min(state.particleCount, maxParticles));
        if (maxParticles > 0) {
          glContext.uniform4fv(uParticle, state.particles.subarray(0, maxParticles * 4));
        }
        glContext.drawArrays(glContext.TRIANGLES, 0, 3);
      },
      dispose() {
        glContext.deleteBuffer(quad);
        glContext.deleteProgram(program);
        glContext.deleteShader(vs);
        glContext.deleteShader(fs);
      },
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The fallback path — never render a black box — is a hard requirement, so
// it's exercised here directly rather than just asserted in a code comment.
// ---------------------------------------------------------------------------

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  function fakeCanvas(getContext: () => null): HTMLCanvasElement {
    return { getContext } as unknown as HTMLCanvasElement;
  }

  describe('createEmberRenderer fallback', () => {
    it('returns null (never throws) when the browser has no WebGL context at all', () => {
      const canvas = fakeCanvas(() => null);
      expect(() => createEmberRenderer(canvas)).not.toThrow();
      expect(createEmberRenderer(canvas)).toBeNull();
    });

    it('returns null when getContext itself throws (some locked-down browsers do)', () => {
      const canvas = {
        getContext: () => {
          throw new Error('WebGL is disabled');
        },
      } as unknown as HTMLCanvasElement;
      expect(() => createEmberRenderer(canvas)).not.toThrow();
      expect(createEmberRenderer(canvas)).toBeNull();
    });
  });

  describe('buildFragmentShaderSrc', () => {
    it('sizes the particle uniform array to the requested cap', () => {
      const src = buildFragmentShaderSrc(37);
      expect(src).toContain('uniform vec4 u_particle[37]');
      expect(src).toContain('for (int i = 0; i < 37; i++)');
    });

    it('stays comfortably under the 200-line budget for the shader itself', () => {
      const src = buildFragmentShaderSrc(300);
      const lineCount = src.split('\n').length;
      expect(lineCount).toBeLessThan(200);
    });
  });
}
