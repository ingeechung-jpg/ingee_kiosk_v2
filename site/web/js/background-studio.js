(function() {
  if (!window.KioskBackground) return;

  var ACTIVE_PRESET_ID = '__active__';

  var els = {
    presetSelect: document.getElementById('preset-select'),
    presetName: document.getElementById('preset-name'),
    engineSelect: document.getElementById('engine-select'),
    colorCount: document.getElementById('color-count'),
    colorCountValue: document.getElementById('color-count-value'),
    themeText: document.getElementById('theme-text'),
    themeMuted: document.getElementById('theme-muted'),
    themeLine: document.getElementById('theme-line'),
    themeHover: document.getElementById('theme-hover'),
    themeHoverOpacity: document.getElementById('theme-hover-opacity'),
    themeHoverOpacityValue: document.getElementById('theme-hover-opacity-value'),
    themeCardOpacity: document.getElementById('theme-card-opacity'),
    themeCardOpacityValue: document.getElementById('theme-card-opacity-value'),
    effectCircle: document.getElementById('effect-controls-circle'),
    effectRandom: document.getElementById('effect-controls-random'),
    effectContour: document.getElementById('effect-controls-contour'),
    effectPrism: document.getElementById('effect-controls-prism'),
    sourceCount: document.getElementById('source-count'),
    sourceCountValue: document.getElementById('source-count-value'),
    rings: document.getElementById('rings'),
    ringsValue: document.getElementById('rings-value'),
    spread: document.getElementById('spread'),
    spreadValue: document.getElementById('spread-value'),
    speed: document.getElementById('speed'),
    speedValue: document.getElementById('speed-value'),
    orbit: document.getElementById('orbit'),
    orbitValue: document.getElementById('orbit-value'),
    noise: document.getElementById('noise'),
    noiseValue: document.getElementById('noise-value'),
    randomSourceCount: document.getElementById('random-source-count'),
    randomSourceCountValue: document.getElementById('random-source-count-value'),
    randomRings: document.getElementById('random-rings'),
    randomRingsValue: document.getElementById('random-rings-value'),
    randomSpread: document.getElementById('random-spread'),
    randomSpreadValue: document.getElementById('random-spread-value'),
    randomSpeed: document.getElementById('random-speed'),
    randomSpeedValue: document.getElementById('random-speed-value'),
    randomOrbit: document.getElementById('random-orbit'),
    randomOrbitValue: document.getElementById('random-orbit-value'),
    randomNoise: document.getElementById('random-noise'),
    randomNoiseValue: document.getElementById('random-noise-value'),
    contourSourceCount: document.getElementById('contour-source-count'),
    contourSourceCountValue: document.getElementById('contour-source-count-value'),
    contourRings: document.getElementById('contour-rings'),
    contourRingsValue: document.getElementById('contour-rings-value'),
    contourSpread: document.getElementById('contour-spread'),
    contourSpreadValue: document.getElementById('contour-spread-value'),
    contourSpeed: document.getElementById('contour-speed'),
    contourSpeedValue: document.getElementById('contour-speed-value'),
    contourNoise: document.getElementById('contour-noise'),
    contourNoiseValue: document.getElementById('contour-noise-value'),
    contourOrbit: document.getElementById('contour-orbit'),
    contourOrbitValue: document.getElementById('contour-orbit-value'),
    fieldHorizon: document.getElementById('field-horizon'),
    fieldHorizonValue: document.getElementById('field-horizon-value'),
    fieldTilt: document.getElementById('field-tilt'),
    fieldTiltValue: document.getElementById('field-tilt-value'),
    prismSourceCount: document.getElementById('prism-source-count'),
    prismSourceCountValue: document.getElementById('prism-source-count-value'),
    prismSpread: document.getElementById('prism-spread'),
    prismSpreadValue: document.getElementById('prism-spread-value'),
    prismSpeed: document.getElementById('prism-speed'),
    prismSpeedValue: document.getElementById('prism-speed-value'),
    prismNoise: document.getElementById('prism-noise'),
    prismNoiseValue: document.getElementById('prism-noise-value'),
    prismOrbit: document.getElementById('prism-orbit'),
    prismOrbitValue: document.getElementById('prism-orbit-value'),
    prismFieldHorizon: document.getElementById('prism-field-horizon'),
    prismFieldHorizonValue: document.getElementById('prism-field-horizon-value'),
    prismFieldTilt: document.getElementById('prism-field-tilt'),
    prismFieldTiltValue: document.getElementById('prism-field-tilt-value'),
    prismGlow: document.getElementById('prism-glow'),
    prismGlowValue: document.getElementById('prism-glow-value'),
    prismTwist: document.getElementById('prism-twist'),
    prismTwistValue: document.getElementById('prism-twist-value'),
    prismSoftness: document.getElementById('prism-softness'),
    prismSoftnessValue: document.getElementById('prism-softness-value'),
    paletteControls: document.getElementById('palette-controls'),
    newPresetBtn: document.getElementById('new-preset-btn'),
    deletePresetBtn: document.getElementById('delete-preset-btn'),
    savePresetBtn: document.getElementById('save-preset-btn'),
    pushPresetBtn: document.getElementById('push-preset-btn'),
    panelToggleBtn: document.getElementById('panel-toggle-btn'),
    status: document.getElementById('studio-status')
  };

  var currentPreset = window.KioskBackground.loadActivePreset();
  var renderer = window.KioskBackground.startCanvas('studio-canvas', { preset: currentPreset });
  var filePreset = null;
  var effectSections = {
    'circle-wave': els.effectCircle,
    'random-wave': els.effectRandom,
    'contour-field': els.effectContour,
    'prism-bloom': els.effectPrism
  };
  var controlFields = [
    { input: els.engineSelect, field: els.engineSelect ? els.engineSelect.closest('.studio-field') : null, reason: 'Original mode uses the clean circle generator.' },
    { input: els.sourceCount, field: els.sourceCount ? els.sourceCount.closest('.studio-field') : null, reason: 'Original mode always uses a single centered source.' },
    { input: els.noise, field: els.noise ? els.noise.closest('.studio-field') : null, reason: 'Original mode keeps the ring shape perfectly clean.' },
    { input: els.orbit, field: els.orbit ? els.orbit.closest('.studio-field') : null, reason: 'Original mode keeps the rings fixed at the center.' }
  ];
  var engineControlMap = {
    'circle-wave': {
      sourceCount: els.sourceCount,
      rings: els.rings,
      spread: els.spread,
      speed: els.speed,
      orbit: els.orbit,
      noise: els.noise
    },
    'random-wave': {
      sourceCount: els.randomSourceCount,
      rings: els.randomRings,
      spread: els.randomSpread,
      speed: els.randomSpeed,
      orbit: els.randomOrbit,
      noise: els.randomNoise
    },
    'contour-field': {
      sourceCount: els.contourSourceCount,
      rings: els.contourRings,
      spread: els.contourSpread,
      speed: els.contourSpeed,
      orbit: els.contourOrbit,
      noise: els.contourNoise,
      fieldHorizon: els.fieldHorizon,
      fieldTilt: els.fieldTilt
    },
    'prism-bloom': {
      sourceCount: els.prismSourceCount,
      spread: els.prismSpread,
      speed: els.prismSpeed,
      orbit: els.prismOrbit,
      noise: els.prismNoise,
      fieldHorizon: els.prismFieldHorizon,
      fieldTilt: els.prismFieldTilt,
      prismGlow: els.prismGlow,
      prismTwist: els.prismTwist,
      prismSoftness: els.prismSoftness
    }
  };

  function formatNumber(value) {
    return (Math.round(value * 100) / 100).toFixed(2).replace(/\.00$/, '');
  }

  function setStatus(message) {
    if (els.status) els.status.textContent = message || '';
  }

  function fetchStudioJson(url, options) {
    return fetch(url, options || {}).then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function getLibrary() {
    return window.KioskBackground.getPresetLibrary();
  }

  function getActiveLibraryPreset() {
    var preset = filePreset ? window.KioskBackground.normalizePreset(filePreset) : window.KioskBackground.loadActivePreset();
    preset.id = ACTIVE_PRESET_ID;
    preset.label = 'Current Background File';
    preset.builtIn = true;
    return preset;
  }

  function isBuiltIn(id) {
    if (id === ACTIVE_PRESET_ID) return true;
    var library = getLibrary();
    for (var i = 0; i < library.length; i++) {
      if (library[i].id === id) return !!library[i].builtIn;
    }
    return false;
  }

  function renderPresetOptions(selectedId) {
    var library = getLibrary();
    var activePreset = getActiveLibraryPreset();
    var builtIn = library.filter(function(item) { return item.builtIn; });
    var saved = library.filter(function(item) { return !item.builtIn; }).sort(function(a, b) {
      return String(a.label || '').localeCompare(String(b.label || ''));
    });
    var html = '';

    function renderGroup(label, items) {
      if (!items.length) return '';
      var out = '<optgroup label="' + label + '">';
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var selected = item.id === selectedId ? ' selected' : '';
        out += '<option value="' + item.id + '"' + selected + '>' + item.label + '</option>';
      }
      out += '</optgroup>';
      return out;
    }

    html += renderGroup('Current', [activePreset]);
    html += renderGroup('Built-in', builtIn);
    html += renderGroup('Saved', saved);
    els.presetSelect.innerHTML = html;
  }

  function updateToggleLabel() {
    if (!els.panelToggleBtn) return;
    els.panelToggleBtn.textContent = document.body.classList.contains('studio-preview-mode') ? 'View UI' : 'Hide UI';
  }

  function togglePanel() {
    document.body.classList.toggle('studio-preview-mode');
    updateToggleLabel();
  }

  function setFieldDisabled(control, disabled) {
    if (!control || !control.input) return;
    control.input.disabled = !!disabled;
    if (control.field) {
      control.field.classList.toggle('studio-field--disabled', !!disabled);
      if (disabled && control.reason) {
        control.field.setAttribute('title', control.reason);
      } else {
        control.field.removeAttribute('title');
      }
    }
  }

  function refreshControlAvailability() {
    var isCleanCircle = !!currentPreset.cleanCircle;
    for (var i = 0; i < controlFields.length; i++) {
      setFieldDisabled(controlFields[i], isCleanCircle);
    }
    var engines = Object.keys(effectSections);
    for (var j = 0; j < engines.length; j++) {
      if (effectSections[engines[j]]) {
        effectSections[engines[j]].hidden = engines[j] !== currentPreset.engine;
      }
    }
  }

  function getEngineControls(engine) {
    return engineControlMap[engine] || engineControlMap['circle-wave'];
  }

  function readEngineValue(key) {
    var controls = getEngineControls(els.engineSelect.value);
    var input = controls[key];
    return input ? Number(input.value) : Number(currentPreset[key] || 0);
  }

  function setEngineValue(engine, key, value) {
    var controls = getEngineControls(engine);
    var input = controls[key];
    if (input) input.value = String(value);
  }

  function setValueText(input, output) {
    if (input && output) output.textContent = formatNumber(Number(input.value));
  }

  function readFormPreset() {
    var colors = [];
    var inputs = els.paletteControls.querySelectorAll('[data-color-input]');
    for (var i = 0; i < inputs.length; i++) colors.push(inputs[i].value);
    return window.KioskBackground.normalizePreset({
      id: currentPreset.id,
      label: els.presetName.value || currentPreset.label,
      engine: els.engineSelect.value,
      colors: colors,
      sourceCount: readEngineValue('sourceCount'),
      rings: readEngineValue('rings') || currentPreset.rings,
      spread: readEngineValue('spread') || currentPreset.spread,
      speed: readEngineValue('speed') || currentPreset.speed,
      noise: readEngineValue('noise'),
      orbit: readEngineValue('orbit'),
      fieldHorizon: readEngineValue('fieldHorizon'),
      fieldTilt: readEngineValue('fieldTilt'),
      prismGlow: readEngineValue('prismGlow') || currentPreset.prismGlow,
      prismTwist: readEngineValue('prismTwist') || currentPreset.prismTwist,
      prismSoftness: readEngineValue('prismSoftness') || currentPreset.prismSoftness,
      themeText: els.themeText.value,
      themeMuted: els.themeMuted.value,
      themeLine: els.themeLine.value,
      themeHover: els.themeHover.value,
      themeHoverOpacity: Number(els.themeHoverOpacity.value),
      themeCardOpacity: Number(els.themeCardOpacity.value),
      cleanCircle: !!currentPreset.cleanCircle,
      builtIn: currentPreset.builtIn
    });
  }

  function syncValueLabels() {
    els.colorCountValue.textContent = String(els.colorCount.value);
    if (els.sourceCountValue) els.sourceCountValue.textContent = String(els.sourceCount.value);
    if (els.randomSourceCountValue) els.randomSourceCountValue.textContent = String(els.randomSourceCount.value);
    if (els.contourSourceCountValue) els.contourSourceCountValue.textContent = String(els.contourSourceCount.value);
    if (els.prismSourceCountValue) els.prismSourceCountValue.textContent = String(els.prismSourceCount.value);
    setValueText(els.rings, els.ringsValue);
    setValueText(els.spread, els.spreadValue);
    setValueText(els.speed, els.speedValue);
    setValueText(els.orbit, els.orbitValue);
    setValueText(els.noise, els.noiseValue);
    setValueText(els.randomRings, els.randomRingsValue);
    setValueText(els.randomSpread, els.randomSpreadValue);
    setValueText(els.randomSpeed, els.randomSpeedValue);
    setValueText(els.randomOrbit, els.randomOrbitValue);
    setValueText(els.randomNoise, els.randomNoiseValue);
    setValueText(els.contourRings, els.contourRingsValue);
    setValueText(els.contourSpread, els.contourSpreadValue);
    setValueText(els.contourSpeed, els.contourSpeedValue);
    setValueText(els.contourOrbit, els.contourOrbitValue);
    setValueText(els.contourNoise, els.contourNoiseValue);
    setValueText(els.fieldHorizon, els.fieldHorizonValue);
    setValueText(els.fieldTilt, els.fieldTiltValue);
    setValueText(els.prismSpread, els.prismSpreadValue);
    setValueText(els.prismSpeed, els.prismSpeedValue);
    setValueText(els.prismOrbit, els.prismOrbitValue);
    setValueText(els.prismNoise, els.prismNoiseValue);
    setValueText(els.prismFieldHorizon, els.prismFieldHorizonValue);
    setValueText(els.prismFieldTilt, els.prismFieldTiltValue);
    setValueText(els.prismGlow, els.prismGlowValue);
    setValueText(els.prismTwist, els.prismTwistValue);
    setValueText(els.prismSoftness, els.prismSoftnessValue);
    setValueText(els.themeHoverOpacity, els.themeHoverOpacityValue);
    setValueText(els.themeCardOpacity, els.themeCardOpacityValue);
  }

  function renderPaletteControls(colors) {
    var html = '';
    for (var i = 0; i < colors.length; i++) {
      html += [
        '<label class="studio-color">',
        '  <span class="studio-field__label">Color ' + (i + 1) + '</span>',
        '  <input class="studio-color__swatch" data-color-input type="color" value="' + colors[i] + '">',
        '  <input class="studio-color__text" data-color-text type="text" value="' + colors[i] + '">',
        '</label>'
      ].join('');
    }
    els.paletteControls.innerHTML = html;

    var swatches = els.paletteControls.querySelectorAll('[data-color-input]');
    var texts = els.paletteControls.querySelectorAll('[data-color-text]');
    function bindPair(index) {
      swatches[index].addEventListener('input', function() {
        texts[index].value = swatches[index].value;
        updatePreviewFromForm();
      });
      texts[index].addEventListener('change', function() {
        var value = String(texts[index].value || '').trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
          texts[index].value = swatches[index].value;
          return;
        }
        swatches[index].value = value;
        updatePreviewFromForm();
      });
    }
    for (var i = 0; i < swatches.length; i++) bindPair(i);
  }

  function applyPresetToForm(preset) {
    currentPreset = window.KioskBackground.normalizePreset(preset);
    els.presetName.value = currentPreset.label;
    els.engineSelect.value = currentPreset.engine;
    els.colorCount.value = String(currentPreset.colors.length);
    setEngineValue('circle-wave', 'sourceCount', currentPreset.sourceCount);
    setEngineValue('circle-wave', 'rings', currentPreset.rings);
    setEngineValue('circle-wave', 'spread', currentPreset.spread);
    setEngineValue('circle-wave', 'speed', currentPreset.speed);
    setEngineValue('circle-wave', 'noise', currentPreset.noise);
    setEngineValue('circle-wave', 'orbit', currentPreset.orbit);
    setEngineValue('random-wave', 'sourceCount', currentPreset.sourceCount);
    setEngineValue('random-wave', 'rings', currentPreset.rings);
    setEngineValue('random-wave', 'spread', currentPreset.spread);
    setEngineValue('random-wave', 'speed', currentPreset.speed);
    setEngineValue('random-wave', 'noise', currentPreset.noise);
    setEngineValue('random-wave', 'orbit', currentPreset.orbit);
    setEngineValue('contour-field', 'sourceCount', currentPreset.sourceCount);
    setEngineValue('contour-field', 'rings', currentPreset.rings);
    setEngineValue('contour-field', 'spread', currentPreset.spread);
    setEngineValue('contour-field', 'speed', currentPreset.speed);
    setEngineValue('contour-field', 'noise', currentPreset.noise);
    setEngineValue('contour-field', 'orbit', currentPreset.orbit);
    setEngineValue('contour-field', 'fieldHorizon', currentPreset.fieldHorizon || 0);
    setEngineValue('contour-field', 'fieldTilt', currentPreset.fieldTilt || 0);
    setEngineValue('prism-bloom', 'sourceCount', currentPreset.sourceCount);
    setEngineValue('prism-bloom', 'spread', currentPreset.spread);
    setEngineValue('prism-bloom', 'speed', currentPreset.speed);
    setEngineValue('prism-bloom', 'noise', currentPreset.noise);
    setEngineValue('prism-bloom', 'orbit', currentPreset.orbit);
    setEngineValue('prism-bloom', 'fieldHorizon', currentPreset.fieldHorizon || 0);
    setEngineValue('prism-bloom', 'fieldTilt', currentPreset.fieldTilt || 0);
    setEngineValue('prism-bloom', 'prismGlow', currentPreset.prismGlow);
    setEngineValue('prism-bloom', 'prismTwist', currentPreset.prismTwist);
    setEngineValue('prism-bloom', 'prismSoftness', currentPreset.prismSoftness);
    els.themeText.value = currentPreset.themeText;
    els.themeMuted.value = currentPreset.themeMuted;
    els.themeLine.value = currentPreset.themeLine;
    els.themeHover.value = currentPreset.themeHover;
    els.themeHoverOpacity.value = String(currentPreset.themeHoverOpacity);
    els.themeCardOpacity.value = String(currentPreset.themeCardOpacity);
    syncValueLabels();
    refreshControlAvailability();
    renderPaletteControls(currentPreset.colors);
    if (renderer && renderer.update) renderer.update(currentPreset);
    els.deletePresetBtn.disabled = !!currentPreset.builtIn;
  }

  function updatePreviewFromForm() {
    currentPreset = readFormPreset();
    syncValueLabels();
    if (renderer && renderer.update) renderer.update(currentPreset);
  }

  function adjustPaletteCount() {
    var nextCount = Number(els.colorCount.value);
    var nextPreset = readFormPreset();
    var colors = nextPreset.colors.slice();
    while (colors.length < nextCount) {
      colors.push(colors[colors.length - 1] || '#ffffff');
    }
    colors = colors.slice(0, nextCount);
    nextPreset.colors = colors;
    applyPresetToForm(nextPreset);
    setStatus('Palette size updated.');
  }

  function savePreset() {
    var draft = readFormPreset();
    var label = String(els.presetName.value || '').trim();
    if (!label) {
      setStatus('Preset name is required.');
      return;
    }

    if (currentPreset.builtIn) {
      draft.id = 'custom-' + Date.now() + '-' + draft.id;
    } else {
      draft.id = currentPreset.id || ('custom-' + Date.now() + '-' + draft.id);
    }

    draft.label = label;
    draft.updatedAt = new Date().toISOString();
    var saved = window.KioskBackground.saveCustomPreset(draft);
    renderPresetOptions(saved.id);
    applyPresetToForm(saved);
    els.presetSelect.value = saved.id;
    setStatus('Preset saved to the dropdown library.');
  }

  function pushPreset() {
    var draft = readFormPreset();
    fetchStudioJson('./__studio/background-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft)
    }).then(function() {
      filePreset = window.KioskBackground.normalizePreset(draft);
      currentPreset = filePreset;
      renderPresetOptions(ACTIVE_PRESET_ID);
      els.presetSelect.value = ACTIVE_PRESET_ID;
      setStatus('background.json saved locally. Commit and push when you are ready.');
    }).catch(function(err) {
      setStatus('Could not save background.json: ' + String(err.message || err));
    });
  }

  function deletePreset() {
    if (currentPreset.builtIn) {
      setStatus('Built-in presets cannot be deleted.');
      return;
    }
    window.KioskBackground.deleteCustomPreset(currentPreset.id);
    var fallback = window.KioskBackground.normalizePreset(window.KioskBackground.BUILTIN_PRESETS[0]);
    window.KioskBackground.pushActivePreset(fallback);
    renderPresetOptions(fallback.id);
    applyPresetToForm(fallback);
    els.presetSelect.value = fallback.id;
    setStatus('Saved preset deleted.');
  }

  function createNewPreset() {
    var base = window.KioskBackground.normalizePreset(
      window.KioskBackground.getDefaultPreset ? window.KioskBackground.getDefaultPreset() : window.KioskBackground.BUILTIN_PRESETS[0]
    );
    base.id = 'draft-' + Date.now();
    base.label = 'New preset';
    base.builtIn = false;
    renderPresetOptions(ACTIVE_PRESET_ID);
    applyPresetToForm(base);
    els.presetSelect.value = '';
    setStatus('New draft ready. Adjust the sliders and save it.');
  }

  els.presetSelect.addEventListener('change', function() {
    var preset = null;
    var selectedId = els.presetSelect.value;
    if (selectedId === ACTIVE_PRESET_ID) {
      applyPresetToForm(getActiveLibraryPreset());
      setStatus('Loaded the current kiosk background setting.');
      return;
    }
    var library = getLibrary();
    for (var i = 0; i < library.length; i++) {
      if (library[i].id === selectedId) {
        preset = library[i];
        break;
      }
    }
    if (!preset) return;
    applyPresetToForm(preset);
    setStatus(isBuiltIn(selectedId) ? 'Loaded built-in generator preset.' : 'Loaded saved preset.');
  });

  if (els.panelToggleBtn) {
    els.panelToggleBtn.addEventListener('click', togglePanel);
  }
  els.newPresetBtn.addEventListener('click', createNewPreset);
  els.deletePresetBtn.addEventListener('click', deletePreset);
  els.savePresetBtn.addEventListener('click', savePreset);
  els.pushPresetBtn.addEventListener('click', pushPreset);
  els.engineSelect.addEventListener('change', updatePreviewFromForm);
  [
    els.sourceCount, els.rings, els.spread, els.speed, els.noise, els.orbit,
    els.randomSourceCount, els.randomRings, els.randomSpread, els.randomSpeed, els.randomNoise, els.randomOrbit,
    els.contourSourceCount, els.contourRings, els.contourSpread, els.contourSpeed, els.contourNoise, els.contourOrbit, els.fieldHorizon, els.fieldTilt,
    els.prismSourceCount, els.prismSpread, els.prismSpeed, els.prismNoise, els.prismOrbit, els.prismFieldHorizon, els.prismFieldTilt,
    els.prismGlow, els.prismTwist, els.prismSoftness, els.themeHoverOpacity, els.themeCardOpacity
  ].forEach(function(input) {
    if (input) input.addEventListener('input', updatePreviewFromForm);
  });
  [els.themeText, els.themeMuted, els.themeLine, els.themeHover].forEach(function(input) {
    if (input) input.addEventListener('input', updatePreviewFromForm);
  });
  els.colorCount.addEventListener('input', adjustPaletteCount);
  els.presetName.addEventListener('input', function() {
    currentPreset.label = els.presetName.value;
  });

  function bootstrapStudio() {
    fetchStudioJson('./__studio/background-config').then(function(preset) {
      filePreset = window.KioskBackground.normalizePreset(preset);
      renderPresetOptions(ACTIVE_PRESET_ID);
      applyPresetToForm(filePreset);
      els.presetSelect.value = ACTIVE_PRESET_ID;
      updateToggleLabel();
      if (!renderer) {
        setStatus('Preview unavailable: WebGL is not supported in this browser.');
        return;
      }
      setStatus('Loaded background.json from the local studio server.');
    }).catch(function() {
      filePreset = window.KioskBackground.getDefaultPreset ? window.KioskBackground.getDefaultPreset() : currentPreset;
      renderPresetOptions(ACTIVE_PRESET_ID);
      applyPresetToForm(filePreset);
      els.presetSelect.value = ACTIVE_PRESET_ID;
      updateToggleLabel();
      if (!renderer) {
        setStatus('Preview unavailable: WebGL is not supported in this browser.');
      } else {
        setStatus('Local studio server not found. Start npm run studio to edit background.json.');
      }
    });
  }

  bootstrapStudio();
})();
