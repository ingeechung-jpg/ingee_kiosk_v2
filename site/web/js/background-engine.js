(function() {
  var STORAGE_ACTIVE_KEY = 'kiosk-background-active';
  var STORAGE_LIBRARY_KEY = 'kiosk-background-library';

  var BUILTIN_PRESETS = [
    {
      id: 'kiosk-circle-wave-v1',
      label: 'Kiosk Circle Wave v1',
      engine: 'circle-wave',
      colors: ['#c8c8c8', '#fcfcfc'],
      sourceCount: 1,
      rings: 7,
      spread: 0.5,
      speed: 0.5,
      noise: 0.15,
      orbit: 0.28
    },
    {
      id: 'kiosk-circle-wave-v2',
      label: 'Kiosk Circle Wave v2',
      engine: 'circle-wave',
      colors: ['#d7d1ff', '#ffffff', '#b9d6ff'],
      sourceCount: 2,
      rings: 8.5,
      spread: 0.56,
      speed: 0.42,
      noise: 0.24,
      orbit: 0.34
    },
    {
      id: 'kiosk-circle-wave-v3',
      label: 'Kiosk Circle Wave v3',
      engine: 'circle-wave',
      colors: ['#ffd4c7', '#fffaf2', '#d2e4ff', '#f7d5ff'],
      sourceCount: 3,
      rings: 9.2,
      spread: 0.62,
      speed: 0.38,
      noise: 0.28,
      orbit: 0.37
    },
    {
      id: 'kiosk-random-wave',
      label: 'Kiosk Random Wave',
      engine: 'random-wave',
      colors: ['#fff7d6', '#ffffff', '#c8ddff', '#f4d0ff'],
      sourceCount: 4,
      rings: 6.8,
      spread: 0.72,
      speed: 0.33,
      noise: 0.72,
      orbit: 0.41
    }
  ];

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function safeStorageGet(key) {
    try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (_) { return null; }
  }

  function safeStorageSet(key, value) {
    try { if (window.localStorage) window.localStorage.setItem(key, value); } catch (_) {}
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'preset';
  }

  function hexToRgb01(hex) {
    var clean = String(hex || '#ffffff');
    var value = clean.replace('#', '');
    if (value.length === 3) value = value.replace(/(.)/g, '$1$1');
    var parsed = parseInt(value, 16);
    if (isNaN(parsed)) parsed = 0xffffff;
    return [((parsed >> 16) & 255) / 255, ((parsed >> 8) & 255) / 255, (parsed & 255) / 255];
  }

  function normalizeColors(rawColors) {
    var list = Array.isArray(rawColors) ? rawColors.slice(0, 8) : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var color = String(list[i] || '').trim();
      if (/^#[0-9a-fA-F]{6}$/.test(color)) out.push(color);
    }
    if (!out.length) out = ['#c8c8c8', '#fcfcfc'];
    return out;
  }

  function normalizePreset(raw) {
    var base = raw || {};
    var colors = normalizeColors(base.colors);
    return {
      id: String(base.id || slugify(base.label || 'custom-preset')),
      label: String(base.label || 'Custom Preset'),
      engine: base.engine === 'random-wave' ? 'random-wave' : 'circle-wave',
      colors: colors,
      sourceCount: clamp(Number(base.sourceCount || 1), 1, 8),
      rings: clamp(Number(base.rings || 7), 1, 16),
      spread: clamp(Number(base.spread || 0.5), 0.15, 1.6),
      speed: clamp(Number(base.speed || 0.5), 0.05, 1.5),
      noise: clamp(Number(base.noise || 0.15), 0, 1.5),
      orbit: clamp(Number(base.orbit || 0.28), 0, 0.5),
      updatedAt: base.updatedAt || new Date().toISOString(),
      builtIn: !!base.builtIn
    };
  }

  function getCustomPresets() {
    var raw = safeStorageGet(STORAGE_LIBRARY_KEY);
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizePreset);
    } catch (_) {
      return [];
    }
  }

  function getPresetLibrary() {
    var builtIn = BUILTIN_PRESETS.map(function(item) {
      var preset = normalizePreset(item);
      preset.builtIn = true;
      return preset;
    });
    return builtIn.concat(getCustomPresets());
  }

  function findPresetById(id) {
    var list = getPresetLibrary();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return clone(list[i]);
    }
    return null;
  }

  function loadActivePreset() {
    var raw = safeStorageGet(STORAGE_ACTIVE_KEY);
    if (!raw) return normalizePreset(BUILTIN_PRESETS[0]);
    try {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        var found = findPresetById(parsed.id);
        if (found) return found;
      }
      return normalizePreset(parsed);
    } catch (_) {
      var foundById = findPresetById(raw);
      return foundById || normalizePreset(BUILTIN_PRESETS[0]);
    }
  }

  function saveCustomPreset(preset) {
    var normalized = normalizePreset(preset);
    normalized.builtIn = false;
    var list = getCustomPresets();
    var next = [];
    var replaced = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === normalized.id) {
        next.push(normalized);
        replaced = true;
      } else {
        next.push(list[i]);
      }
    }
    if (!replaced) next.push(normalized);
    safeStorageSet(STORAGE_LIBRARY_KEY, JSON.stringify(next));
    return normalized;
  }

  function deleteCustomPreset(id) {
    if (!id) return;
    var list = getCustomPresets().filter(function(item) {
      return item.id !== id;
    });
    safeStorageSet(STORAGE_LIBRARY_KEY, JSON.stringify(list));
  }

  function pushActivePreset(preset) {
    var normalized = normalizePreset(preset);
    safeStorageSet(STORAGE_ACTIVE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function createRenderer(canvas, preset) {
    if (!canvas) return null;
    var gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    }) || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    function compileShader(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    }

    var vertexSource = [
      'attribute vec2 a_pos;',
      'void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }'
    ].join('\n');

    var fragmentSource = [
      'precision highp float;',
      'uniform float u_time;',
      'uniform vec2 u_res;',
      'uniform float u_speed;',
      'uniform float u_rings;',
      'uniform float u_spread;',
      'uniform float u_noise;',
      'uniform float u_orbit;',
      'uniform int u_src;',
      'uniform int u_mode;',
      'uniform int u_palCount;',
      'uniform vec3 u_pal[8];',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
      'float noise(vec2 p){',
      '  vec2 i = floor(p);',
      '  vec2 f = fract(p);',
      '  float a = hash(i);',
      '  float b = hash(i + vec2(1.0, 0.0));',
      '  float c = hash(i + vec2(0.0, 1.0));',
      '  float d = hash(i + vec2(1.0, 1.0));',
      '  vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;',
      '}',
      'vec3 paletteSample(float t){',
      '  t = clamp(t, 0.0, 1.0);',
      '  float n = float(u_palCount - 1);',
      '  float idx = t * n;',
      '  int i0 = int(idx);',
      '  float f = fract(idx);',
      '  vec3 a = u_pal[0];',
      '  vec3 b = u_pal[1];',
      '  if(i0 == 1){ a = u_pal[1]; b = u_pal[2]; }',
      '  if(i0 == 2){ a = u_pal[2]; b = u_pal[3]; }',
      '  if(i0 == 3){ a = u_pal[3]; b = u_pal[4]; }',
      '  if(i0 == 4){ a = u_pal[4]; b = u_pal[5]; }',
      '  if(i0 == 5){ a = u_pal[5]; b = u_pal[6]; }',
      '  if(i0 == 6){ a = u_pal[6]; b = u_pal[7]; }',
      '  return mix(a, b, f);',
      '}',
      'vec2 centerFor(float fi, float total, vec2 asp){',
      '  float t = u_time * u_speed;',
      '  if(u_mode == 0){',
      '    float ang = (fi / max(total, 1.0)) * 6.28318 + t * (0.12 + fi * 0.07);',
      '    float orb = (u_src == 1) ? 0.0 : (u_orbit + 0.12 * sin(t * 0.3 + fi * 1.3));',
      '    return clamp(vec2(0.5) + vec2(cos(ang), sin(ang)) * orb / asp, 0.0, 1.0);',
      '  }',
      '  float driftA = sin(t * (0.27 + fi * 0.05) + fi * 1.7);',
      '  float driftB = cos(t * (0.21 + fi * 0.04) + fi * 2.3);',
      '  float cloud = noise(vec2(fi * 3.7, t * 0.25 + fi)) - 0.5;',
      '  vec2 offset = vec2(driftA, driftB) * (u_orbit * 0.9 + cloud * 0.18);',
      '  return clamp(vec2(0.5) + offset / asp, 0.0, 1.0);',
      '}',
      'void main(){',
      '  vec2 uv = gl_FragCoord.xy / u_res.xy;',
      '  vec2 asp = vec2(u_res.x / u_res.y, 1.0);',
      '  float total = float(u_src);',
      '  vec3 col = vec3(0.0);',
      '  float totalW = 0.0;',
      '  for(int i = 0; i < 8; i++){',
      '    if(i >= u_src) break;',
      '    float fi = float(i);',
      '    vec2 center = centerFor(fi, total, asp);',
      '    vec2 delta = (uv - center) * asp;',
      '    float dist = length(delta);',
      '    float field = noise(delta * (4.0 + fi) + vec2(u_time * 0.12, fi * 0.73));',
      '    float warp = mix(0.0, (field - 0.5) * u_noise * 1.35, step(0.0, u_noise));',
      '    float radial = dist + warp;',
      '    float wave = sin(radial * u_rings * 3.14159 - u_time * (2.4 + fi * 0.2) * u_speed) * 0.5 + 0.5;',
      '    float shimmer = sin(radial * u_rings * 5.49779 - u_time * (1.6 + fi * 0.13) * u_speed + field * 3.14159) * 0.5 + 0.5;',
      '    float mixT = mix(wave, shimmer, 0.32 + u_noise * 0.18);',
      '    float falloff = exp(-dist * (1.2 + u_noise * 0.35) * u_spread);',
      '    col += paletteSample(mixT) * falloff;',
      '    totalW += falloff;',
      '  }',
      '  gl_FragColor = vec4(col / max(totalW, 0.001), 1.0);',
      '}'
    ].join('\n');

    var vert = compileShader(gl.VERTEX_SHADER, vertexSource);
    var frag = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vert || !frag) return null;

    var program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    var posLoc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    var uTime = gl.getUniformLocation(program, 'u_time');
    var uRes = gl.getUniformLocation(program, 'u_res');
    var uSpeed = gl.getUniformLocation(program, 'u_speed');
    var uRings = gl.getUniformLocation(program, 'u_rings');
    var uSpread = gl.getUniformLocation(program, 'u_spread');
    var uNoise = gl.getUniformLocation(program, 'u_noise');
    var uOrbit = gl.getUniformLocation(program, 'u_orbit');
    var uSrc = gl.getUniformLocation(program, 'u_src');
    var uMode = gl.getUniformLocation(program, 'u_mode');
    var uPalCount = gl.getUniformLocation(program, 'u_palCount');
    var uPal = gl.getUniformLocation(program, 'u_pal');

    var state = normalizePreset(preset || loadActivePreset());
    var rafId = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function applyPreset(nextPreset) {
      state = normalizePreset(nextPreset);
      var flat = [];
      for (var i = 0; i < 8; i++) {
        var rgb = hexToRgb01(state.colors[Math.min(i, state.colors.length - 1)]);
        flat.push(rgb[0], rgb[1], rgb[2]);
      }
      gl.useProgram(program);
      gl.uniform1f(uSpeed, state.speed);
      gl.uniform1f(uRings, state.rings);
      gl.uniform1f(uSpread, state.spread);
      gl.uniform1f(uNoise, state.noise);
      gl.uniform1f(uOrbit, state.orbit);
      gl.uniform1i(uSrc, state.sourceCount);
      gl.uniform1i(uMode, state.engine === 'random-wave' ? 1 : 0);
      gl.uniform1i(uPalCount, state.colors.length);
      gl.uniform3fv(uPal, new Float32Array(flat));
    }

    function frame(ts) {
      gl.uniform1f(uTime, ts * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = window.requestAnimationFrame(frame);
    }

    function handleVisibility() {
      if (document.hidden) {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = 0;
        return;
      }
      if (!rafId) rafId = window.requestAnimationFrame(frame);
    }

    function destroy() {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    }

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    canvas.addEventListener('webglcontextlost', function(e) {
      e.preventDefault();
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
    });

    resize();
    applyPreset(state);
    rafId = window.requestAnimationFrame(frame);

    return {
      destroy: destroy,
      getPreset: function() { return clone(state); },
      update: function(nextPreset) { applyPreset(nextPreset); }
    };
  }

  function startCanvas(canvasOrId, options) {
    var canvas = typeof canvasOrId === 'string' ? document.getElementById(canvasOrId) : canvasOrId;
    if (!canvas) return null;
    return createRenderer(canvas, options && options.preset ? options.preset : loadActivePreset());
  }

  window.KioskBackground = {
    BUILTIN_PRESETS: BUILTIN_PRESETS.map(function(item) { return clone(item); }),
    deleteCustomPreset: deleteCustomPreset,
    getPresetLibrary: getPresetLibrary,
    loadActivePreset: loadActivePreset,
    normalizePreset: normalizePreset,
    pushActivePreset: pushActivePreset,
    saveCustomPreset: saveCustomPreset,
    startCanvas: startCanvas
  };
})();
