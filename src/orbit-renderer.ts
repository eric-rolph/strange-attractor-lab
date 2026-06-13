import type { AttractorParams } from "./attractor";
import { buildDelayEmbedding } from "./motion";

const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;

uniform float uAspect;
uniform float uDistance;
uniform float uPitch;
uniform float uPointCount;
uniform float uYaw;

out float vAge;
out float vDepth;

mat3 rotateX(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}

mat3 rotateY(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

void main() {
  vec3 position = rotateX(uPitch) * rotateY(uYaw) * (aPosition * 1.18);
  float depth = max(1.0, uDistance - position.z);
  gl_Position = vec4(position.x * 2.2 / uAspect, position.y * 2.2, position.z, depth);
  gl_PointSize = clamp(6.5 - depth * 0.55, 1.2, 4.0);
  vAge = float(gl_VertexID) / max(1.0, uPointCount);
  vDepth = 1.0 - clamp((depth - 2.0) / 6.5, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float vAge;
in float vDepth;

out vec4 outColor;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float radius = length(centered);
  if (radius > 0.5) {
    discard;
  }

  vec3 ember = vec3(0.48, 0.055, 0.012);
  vec3 orange = vec3(1.0, 0.32, 0.055);
  vec3 cream = vec3(1.0, 0.91, 0.64);
  vec3 color = mix(ember, orange, smoothstep(0.0, 0.72, vAge));
  color = mix(color, cream, smoothstep(0.7, 1.0, vAge) * (0.35 + vDepth * 0.65));
  float alpha = (1.0 - smoothstep(0.12, 0.5, radius)) * (0.18 + vDepth * 0.45);
  outColor = vec4(color, alpha);
}
`;

export class OrbitRenderer {
  readonly available: boolean;

  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext | null;
  private readonly program: WebGLProgram | null;
  private readonly positionBuffer: WebGLBuffer | null;
  private readonly uniforms:
    | {
        aspect: WebGLUniformLocation | null;
        distance: WebGLUniformLocation | null;
        pitch: WebGLUniformLocation | null;
        pointCount: WebGLUniformLocation | null;
        yaw: WebGLUniformLocation | null;
      }
    | undefined;
  private active = false;
  private autoOrbit = true;
  private distance = 7.2;
  private dragging = false;
  private lastFrame = performance.now();
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pitch = -0.18;
  private pointCount = 0;
  private yaw = 0.4;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.available = this.gl !== null;

    if (!this.gl) {
      this.program = null;
      this.positionBuffer = null;
      return;
    }

    this.program = createProgram(this.gl, VERTEX_SHADER, FRAGMENT_SHADER);
    this.positionBuffer = this.gl.createBuffer();
    this.uniforms = {
      aspect: this.gl.getUniformLocation(this.program, "uAspect"),
      distance: this.gl.getUniformLocation(this.program, "uDistance"),
      pitch: this.gl.getUniformLocation(this.program, "uPitch"),
      pointCount: this.gl.getUniformLocation(this.program, "uPointCount"),
      yaw: this.gl.getUniformLocation(this.program, "uYaw"),
    };

    this.bindInteractions();
    requestAnimationFrame(this.render);
  }

  setActive(active: boolean): void {
    this.active = active;
    if (active) {
      this.resize();
    }
  }

  setAutoOrbit(enabled: boolean): void {
    this.autoOrbit = enabled;
  }

  updateParams(params: AttractorParams): void {
    if (!this.gl || !this.positionBuffer) {
      return;
    }

    const compact = window.innerWidth < 700;
    const positions = buildDelayEmbedding(params, {
      burnIn: 1_200,
      lag: 9,
      samples: compact ? 42_000 : 78_000,
    });
    this.pointCount = positions.length / 3;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.DYNAMIC_DRAW);
  }

  resize(): void {
    if (!this.gl) {
      return;
    }

    const bounds = this.canvas.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(bounds.width * scale));
    const height = Math.max(1, Math.round(bounds.height * scale));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }

  resetCamera(): void {
    this.distance = 7.2;
    this.pitch = -0.18;
    this.yaw = 0.4;
  }

  private readonly render = (now: number): void => {
    requestAnimationFrame(this.render);

    if (!this.active || !this.gl || !this.program || !this.positionBuffer || !this.uniforms) {
      this.lastFrame = now;
      return;
    }

    const elapsed = Math.min(50, now - this.lastFrame);
    this.lastFrame = now;
    if (this.autoOrbit && !this.dragging) {
      this.yaw += elapsed * 0.0001;
    }

    this.resize();
    const gl = this.gl;
    gl.clearColor(0.012, 0.009, 0.006, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(this.uniforms.aspect, this.canvas.width / this.canvas.height);
    gl.uniform1f(this.uniforms.distance, this.distance);
    gl.uniform1f(this.uniforms.pitch, this.pitch);
    gl.uniform1f(this.uniforms.pointCount, this.pointCount);
    gl.uniform1f(this.uniforms.yaw, this.yaw);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);
  };

  private bindInteractions(): void {
    this.canvas.addEventListener("pointerdown", (event) => {
      this.dragging = true;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.canvas.setPointerCapture(event.pointerId);
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.dragging) {
        return;
      }

      this.yaw += (event.clientX - this.lastPointerX) * 0.007;
      this.pitch = clamp(
        this.pitch + (event.clientY - this.lastPointerY) * 0.007,
        -1.35,
        1.35,
      );
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
    });

    const stopDragging = (): void => {
      this.dragging = false;
    };
    this.canvas.addEventListener("pointerup", stopDragging);
    this.canvas.addEventListener("pointercancel", stopDragging);
    this.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        this.distance = clamp(this.distance + event.deltaY * 0.004, 4, 11);
      },
      { passive: false },
    );
  }
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Unable to create WebGL program");
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Unable to link WebGL program");
  }

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to create WebGL shader");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Unable to compile WebGL shader");
  }

  return shader;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
