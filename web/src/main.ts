import './styles/tokens.css';
import './styles/layout.css';

import { api } from './api/client';
import type { BootstrapPayload, EnrichedLiftItemDTO, TrendPayload, WorkoutSetInput } from './api/types';
import { drawCapsuleBarChart, drawMiniWaveCanvas } from './components/CapsuleChart';
import { renderMiniDayRingSVG } from './components/GappedRing';
import { bindAndDrawHorizonCanvas, renderHorizonExplorerHTML } from './components/HorizonExplorer';
import { flushOfflineQueue, generateLocalUUID, listQueuedWorkouts, logOrQueueWorkout } from './offline/queue';
import { renderCalibrationDrawerHTML, renderDataSyncDrawerHTML } from './views/Drawers';
import { renderFitnessViewHTML } from './views/FitnessView';
import { renderHealthViewHTML } from './views/HealthView';
import { computeCalcWeights, renderLiftLoggerViewHTML, TARE_PRESETS, type LiftLoggerState } from './views/LiftLoggerView';
import { renderSleepViewHTML } from './views/SleepView';
import { renderTodayViewHTML } from './views/TodayView';

type TabKey = 'today' | 'fitness' | 'sleep' | 'health' | 'lift';

interface AppState {
  theme: 'light' | 'dark';
  viewport: 'desktop' | 'mobile';
  activeTab: TabKey;
  selectedDate: string;
  stepMode: '24h' | '7d';
  liftQuery: string;
  calDrawerOpen: boolean;
  syncDrawerOpen: boolean;
  explorerOpen: boolean;
  activeMetric: string;
  activeHorizon: string;
  bootstrap: BootstrapPayload | null;
  trend: TrendPayload | null;
  toastMessage: string | null;
  lift: LiftLoggerState;
}

const state: AppState = {
  theme: (localStorage.getItem('autofit_theme') as 'light' | 'dark') || 'light',
  viewport: window.innerWidth < 760 ? 'mobile' : 'desktop',
  activeTab: 'today',
  selectedDate: '',
  stepMode: '24h',
  liftQuery: '',
  calDrawerOpen: false,
  syncDrawerOpen: false,
  explorerOpen: true,
  activeMetric: 'lift:bench-press',
  activeHorizon: 'all',
  bootstrap: null,
  trend: null,
  toastMessage: null,
  lift: {
    selectedSplitIdx: 0,
    customItems: [],
    loggedSlugs: {},
    expandedSlug: null,
    weightOverrides: {},
    repsOverrides: {},
    equipOverrides: {},
    calcTargetSlug: null,
    calcEquipKey: 'olympic_45',
    calcPlatesPerSide: [45, 10, 2.5],
    restSecondsLeft: 0,
    simulateOffline: false,
    queuedOfflineCount: 0,
  },
};

let toastTimer: number | null = null;
let restInterval: number | null = null;

function showToast(msg: string): void {
  state.toastMessage = msg;
  renderApp();
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    state.toastMessage = null;
    const el = document.getElementById('m3-toast-banner');
    if (el) el.remove();
  }, 3400);
}

function startRestTimer(seconds: number): void {
  state.lift.restSecondsLeft = seconds;
  if (restInterval) window.clearInterval(restInterval);
  renderApp();
  restInterval = window.setInterval(() => {
    if (state.lift.restSecondsLeft > 0) {
      state.lift.restSecondsLeft -= 1;
      if (state.activeTab === 'lift') {
        const btn = document.getElementById('btn-rest-90');
        if (btn) {
          const s = state.lift.restSecondsLeft;
          btn.textContent = s > 0 ? `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '90s';
          btn.setAttribute('data-on', s > 0 ? 'true' : 'false');
        }
      }
      if (state.lift.restSecondsLeft === 0) {
        if (restInterval) window.clearInterval(restInterval);
        showToast('Rest complete — ready for next set!');
      }
    }
  }, 1000);
}

async function refreshData(date?: string): Promise<void> {
  try {
    const boot = await api.getBootstrap(date || state.selectedDate || undefined);
    state.bootstrap = boot;
    state.selectedDate = boot.selected_date;
    const queued = await listQueuedWorkouts();
    state.lift.queuedOfflineCount = queued.length;
    await refreshTrend(state.activeMetric, state.activeHorizon, false);
    renderApp();
  } catch (err) {
    showToast(`Offline / cached mode: ${(err as Error).message}`);
    renderApp();
  }
}

async function refreshTrend(metric: string, horizon: string, shouldRender = true): Promise<void> {
  state.activeMetric = metric;
  state.activeHorizon = horizon;
  try {
    state.trend = await api.getTrend(metric, horizon);
  } catch {
    // Keep existing trend if offline
  }
  if (shouldRender) renderApp();
}

function renderApp(): void {
  const root = document.getElementById('m3-app');
  if (!root) return;
  root.setAttribute('data-mode', state.theme);
  root.setAttribute('data-viewport', state.viewport);

  const boot = state.bootstrap;
  if (!boot) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px;">
        <div style="width: 44px; height: 44px; border-radius: 14px; background: var(--m3-teal); color: var(--m3-canvas); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">✦</div>
        <strong style="font-size: 15px;">Loading Autofit SQLite Engine…</strong>
      </div>
    `;
    return;
  }

  const activeDay = boot.week_strip[boot.selected_index] || boot.week_strip[boot.week_strip.length - 1];
  const gh = boot.integrations?.google_health;
  const tabTitles: Record<TabKey, string> = {
    today: activeDay?.title || 'Today',
    fitness: 'Fitness & Lifts',
    sleep: 'Sleep & Recovery',
    health: 'Clinical Health',
    lift: '1-Tap Lift Logger',
  };

  const weekStripHTML = (boot.week_strip || [])
    .map((d, idx) => {
      const sel = idx === boot.selected_index;
      return `
        <button
          type="button"
          id="cal-day-${d.date}"
          class="cal-btn"
          data-select-date="${d.date}"
          data-sel="${sel ? 'true' : 'false'}"
        >
          <span style="font-size: 11px; color: var(--m3-ink-2);">${d.day_letter}</span>
          ${renderMiniDayRingSVG(d.steps / 10000, d.day_num, sel)}
        </button>
      `;
    })
    .join('');

  let tabBodyHTML = '';
  switch (state.activeTab) {
    case 'today':
      tabBodyHTML = renderTodayViewHTML(boot, state.stepMode);
      break;
    case 'fitness':
      tabBodyHTML = renderFitnessViewHTML(boot, state.liftQuery);
      break;
    case 'sleep':
      tabBodyHTML = renderSleepViewHTML(boot);
      break;
    case 'health':
      tabBodyHTML = renderHealthViewHTML(boot);
      break;
    case 'lift':
      tabBodyHTML = renderLiftLoggerViewHTML(boot, state.lift);
      break;
  }

  root.innerHTML = `
    <!-- Top App & Viewport Bar -->
    <header class="preview-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="background: var(--m3-teal-tint); color: var(--m3-on-teal); width: 24px; height: 24px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800;">✦</span>
        <strong style="font-size: 14px;">Autofit</strong>
        <span class="tabular" style="color: var(--m3-ink-2); font-weight: 600;">
          ${boot.total_workouts} SQLite workouts
          ${state.lift.queuedOfflineCount > 0 ? ` • ${state.lift.queuedOfflineCount} offline queued` : ''}
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
        <button type="button" id="btn-open-sync" class="m3-pill" style="padding: 5px 11px;">
          <span>⇄ Sync &amp; CSV</span>
          ${gh?.status === 'expiring_soon' ? '<span style="color: var(--m3-amber);">●</span>' : ''}
        </button>

        <div class="m3-seg" role="group" aria-label="Viewport Mode">
          <button type="button" id="btn-vp-mobile" data-vp="mobile" data-on="${state.viewport === 'mobile' ? 'true' : 'false'}">Mobile PWA</button>
          <button type="button" id="btn-vp-desktop" data-vp="desktop" data-on="${state.viewport === 'desktop' ? 'true' : 'false'}">Desktop Web</button>
        </div>

        <button type="button" id="btn-theme-toggle" class="m3-pill" style="padding: 5px 11px;">
          <span>${state.theme === 'light' ? '☾ Dark' : '☀ Light'}</span>
        </button>
      </div>
    </header>

    <div class="app-shell">
      <!-- Desktop Left Navigation Rail -->
      <aside id="m3-rail" aria-label="Primary Navigation">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 18px; width: 100%;">
          <button
            type="button"
            id="rail-fab-lift"
            data-switch-tab="lift"
            style="width: 56px; height: 56px; border-radius: 18px; background: var(--m3-teal); color: var(--m3-canvas); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 12px; font-weight: 700;"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Lift</span>
          </button>

          <nav style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            ${renderRailBtn('today', 'Today', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')}
            ${renderRailBtn('fitness', 'Fitness', '<path d="M3 17l5-5 4 4 8-9"/><path d="M16 7h4v4"/>')}
            ${renderRailBtn('sleep', 'Sleep', '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')}
            ${renderRailBtn('health', 'Health', '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>')}
          </nav>
        </div>

        <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2); text-align: center;">
          WAL Ready<br/>v0.1
        </div>
      </aside>

      <!-- Main Content Stage -->
      <main class="main-stage">
        <div class="stage-inner">
          <!-- Flush Google Health App Bar + 7-Day Ring Strip -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
              <button
                type="button"
                id="btn-device-pill"
                data-toggle-sync="true"
                style="background: var(--m3-surface); padding: 6px 12px 6px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600;"
              >
                <span style="width: 8px; height: 8px; border-radius: 9999px; background: var(--m3-teal);"></span>
                <span>Fitbit Air</span>
                <span class="tabular" style="color: var(--m3-ink-2); font-weight: 500;">${activeDay?.battery_pct || 92}%</span>
              </button>

              <h1 id="top-view-title" style="margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -0.01em;">
                ${tabTitles[state.activeTab]}
              </h1>

              <div style="display: flex; align-items: center; gap: 6px;">
                <button
                  type="button"
                  id="btn-toggle-explorer"
                  class="m3-btn-tonal"
                  style="padding: 6px 11px;"
                >
                  ${state.explorerOpen ? 'Hide 4y Chart' : '4y Trends'}
                </button>
                <button
                  type="button"
                  id="btn-tune-scores"
                  class="m3-pill"
                  style="background: var(--m3-surface); padding: 6px 11px;"
                >
                  Tune
                </button>
              </div>
            </div>

            <div id="week-strip" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px;">
              ${weekStripHTML}
            </div>
          </div>

          ${renderCalibrationDrawerHTML(boot, state.calDrawerOpen)}
          ${renderDataSyncDrawerHTML(boot, state.syncDrawerOpen)}

          ${
            state.explorerOpen
              ? renderHorizonExplorerHTML(state.trend, boot.metric_catalog || [], state.activeHorizon)
              : ''
          }

          ${tabBodyHTML}
        </div>
      </main>

      <!-- Mobile Sticky Frosted Pill Dock + Squircle + Lift FAB -->
      <div id="m3-floating-dock" role="navigation" aria-label="Mobile Navigation">
        <div class="dock-pill">
          ${renderDockBtn('today', 'Today')}
          ${renderDockBtn('fitness', 'Fitness')}
          ${renderDockBtn('sleep', 'Sleep')}
          ${renderDockBtn('health', 'Health')}
        </div>
        <button type="button" id="dock-fab-lift" data-switch-tab="lift" class="dock-fab" aria-label="Log Lift">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          <span style="font-size: 10px;">Lift</span>
        </button>
      </div>
    </div>

    ${
      state.toastMessage
        ? `<div id="m3-toast-banner" class="m3-toast" role="status">${escapeHtml(state.toastMessage)}</div>`
        : ''
    }
  `;

  // Post-render Canvas drawing & interactive bindings
  hydrateCanvases(boot);
  bindInteractiveHandlers(root, boot);
}

function renderRailBtn(tab: TabKey, label: string, svgInner: string): string {
  return `
    <button type="button" id="rail-nav-${tab}" data-switch-tab="${tab}" data-active="${state.activeTab === tab ? 'true' : 'false'}" class="rail-btn">
      <span class="rail-pill">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1">${svgInner}</svg>
      </span>
      <span>${label}</span>
    </button>
  `;
}

function renderDockBtn(tab: TabKey, label: string): string {
  return `
    <button type="button" id="dock-nav-${tab}" data-switch-tab="${tab}" data-active="${state.activeTab === tab ? 'true' : 'false'}" class="dock-tab">
      <span>${label}</span>
    </button>
  `;
}

function hydrateCanvases(boot: BootstrapPayload): void {
  if (state.explorerOpen && state.trend) {
    bindAndDrawHorizonCanvas(
      document.getElementById('longTermCanvas') as HTMLCanvasElement | null,
      document.getElementById('trend-scrub-readout'),
      state.trend
    );
  }

  if (state.activeTab === 'today') {
    const stepsCanvas = document.getElementById('stepsCapsuleCanvas') as HTMLCanvasElement | null;
    if (state.stepMode === '24h') {
      const hrs = boot.intraday?.hourly_steps || new Array(24).fill(0);
      const lbls = hrs.map((_, i) => (i === 0 ? '12a' : i === 6 ? '6a' : i === 12 ? '12p' : i === 18 ? '6p' : i === 23 ? '11p' : ''));
      drawCapsuleBarChart(stepsCanvas, hrs, lbls, '--m3-teal');
    } else {
      const vals = (boot.week_strip || []).map((d) => d.steps);
      const lbls = (boot.week_strip || []).map((d) => d.day_letter);
      drawCapsuleBarChart(stepsCanvas, vals, lbls, '--m3-teal', 10000);
    }

    drawMiniWaveCanvas(
      document.getElementById('rhrMiniWaveCanvas') as HTMLCanvasElement | null,
      boot.intraday?.intraday_hr || [56, 54, 53, 52, 51, 52, 50],
      '--m3-coral'
    );
  }

  if (state.activeTab === 'sleep') {
    const sl14 = boot.intraday?.sleep_14d || [];
    drawCapsuleBarChart(
      document.getElementById('sleep14dCanvas') as HTMLCanvasElement | null,
      sl14.map((d) => d.hours),
      sl14.map((d) => d.label),
      '--m3-blue',
      7.75
    );
  }
}

function bindInteractiveHandlers(root: HTMLElement, boot: BootstrapPayload): void {
  // Theme & Viewport
  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('autofit_theme', state.theme);
    renderApp();
  });

  root.querySelectorAll<HTMLElement>('[data-vp]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vp = btn.getAttribute('data-vp') as 'mobile' | 'desktop';
      if (vp) {
        state.viewport = vp;
        renderApp();
      }
    });
  });

  // Tab switching
  root.querySelectorAll<HTMLElement>('[data-switch-tab]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const tab = el.getAttribute('data-switch-tab') as TabKey;
      if (tab) {
        state.activeTab = tab;
        renderApp();
      }
    });
  });

  // Drawers & Explorer toggles
  document.getElementById('btn-tune-scores')?.addEventListener('click', () => {
    state.calDrawerOpen = !state.calDrawerOpen;
    renderApp();
  });
  document.getElementById('btn-close-cal')?.addEventListener('click', () => {
    state.calDrawerOpen = false;
    renderApp();
  });
  document.getElementById('btn-open-sync')?.addEventListener('click', () => {
    state.syncDrawerOpen = !state.syncDrawerOpen;
    renderApp();
  });
  document.getElementById('btn-device-pill')?.addEventListener('click', () => {
    state.syncDrawerOpen = !state.syncDrawerOpen;
    renderApp();
  });
  document.getElementById('btn-close-sync')?.addEventListener('click', () => {
    state.syncDrawerOpen = false;
    renderApp();
  });
  document.getElementById('btn-toggle-explorer')?.addEventListener('click', () => {
    state.explorerOpen = !state.explorerOpen;
    renderApp();
  });

  // 7-day Calendar selection
  root.querySelectorAll<HTMLElement>('[data-select-date]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dt = btn.getAttribute('data-select-date');
      if (dt) void refreshData(dt);
    });
  });

  // Open any metric in Longitudinal Explorer
  root.querySelectorAll<HTMLElement>('[data-open-metric]').forEach((el) => {
    el.addEventListener('click', (e) => {
      // Ignore clicks directly on nested inputs or buttons unless it's the metric button itself
      const target = e.target as HTMLElement;
      if (target !== el && (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('form'))) {
        return;
      }
      const mKey = el.getAttribute('data-open-metric');
      if (mKey) {
        state.explorerOpen = true;
        void refreshTrend(mKey, state.activeHorizon, true).then(() => {
          document.getElementById('trend-explorer-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    });
  });

  // Horizon Explorer chips & horizon buttons
  root.querySelectorAll<HTMLElement>('[data-metric-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const k = chip.getAttribute('data-metric-chip');
      if (k) void refreshTrend(k, state.activeHorizon, true);
    });
  });
  root.querySelectorAll<HTMLElement>('[data-hz-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hz = btn.getAttribute('data-hz-btn');
      if (hz) void refreshTrend(state.activeMetric, hz, true);
    });
  });

  // Today View: 24h vs 7d step toggle + Quick Weight form
  root.querySelectorAll<HTMLElement>('[data-step-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.stepMode = (btn.getAttribute('data-step-mode') as '24h' | '7d') || '24h';
      renderApp();
    });
  });

  document.getElementById('form-quick-weight')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inp = document.getElementById('input-quick-weight') as HTMLInputElement | null;
    const val = parseFloat(inp?.value || '');
    if (!val || val < 60 || val > 500) {
      showToast('Enter a valid body weight in lb');
      return;
    }
    try {
      await api.logBody(val, boot.body?.body_fat_pct, state.selectedDate);
      showToast(`Logged ${val.toFixed(1)} lb — EWMA & outbound ledger updated!`);
      await refreshData(state.selectedDate);
    } catch (err) {
      showToast(`Weight log failed: ${(err as Error).message}`);
    }
  });

  // Score Calibration Form
  document.getElementById('form-calibration')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = parseFloat((document.getElementById('in-cal-r') as HTMLInputElement)?.value || '84');
    const s = parseFloat((document.getElementById('in-cal-s') as HTMLInputElement)?.value || '88');
    const c = parseFloat((document.getElementById('in-cal-c') as HTMLInputElement)?.value || '412');
    try {
      await api.saveCalibration(r, s, c, state.selectedDate);
      state.calDrawerOpen = false;
      showToast('OLS Calibration curve updated!');
      await refreshData(state.selectedDate);
    } catch (err) {
      showToast(`Calibration error: ${(err as Error).message}`);
    }
  });

  // Sync & .XLSX Backfill Drawer
  document.getElementById('btn-trigger-sync')?.addEventListener('click', async () => {
    try {
      await api.triggerSync();
      showToast('Connector sync poll completed.');
      await refreshData(state.selectedDate);
    } catch (err) {
      showToast(`Sync note: ${(err as Error).message}`);
    }
  });

  document.getElementById('form-xlsx-url')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = (document.getElementById('input-xlsx-url') as HTMLInputElement)?.value.trim();
    if (!url) return;
    try {
      showToast('Importing 2022–2026 Google Sheet (.xlsx)…');
      const res = await api.importXLSXUrl(url);
      showToast(`Imported ${(res.summary as Record<string, number>).workouts_imported || ''} workouts cleanly!`);
      await refreshData();
    } catch (err) {
      showToast(`.xlsx import failed: ${(err as Error).message}`);
    }
  });

  document.getElementById('input-xlsx-file')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      showToast(`Parsing ${file.name}…`);
      const res = await api.importXLSXFile(file);
      showToast(`Backfilled ${(res.summary as Record<string, number>).workouts_imported || ''} workouts!`);
      await refreshData();
    } catch (err) {
      showToast(`Upload error: ${(err as Error).message}`);
    }
  });

  // Fitness View: Lift search + Garmin .FIT upload & sample generator
  const filterInp = document.getElementById('input-filter-lifts') as HTMLInputElement | null;
  if (filterInp) {
    filterInp.addEventListener('input', () => {
      state.liftQuery = filterInp.value;
      const pos = filterInp.selectionStart || filterInp.value.length;
      renderApp();
      const nextInp = document.getElementById('input-filter-lifts') as HTMLInputElement | null;
      if (nextInp) {
        nextInp.focus();
        nextInp.setSelectionRange(pos, pos);
      }
    });
  }

  document.getElementById('btn-sample-fit')?.addEventListener('click', async () => {
    try {
      const res = await api.generateSampleFIT();
      showToast(`Decoded binary .FIT: ${res.activity.splits.length} mile splits • VDOT ${res.activity.vdot_open.toFixed(1)}`);
      await refreshData(state.selectedDate);
    } catch (err) {
      showToast(`.FIT decode error: ${(err as Error).message}`);
    }
  });

  document.getElementById('input-fit-upload')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const res = await api.importFITFile(file);
      showToast(`Imported ${file.name} • VDOT ${res.activity.vdot_open.toFixed(1)}`);
      await refreshData(state.selectedDate);
    } catch (err) {
      showToast(`.FIT upload failed: ${(err as Error).message}`);
    }
  });

  // Health View: SMART Health Links (shlink:/) + FHIR JSON + Manual Biomarker
  document.getElementById('btn-load-sample-shlink')?.addEventListener('click', async () => {
    try {
      const res = await api.getSampleSHLink();
      const inp = document.getElementById('input-shlink-uri') as HTMLInputElement | null;
      if (inp) inp.value = res.shlink;
      showToast('Generated A256GCM encrypted shlink:/ — click Decrypt & Import!');
    } catch (err) {
      showToast(`Sample shlink error: ${(err as Error).message}`);
    }
  });

  document.getElementById('form-shlink-import')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uri = (document.getElementById('input-shlink-uri') as HTMLInputElement)?.value.trim();
    if (!uri) return;
    try {
      const res = await api.importMedical({ shlink: uri });
      showToast(`Decrypted JWE & imported ${res.observations_imported} FHIR R4 LOINC biomarkers!`);
      await refreshData(state.selectedDate);
    } catch (err) {
      showToast(`shlink:/ decrypt error: ${(err as Error).message}`);
    }
  });

  document.getElementById('input-fhir-file')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const res = await api.importMedical({ fhir_json: JSON.parse(txt) });
      showToast(`Imported ${res.observations_imported} FHIR R4 observations!`);
      await refreshData(state.selectedDate);
    } catch (err) {
      showToast(`FHIR JSON error: ${(err as Error).message}`);
    }
  });

  document.getElementById('form-manual-lab')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bio = (document.getElementById('select-manual-biomarker') as HTMLSelectElement)?.value;
    const val = parseFloat((document.getElementById('input-manual-lab-val') as HTMLInputElement)?.value || '');
    if (!bio || !val || val <= 0) return;
    try {
      await api.importMedical({ biomarker: bio, value: val, local_date: state.selectedDate });
      showToast(`Saved ${bio}: ${val}`);
      await refreshData(state.selectedDate);
    } catch (err) {
      showToast(`Lab save error: ${(err as Error).message}`);
    }
  });

  // Lift Logger View handlers
  bindLiftLoggerHandlers(root, boot);
}

function bindLiftLoggerHandlers(root: HTMLElement, boot: BootstrapPayload): void {
  if (state.activeTab !== 'lift') return;

  root.querySelectorAll<HTMLElement>('[data-split-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lift.selectedSplitIdx = parseInt(btn.getAttribute('data-split-idx') || '0', 10);
      state.lift.customItems = [];
      state.lift.calcTargetSlug = null;
      renderApp();
    });
  });

  root.querySelectorAll<HTMLElement>('[data-rest-sec]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = parseInt(btn.getAttribute('data-rest-sec') || '90', 10);
      startRestTimer(sec);
    });
  });

  document.getElementById('btn-toggle-offline-sim')?.addEventListener('click', () => {
    state.lift.simulateOffline = !state.lift.simulateOffline;
    showToast(
      state.lift.simulateOffline
        ? 'Offline Gym Simulation ON: sets queue locally in IndexedDB!'
        : 'Back Online: flushing IndexedDB workout queue…'
    );
    if (!state.lift.simulateOffline) {
      void flushOfflineQueue().then(async (res) => {
        state.lift.queuedOfflineCount = res.remaining;
        if (res.flushed > 0) {
          showToast(`Synced ${res.flushed} queued offline workout(s) to SQLite!`);
          await refreshData(state.selectedDate);
        } else {
          renderApp();
        }
      });
    }
  });

  document.getElementById('btn-flush-offline')?.addEventListener('click', async () => {
    state.lift.simulateOffline = false;
    const res = await flushOfflineQueue();
    state.lift.queuedOfflineCount = res.remaining;
    showToast(`Flushed ${res.flushed} offline workout(s) to SQLite!`);
    await refreshData(state.selectedDate);
  });

  // Plate & Tare Calculator
  document.getElementById('select-calc-target')?.addEventListener('change', (e) => {
    state.lift.calcTargetSlug = (e.target as HTMLSelectElement).value;
    renderApp();
  });

  root.querySelectorAll<HTMLElement>('[data-calc-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-calc-equip') || 'olympic_45';
      state.lift.calcEquipKey = k;
      if (k === 'dumbbell_2x') {
        state.lift.calcPlatesPerSide = [45];
      }
      renderApp();
    });
  });

  root.querySelectorAll<HTMLElement>('[data-add-plate]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = parseFloat(btn.getAttribute('data-add-plate') || '0');
      if (p > 0) {
        state.lift.calcPlatesPerSide = [...state.lift.calcPlatesPerSide, p];
        renderApp();
      }
    });
  });

  document.getElementById('btn-clear-plates')?.addEventListener('click', () => {
    state.lift.calcPlatesPerSide = [];
    renderApp();
  });

  const splits = boot.splits || [];
  const activeSplit = splits[state.lift.selectedSplitIdx] || splits[0];
  const allItems: EnrichedLiftItemDTO[] = [...(activeSplit?.items || []), ...state.lift.customItems];

  document.getElementById('btn-apply-calc')?.addEventListener('click', () => {
    const target = allItems.find((i) => i.slug === state.lift.calcTargetSlug) || allItems[0];
    if (!target) return;
    const preset = TARE_PRESETS[state.lift.calcEquipKey] || TARE_PRESETS.olympic_45;
    const calc = computeCalcWeights(state.lift.calcEquipKey, state.lift.calcPlatesPerSide);
    state.lift.weightOverrides[target.slug] = calc.displayLb;
    state.lift.equipOverrides[target.slug] = {
      equipment: preset.equipment,
      tare: preset.tare,
      mode: preset.mode,
    };
    showToast(`Applied ${calc.formula} (${calc.totalLb.toFixed(1)} lb) to ${target.name}`);
  });

  // Expand/collapse card editor
  root.querySelectorAll<HTMLElement>('[data-expand-slug]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slug = btn.getAttribute('data-expand-slug');
      state.lift.expandedSlug = state.lift.expandedSlug === slug ? null : slug;
      renderApp();
    });
  });

  root.querySelectorAll<HTMLElement>('[data-step-weight]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [slug, deltaStr] = (btn.getAttribute('data-step-weight') || '').split(':');
      const item = allItems.find((i) => i.slug === slug);
      if (!item) return;
      const cur = state.lift.weightOverrides[slug] ?? item.last_display_lb;
      state.lift.weightOverrides[slug] = Math.max(0, cur + parseFloat(deltaStr || '0'));
      renderApp();
    });
  });

  root.querySelectorAll<HTMLInputElement>('[data-input-weight]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const slug = inp.getAttribute('data-input-weight') || '';
      const v = parseFloat(inp.value);
      if (slug && !Number.isNaN(v) && v >= 0) {
        state.lift.weightOverrides[slug] = v;
        renderApp();
      }
    });
  });

  root.querySelectorAll<HTMLInputElement>('[data-input-reps]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const slug = inp.getAttribute('data-input-reps') || '';
      const v = parseInt(inp.value, 10);
      if (slug && v > 0) {
        state.lift.repsOverrides[slug] = v;
        renderApp();
      }
    });
  });

  // Build WorkoutSetInput array for an exercise item
  const buildSetsForItem = (item: EnrichedLiftItemDTO, startIndex: number): WorkoutSetInput[] => {
    const dispLb = state.lift.weightOverrides[item.slug] ?? item.last_display_lb;
    const reps = state.lift.repsOverrides[item.slug] ?? item.target_reps;
    const eqOvr = state.lift.equipOverrides[item.slug];
    const equip = eqOvr?.equipment || item.equipment;
    const tare = eqOvr?.tare ?? item.tare_lb;
    const mode = eqOvr?.mode || item.load_mode;

    const isPerHand = mode === 'per_hand' || equip === 'dumbbell_pair';
    const totalLb = isPerHand ? dispLb * 2 : dispLb;
    const perSide = isPerHand ? dispLb : tare > 0 && totalLb >= tare ? (totalLb - tare) / 2 : totalLb;

    const out: WorkoutSetInput[] = [];
    for (let s = 0; s < item.target_sets; s++) {
      out.push({
        exercise_id: item.exercise_id,
        exercise_slug: item.slug,
        exercise_name: item.name,
        set_index: startIndex + s,
        equipment: equip,
        tare_lb: tare,
        load_mode: mode,
        per_side_or_hand_lb: perSide,
        total_weight_lb: totalLb,
        reps,
      });
    }
    return out;
  };

  // 1-Tap Log single exercise card
  root.querySelectorAll<HTMLElement>('[data-log-lift]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const slug = btn.getAttribute('data-log-lift') || '';
      const item = allItems.find((i) => i.slug === slug);
      if (!item) return;

      const sets = buildSetsForItem(item, 1);
      const res = await logOrQueueWorkout(
        {
          id: generateLocalUUID(),
          local_date: state.selectedDate || boot.anchor_date,
          split_id: activeSplit?.id,
          title: `${activeSplit?.title || 'Gym'} — ${item.name}`,
          sets,
        },
        state.lift.simulateOffline
      );

      state.lift.loggedSlugs[slug] = true;
      state.lift.queuedOfflineCount = res.queuedCount;
      startRestTimer(90);
      if (res.synced) {
        showToast(`Logged ${item.target_sets}× sets of ${item.name} to SQLite!`);
        await refreshData(state.selectedDate);
      } else {
        showToast(`Queued ${item.name} offline in IndexedDB (${res.queuedCount} pending)!`);
      }
    });
  });

  // Add custom exercise card
  document.getElementById('btn-add-custom-exercise')?.addEventListener('click', () => {
    const sel = document.getElementById('select-add-exercise') as HTMLSelectElement | null;
    const slug = sel?.value || '';
    if (!slug) return;
    const ex = (boot.exercises || []).find((e) => e.slug === slug);
    if (!ex) return;
    if (allItems.some((i) => i.slug === slug)) {
      showToast(`${ex.name} is already in this session.`);
      return;
    }
    state.lift.customItems.push({
      exercise_id: ex.id,
      slug: ex.slug,
      name: ex.name,
      primary_muscle: ex.primary_muscle,
      equipment: ex.default_equipment,
      tare_lb: ex.default_tare_lb,
      load_mode: ex.load_mode,
      target_sets: ex.default_sets || 4,
      target_reps: ex.default_reps || 10,
      scheme: `${ex.default_sets || 4} × ${ex.default_reps || 10}`,
      last_display_lb: ex.default_equipment === 'olympic_bar' ? 135 : 35,
      last_total_lb: ex.default_equipment === 'olympic_bar' ? 135 : 70,
      subtitle: `Added from catalog • ${ex.default_equipment}`,
      sparkline: [],
    });
    renderApp();
  });

  // Log Full Split Session
  document.getElementById('btn-log-entire-split')?.addEventListener('click', async () => {
    if (!allItems.length) return;
    const combinedSets: WorkoutSetInput[] = [];
    allItems.forEach((it) => {
      combinedSets.push(...buildSetsForItem(it, combinedSets.length + 1));
      state.lift.loggedSlugs[it.slug] = true;
    });

    const res = await logOrQueueWorkout(
      {
        id: generateLocalUUID(),
        local_date: state.selectedDate || boot.anchor_date,
        split_id: activeSplit?.id,
        title: activeSplit?.title || 'Full Split Session',
        sets: combinedSets,
      },
      state.lift.simulateOffline
    );
    state.lift.queuedOfflineCount = res.queuedCount;
    if (res.synced) {
      showToast(`Saved ${combinedSets.length} sets (${activeSplit?.title}) to SQLite!`);
      await refreshData(state.selectedDate);
    } else {
      showToast(`Saved ${combinedSets.length} sets to IndexedDB offline queue!`);
    }
  });
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Register Offline PWA Service Worker & online sync listeners
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore SW registration failure in restricted sandboxes
    });
  });
}

window.addEventListener('online', () => {
  if (!state.lift.simulateOffline) {
    void flushOfflineQueue().then(async (res) => {
      state.lift.queuedOfflineCount = res.remaining;
      if (res.flushed > 0) {
        showToast(`Synced ${res.flushed} offline workout(s) to SQLite!`);
        await refreshData(state.selectedDate);
      }
    });
  }
});

let resizeTimer: number | null = null;
window.addEventListener('resize', () => {
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (state.bootstrap) hydrateCanvases(state.bootstrap);
  }, 120);
});

void refreshData();
