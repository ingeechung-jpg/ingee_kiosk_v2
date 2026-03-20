(function() {
  if (!window.KioskBackground) return;

  var els = {
    presetSelect: document.getElementById('preset-select'),
    presetName: document.getElementById('preset-name'),
    engineSelect: document.getElementById('engine-select'),
    colorCount: document.getElementById('color-count'),
    colorCountValue: document.getElementById('color-count-value'),
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
    paletteControls: document.getElementById('palette-controls'),
    newPresetBtn: document.getElementById('new-preset-btn'),
    deletePresetBtn: document.getElementById('delete-preset-btn'),
    savePresetBtn: document.getElementById('save-preset-btn'),
    pushPresetBtn: document.getElementById('push-preset-btn'),
    status: document.getElementById('studio-status')
  };

  var currentPreset = window.KioskBackground.loadActivePreset();
  var renderer = window.KioskBackground.startCanvas('studio-canvas', { preset: currentPreset });

  function formatNumber(value) {
    return (Math.round(value * 100) / 100).toFixed(2).replace(/\.00$/, '');
  }

  function setStatus(message) {
    if (els.status) els.status.textContent = message || '';
  }

  function getLibrary() {
    return window.KioskBackground.getPresetLibrary();
  }

  function isBuiltIn(id) {
    var library = getLibrary();
    for (var i = 0; i < library.length; i++) {
      if (library[i].id === id) return !!library[i].builtIn;
    }
    return false;
  }

  function renderPresetOptions(selectedId) {
    var library = getLibrary();
    var builtIn = library.filter(function(item) { return item.builtIn; });
    var saved = library.filter(function(item) { return !item.builtIn; });
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

    html += renderGroup('Built-in', builtIn);
    html += renderGroup('Saved', saved);
    els.presetSelect.innerHTML = html;
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
      sourceCount: Number(els.sourceCount.value),
      rings: Number(els.rings.value),
      spread: Number(els.spread.value),
      speed: Number(els.speed.value),
      noise: Number(els.noise.value),
      orbit: Number(els.orbit.value),
      builtIn: currentPreset.builtIn
    });
  }

  function syncValueLabels() {
    els.colorCountValue.textContent = String(els.colorCount.value);
    els.sourceCountValue.textContent = String(els.sourceCount.value);
    els.ringsValue.textContent = formatNumber(Number(els.rings.value));
    els.spreadValue.textContent = formatNumber(Number(els.spread.value));
    els.speedValue.textContent = formatNumber(Number(els.speed.value));
    els.orbitValue.textContent = formatNumber(Number(els.orbit.value));
    els.noiseValue.textContent = formatNumber(Number(els.noise.value));
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
    els.sourceCount.value = String(currentPreset.sourceCount);
    els.rings.value = String(currentPreset.rings);
    els.spread.value = String(currentPreset.spread);
    els.speed.value = String(currentPreset.speed);
    els.noise.value = String(currentPreset.noise);
    els.orbit.value = String(currentPreset.orbit);
    syncValueLabels();
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
    var pushed = window.KioskBackground.pushActivePreset(draft);
    currentPreset = pushed;
    setStatus('Background pushed. Reload the kiosk page to see it.');
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
    var base = window.KioskBackground.normalizePreset(window.KioskBackground.BUILTIN_PRESETS[0]);
    base.id = 'draft-' + Date.now();
    base.label = 'New preset';
    base.builtIn = false;
    renderPresetOptions('');
    applyPresetToForm(base);
    els.presetSelect.value = '';
    setStatus('New draft ready. Adjust the sliders and save it.');
  }

  els.presetSelect.addEventListener('change', function() {
    var preset = null;
    var selectedId = els.presetSelect.value;
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

  els.newPresetBtn.addEventListener('click', createNewPreset);
  els.deletePresetBtn.addEventListener('click', deletePreset);
  els.savePresetBtn.addEventListener('click', savePreset);
  els.pushPresetBtn.addEventListener('click', pushPreset);
  els.engineSelect.addEventListener('change', updatePreviewFromForm);
  els.sourceCount.addEventListener('input', updatePreviewFromForm);
  els.rings.addEventListener('input', updatePreviewFromForm);
  els.spread.addEventListener('input', updatePreviewFromForm);
  els.speed.addEventListener('input', updatePreviewFromForm);
  els.noise.addEventListener('input', updatePreviewFromForm);
  els.orbit.addEventListener('input', updatePreviewFromForm);
  els.colorCount.addEventListener('input', adjustPaletteCount);
  els.presetName.addEventListener('input', function() {
    currentPreset.label = els.presetName.value;
  });

  renderPresetOptions(currentPreset.id);
  applyPresetToForm(currentPreset);
  els.presetSelect.value = currentPreset.id;
  if (!renderer) {
    setStatus('Preview unavailable: WebGL is not supported in this browser.');
  }
})();
