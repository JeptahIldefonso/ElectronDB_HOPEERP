'use client';

import React, { useEffect, useRef } from 'react';

// ============================================================================
// MATTE LIGHT TOPOGRAPHIC CONTOUR CONFIGURATION
// Soft off-white background with subtle pale sage-gray & darker contour lines.
// Zero flares, zero glowing spots, matte and evenly lit cartographic texture.
// ============================================================================
export const TOPO_CONFIG = {
  // Line density across the screen
  lineDensity: 20.0,
  // Standard contour line width in physical screen pixels
  lineWidthPixels: 1.15,
  // Index contour line width (every 5th line slightly bolder)
  indexLineWidthPixels: 1.85,
  // Opacity
  lineOpacity: 0.90,
  indexLineOpacity: 0.95,
  // Animation speed: slow, serene drift
  animationSpeed: 0.012,
  grainStrength: 0.002,

  // Exact recommended color palette (Normalized RGB 0.0 - 1.0)
  colors: {
    baseBg: [0.9686, 0.9725, 0.9608], // #F7F8F5 Soft off-white main background
    contourSage: [0.8353, 0.8667, 0.8392], // #D5DDD6 Pale sage-gray contour lines
    indexHighlight: [0.7176, 0.7686, 0.7255], // #B7C4B9 Darker contour lines
  },
};

const VERTEX_SHADER_SOURCE = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

// 2D Simplex Noise for natural geographic elevation contours
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,
                      0.366025403784439,
                     -0.577350269189626,
                      0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = st;
  uv.x *= aspect;

  // Cartographic diagonal rotation (~26 degree slope)
  float angle = -0.45;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 p = rot * uv;

  float t = u_time * ${TOPO_CONFIG.animationSpeed.toFixed(4)};

  // Multi-octave domain warped noise creates authentic landform contours
  float n1 = snoise(p * 1.15 + vec2(t * 0.22, t * 0.09));
  float n2 = snoise(p * 2.30 - vec2(t * 0.16, n1 * 0.45));
  float n3 = snoise(p * 4.20 + vec2(n2 * 0.35, t * 0.11));

  // Pure natural elevation heightmap
  float elevation = (n1 * 0.52 + n2 * 0.32 + n3 * 0.16) * 0.5 + 0.5;

  // Topographic contour calculation
  float contourCoord = elevation * ${TOPO_CONFIG.lineDensity.toFixed(1)};
  float distFromCenter = abs(fract(contourCoord) - 0.5);

  // Index contour (every 5th line is slightly darker)
  float indexCoord = contourCoord / 5.0;
  float indexDist = abs(fract(indexCoord) - 0.5);

  // Crisp, sharp contour lines anti-aliased over screen pixels (zero blur)
  #ifdef HAS_DERIVATIVES
    float fw = length(vec2(dFdx(contourCoord), dFdy(contourCoord)));
    float distInPixels = distFromCenter / max(fw, 0.0008);
    float halfLine = ${(TOPO_CONFIG.lineWidthPixels * 0.5).toFixed(2)};
    float line = 1.0 - smoothstep(max(halfLine - 0.5, 0.0), halfLine + 0.5, distInPixels);

    float indexFw = length(vec2(dFdx(indexCoord), dFdy(indexCoord)));
    float indexDistInPixels = indexDist / max(indexFw, 0.0004);
    float halfIndex = ${(TOPO_CONFIG.indexLineWidthPixels * 0.5).toFixed(2)};
    float indexLine = 1.0 - smoothstep(max(halfIndex - 0.5, 0.0), halfIndex + 0.5, indexDistInPixels);
  #else
    float line = 1.0 - smoothstep(0.002, 0.010, distFromCenter);
    float indexLine = 1.0 - smoothstep(0.003, 0.016, indexDist);
  #endif

  // Exact light enterprise palette
  vec3 c_bg_base = vec3(${TOPO_CONFIG.colors.baseBg.join(', ')});
  vec3 c_sage    = vec3(${TOPO_CONFIG.colors.contourSage.join(', ')});
  vec3 c_hi      = vec3(${TOPO_CONFIG.colors.indexHighlight.join(', ')});

  // Matte, evenly lit surface with subtle sage contours
  vec3 col = c_bg_base;
  col = mix(col, c_sage, line * ${TOPO_CONFIG.lineOpacity.toFixed(2)});
  col = mix(col, c_hi, indexLine * ${TOPO_CONFIG.indexLineOpacity.toFixed(2)});

  // Subtle film grain to eliminate digital banding
  float grain = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * ${TOPO_CONFIG.grainStrength.toFixed(4)};
  col += vec3(grain);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function TopographicCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Accessibility: Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    let gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) {
      gl = canvas.getContext('experimental-webgl', {
        alpha: false,
        antialias: false,
      }) as WebGLRenderingContext | null;
    }

    // 2D Canvas Fallback
    if (!gl) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = '#F7F8F5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    function createShader(glCtx: WebGLRenderingContext, type: number, source: string) {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error('Shader compile error:', glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const ext = gl.getExtension('OES_standard_derivatives');
    const prefix = ext
      ? '#define HAS_DERIVATIVES\n#extension GL_OES_standard_derivatives : enable\n'
      : '';

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, prefix + FRAGMENT_SHADER_SOURCE);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');

    let animationFrameId: number;
    let lastTime = 0;
    let accumulatedTime = 0;

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      const width = Math.floor(window.innerWidth * dpr);
      const height = Math.floor(window.innerHeight * dpr);
      canvas.width = width;
      canvas.height = height;
      gl?.viewport(0, 0, width, height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const render = (now: number) => {
      if (!gl) return;

      if (!isReducedMotion) {
        const delta = lastTime ? (now - lastTime) * 0.001 : 0.016;
        accumulatedTime += Math.min(delta, 0.1);
        lastTime = now;
      } else {
        accumulatedTime = 0.5;
      }

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, accumulatedTime);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleMotionChange);
      cancelAnimationFrame(animationFrameId);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 h-full w-full overflow-hidden select-none bg-[#F7F8F5]"
      aria-hidden="true"
    >
      {/* Matte Topographic WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="h-full w-full transform-gpu"
      />

      {/* Subtle radial soft vignette keeping the central authentication zone visually clean */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, rgba(247, 248, 245, 0.65) 25%, rgba(247, 248, 245, 0.15) 80%)`,
        }}
      />
    </div>
  );
}
