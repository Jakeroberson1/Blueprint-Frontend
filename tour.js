(function () {
  const TOUR_KEY = 'bpTourState';
  const OVERLAY_ID = 'bpTourOverlay';
  const POPOVER_ID = 'bpTourPopover';
  const TARGET_CLASS = 'bp-tour-target';
  const STEP_QUERY_KEY = 'bp_tour_step';

  function getPageName() {
    const p = window.location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function readState() {
    try {
      const raw = localStorage.getItem(TOUR_KEY);
      if (!raw) return { active: false, step: 0 };
      const parsed = JSON.parse(raw);
      return {
        active: !!parsed.active,
        step: Number.isFinite(Number(parsed.step)) ? Number(parsed.step) : 0
      };
    } catch {
      return { active: false, step: 0 };
    }
  }

  function writeState(state) {
    localStorage.setItem(TOUR_KEY, JSON.stringify(state));
  }

  function clearUi() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    const pop = document.getElementById(POPOVER_ID);
    if (pop) pop.remove();
    document.querySelectorAll('.' + TARGET_CLASS).forEach((el) => el.classList.remove(TARGET_CLASS));
  }

  function ensureStyles() {
    if (document.getElementById('bpTourStyles')) return;
    const style = document.createElement('style');
    style.id = 'bpTourStyles';
    style.textContent = `
      .${TARGET_CLASS} {
        position: relative !important;
        z-index: 10001 !important;
        outline: 4px solid rgba(26,115,232,0.98) !important;
        border-radius: 12px !important;
        box-shadow: 0 0 0 10px rgba(26,115,232,0.26), 0 0 28px rgba(26,115,232,0.55) !important;
      }
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        background: rgba(15,23,42,0.45);
        z-index: 10000;
      }
      #${POPOVER_ID} {
        position: fixed;
        width: min(360px, 92vw);
        background: rgba(255,255,255,0.98);
        border: 1px solid rgba(229,231,235,1);
        border-radius: 14px;
        padding: 12px;
        z-index: 10002;
        box-shadow: 0 18px 40px rgba(15,23,42,0.22);
        font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      }
      #${POPOVER_ID} .bp-tour-title { font-size: 16px; font-weight: 900; margin: 0 0 6px; }
      #${POPOVER_ID} .bp-tour-body { margin: 0; color: rgba(71,85,105,0.95); font-size: 13px; line-height: 1.45; }
      #${POPOVER_ID} .bp-tour-meta { margin-top: 8px; font-size: 11px; font-weight: 800; color: rgba(100,116,139,1); text-transform: uppercase; }
      #${POPOVER_ID} .bp-tour-actions { margin-top: 10px; display: flex; justify-content: space-between; gap: 8px; }
      #${POPOVER_ID} .bp-tour-actions button {
        border: 1px solid rgba(229,231,235,1);
        background: rgba(249,250,251,1);
        border-radius: 10px;
        padding: 7px 10px;
        font-weight: 800;
        cursor: pointer;
      }
      #${POPOVER_ID} .bp-tour-actions .primary {
        border-color: rgba(26,115,232,1);
        background: rgba(26,115,232,1);
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  function getTarget(selector) {
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  function getStepFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const raw = params.get(STEP_QUERY_KEY);
      if (raw === null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  function clearStepQueryFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has(STEP_QUERY_KEY)) return;
      url.searchParams.delete(STEP_QUERY_KEY);
      const nextSearch = url.searchParams.toString();
      const next = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash || ''}`;
      window.history.replaceState({}, '', next);
    } catch {}
  }

  function positionPopover(pop, target) {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const pad = 12;
    let top = Math.max(pad, Math.floor((viewportH - pop.offsetHeight) / 2));
    let left = Math.max(pad, Math.floor((viewportW - pop.offsetWidth) / 2));

    if (target) {
      const rect = target.getBoundingClientRect();
      const below = rect.bottom + 10;
      const above = rect.top - pop.offsetHeight - 10;
      top = below + pop.offsetHeight <= viewportH - pad ? below : Math.max(pad, above);
      left = Math.min(viewportW - pop.offsetWidth - pad, Math.max(pad, rect.left));
    }

    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
  }

  window.initBlueprintTour = function initBlueprintTour(config) {
    ensureStyles();
    const steps = Array.isArray(config?.steps) ? config.steps : [];
    if (!steps.length) return;

    async function finishTour(skipped) {
      clearUi();
      writeState({ active: false, step: 0 });
      if (typeof config?.onComplete === 'function') {
        try { await config.onComplete({ skipped: !!skipped }); } catch {}
      }
    }

    function navigateForStep(stepIndex) {
      const step = steps[stepIndex];
      if (!step) return;
      if (step.page !== getPageName()) {
        const dest = new URL(step.page, window.location.href);
        dest.searchParams.set(STEP_QUERY_KEY, String(stepIndex));
        window.location.href = dest.toString();
      }
    }

    function showStep(stepIndex, attempt) {
      const step = steps[stepIndex];
      if (!step) return finishTour(false);

      if (step.page !== getPageName()) {
        navigateForStep(stepIndex);
        return;
      }

      clearUi();
      writeState({ active: true, step: stepIndex });

      const overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      document.body.appendChild(overlay);

      const target = getTarget(step.selector);
      const tries = Number(attempt || 0);
      if (step.selector && !target && tries < 20) {
        // Cross-page render timing can delay target availability.
        window.setTimeout(() => showStep(stepIndex, tries + 1), 100);
        return;
      }
      if (target) {
        target.classList.add(TARGET_CLASS);
        target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      }

      const pop = document.createElement('div');
      pop.id = POPOVER_ID;
      pop.innerHTML = `
        <div class="bp-tour-meta">Step ${stepIndex + 1} of ${steps.length}</div>
        <h4 class="bp-tour-title">${step.title || 'Tour Step'}</h4>
        <p class="bp-tour-body">${step.body || ''}</p>
        <div class="bp-tour-actions">
          <div style="display:flex; gap:8px;">
            <button type="button" id="bpTourBack">Back</button>
            <button type="button" id="bpTourSkip">Skip</button>
          </div>
          <button type="button" class="primary" id="bpTourNext">${stepIndex >= steps.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      `;
      document.body.appendChild(pop);
      window.setTimeout(() => positionPopover(pop, target), 80);

      const back = document.getElementById('bpTourBack');
      const skip = document.getElementById('bpTourSkip');
      const next = document.getElementById('bpTourNext');

      if (back) back.disabled = stepIndex <= 0;
      if (back) back.onclick = () => showStep(Math.max(0, stepIndex - 1));
      if (skip) skip.onclick = () => finishTour(true);
      if (next) next.onclick = () => {
        if (stepIndex >= steps.length - 1) {
          finishTour(false);
        } else {
          showStep(stepIndex + 1);
        }
      };
    }

    window.startBlueprintTour = function startBlueprintTour() {
      showStep(0);
    };

    window.resumeBlueprintTour = function resumeBlueprintTour() {
      const state = readState();
      if (!state.active) return;
      const idx = Math.max(0, Math.min(steps.length - 1, state.step));
      showStep(idx);
    };

    window.cancelBlueprintTour = function cancelBlueprintTour() {
      finishTour(true);
    };

    const stepFromUrl = getStepFromUrl();
    if (stepFromUrl !== null) {
      writeState({ active: true, step: stepFromUrl });
      clearStepQueryFromUrl();
    }

    const state = readState();
    if (state.active) {
      // Allow full page layout to settle before trying to attach highlight.
      window.setTimeout(() => window.resumeBlueprintTour(), 50);
    }
  };
})();
