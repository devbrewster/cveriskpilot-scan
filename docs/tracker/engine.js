/**
 * Release Tracker Engine v1.0
 *
 * Config-driven release tracker for any SaaS or software project.
 * Reads a project config JSON and renders an interactive phase/task tracker.
 *
 * Usage:
 *   1. Create a config JSON (see configs/saas-starter.config.json for schema)
 *   2. Load engine: <script src="engine.js"></script>
 *   3. Init: ReleasTracker.init({ configUrl: 'configs/my-project.config.json' })
 *
 *   Or open index.html to pick a project from the launcher.
 */

// eslint-disable-next-line no-unused-vars
const ReleaseTracker = (() => {

  // ── State ──
  let CONFIG = null;
  let CONFIG_TASK_STATUS = {};  // Map of task.id → status from config JSON
  let STORAGE_KEY = 'release_tracker_default';
  let currentFilter = 'all';

  // ── LocalStorage ──
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function getTaskState(id) {
    // localStorage override takes precedence if it exists
    const lsStatus = loadState()[id];
    if (lsStatus) return lsStatus;
    // Config-defined status is the default
    if (CONFIG_TASK_STATUS[id]) return CONFIG_TASK_STATUS[id];
    return 'pending';
  }
  function setTaskState(id, status) {
    const s = loadState(); s[id] = status; saveState(s);
  }

  // ── Stats ──
  function getPhaseStats(phase) {
    let total = 0, completed = 0, inProgress = 0;
    (phase.milestones || []).forEach(m => (m.tasks || []).forEach(t => {
      total++;
      const s = getTaskState(t.id);
      if (s === 'completed') completed++;
      else if (s === 'in_progress') inProgress++;
    }));
    return { total, completed, inProgress, pending: total - completed - inProgress };
  }

  function getOverallStats() {
    let total = 0, completed = 0, inProgress = 0;
    (CONFIG.phases || []).forEach(p => {
      const s = getPhaseStats(p);
      total += s.total; completed += s.completed; inProgress += s.inProgress;
    });
    return { total, completed, inProgress, pending: total - completed - inProgress };
  }

  function getCategoryList() {
    const cats = new Set();
    (CONFIG.phases || []).forEach(p => { if (p.category) cats.add(p.category); });
    return [...cats];
  }

  // ── Rendering ──
  function renderHeader() {
    const meta = CONFIG.meta || {};
    const hasOrch = !!(CONFIG.orchestrator);
    const el = document.getElementById('trackerHeader');
    el.innerHTML = `
      <div class="header-inner">
        <div class="header-left">
          <div class="logo" style="background:${meta.logoGradient || 'linear-gradient(135deg,#58a6ff,#bc8cff)'}">${meta.logoText || 'RT'}</div>
          <h1>${meta.name || 'Release Tracker'} <span>${meta.subtitle || ''}</span></h1>
          ${hasOrch ? `
          <div class="view-tabs">
            <button class="view-tab active" data-view="phases" onclick="ReleaseTracker.switchView('phases')">Phases</button>
            <button class="view-tab" data-view="orchestrator" onclick="ReleaseTracker.switchView('orchestrator')">Agent Orchestrator</button>
          </div>` : ''}
        </div>
        <div class="stats-bar" id="statsBar"></div>
      </div>`;
  }

  function renderStatsBar() {
    const stats = getOverallStats();
    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    document.getElementById('statsBar').innerHTML = `
      <div class="stat"><div class="stat-value" style="color:var(--green)">${stats.completed}</div><div class="stat-label">Done</div></div>
      <div class="stat"><div class="stat-value" style="color:var(--yellow)">${stats.inProgress}</div><div class="stat-label">Active</div></div>
      <div class="stat"><div class="stat-value">${stats.pending}</div><div class="stat-label">Pending</div></div>
      <div class="stat"><div class="stat-value">${stats.total}</div><div class="stat-label">Total</div></div>
      <div class="stat"><div class="stat-value" style="color:var(--accent)">${pct}%</div><div class="stat-label">Complete</div></div>`;
  }

  function renderOverallBar() {
    const stats = getOverallStats();
    const cPct = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    const iPct = stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0;
    document.getElementById('overallBar').innerHTML = `
      <div class="progress-bar-segment" style="width:${cPct}%;background:var(--green)"></div>
      <div class="progress-bar-segment" style="width:${iPct}%;background:var(--yellow)"></div>`;
  }

  function renderFilters() {
    const cats = getCategoryList();
    const container = document.getElementById('viewControls');
    const catBtns = cats.map(c =>
      `<button class="view-btn" data-filter="${c}" onclick="ReleaseTracker.setFilter('${c}',this)">${c.charAt(0).toUpperCase() + c.slice(1)}</button>`
    ).join('');
    container.innerHTML = `
      <span class="filter-label">Filter:</span>
      <button class="view-btn active" data-filter="all" onclick="ReleaseTracker.setFilter('all',this)">All Phases</button>
      ${catBtns}
      <span class="filter-label" style="margin-left:auto;">Expand:</span>
      <button class="view-btn" onclick="ReleaseTracker.expandAll()">All</button>
      <button class="view-btn" onclick="ReleaseTracker.collapseAll()">None</button>`;
  }

  function renderTimeline() {
    const container = document.getElementById('timeline');
    const phases = currentFilter === 'all'
      ? CONFIG.phases
      : CONFIG.phases.filter(p => p.category === currentFilter);

    container.innerHTML = phases.map(phase => {
      const stats = getPhaseStats(phase);
      const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      const phaseStatus = stats.completed === stats.total && stats.total > 0 ? 'completed'
        : (stats.inProgress > 0 || stats.completed > 0) ? 'in-progress' : 'pending';
      const progressColor = pct === 100 ? 'var(--green)' : pct > 0 ? 'var(--yellow)' : 'var(--border)';

      return `
        <div class="phase-card status-${phaseStatus}" id="${phase.id}">
          <div class="phase-header" onclick="ReleaseTracker.togglePhase('${phase.id}')">
            <div class="phase-icon" style="background:${phase.iconBg || 'var(--surface)'}">${phase.icon || '&#x1F4E6;'}</div>
            <div class="phase-info">
              <div class="phase-title">
                ${phase.title}
                ${phase.badge ? `<span class="phase-badge badge-${phase.badgeClass || 'default'}">${phase.badge}</span>` : ''}
              </div>
              <div class="phase-meta">
                ${phase.timeline ? `<span>${phase.timeline}</span>` : ''}
                ${phase.duration ? `<span>${phase.duration}</span>` : ''}
                <span>${stats.completed}/${stats.total} tasks</span>
                ${phase.description ? `<span style="color:var(--text-dim);font-style:italic">${phase.description}</span>` : ''}
              </div>
            </div>
            <div class="phase-progress">
              <div class="phase-progress-pct" style="color:${progressColor}">${pct}%</div>
              <div class="phase-progress-bar">
                <div class="phase-progress-fill" style="width:${pct}%;background:${progressColor}"></div>
              </div>
            </div>
            <div class="phase-chevron">&#x25B6;</div>
          </div>
          <div class="phase-body">
            ${(phase.milestones || []).map(m => `
              <div class="milestone-group">
                <div class="milestone-title">${m.title}</div>
                ${(m.tasks || []).map(t => {
                  const ts = getTaskState(t.id);
                  const cbExtra = ts === 'in_progress' ? 'in-progress' : '';
                  return `
                    <div class="task-item ${ts === 'completed' ? 'completed' : ''}">
                      <input type="checkbox" class="task-checkbox ${cbExtra}"
                        ${ts === 'completed' ? 'checked' : ''}
                        onclick="ReleaseTracker.cycleTask('${t.id}')"
                        title="Click to cycle: pending > in progress > completed">
                      <div class="task-content">
                        <div class="task-name">${t.name}</div>
                        ${t.detail ? `<div class="task-detail">${t.detail}</div>` : ''}
                      </div>
                      ${t.source ? `<span class="task-source">${t.source}</span>` : ''}
                    </div>`;
                }).join('')}
              </div>
            `).join('')}
          </div>
        </div>`;
    }).join('');
  }

  function renderRolloutGates() {
    const gates = CONFIG.rolloutGates;
    if (!gates || gates.length === 0) {
      document.getElementById('rolloutSection').style.display = 'none';
      return;
    }
    const meta = CONFIG.meta || {};
    document.getElementById('rolloutSection').innerHTML = `
      <div class="section-title">${meta.rolloutTitle || 'Release Gates'}</div>
      <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px;">${meta.rolloutDescription || 'Each gate requires acceptance criteria before advancing.'}</p>
      <div class="rollout-grid">
        ${gates.map(g => `
          <div class="rollout-card ${g.cssClass || ''}">
            <h3>${g.title}</h3>
            <div class="rollout-duration">${g.duration || ''}</div>
            <ul class="rollout-criteria">
              ${(g.criteria || []).map(c => `<li>${c}</li>`).join('')}
            </ul>
            ${g.mapsTo ? `<div class="maps-to">Maps to: <strong>${g.mapsTo}</strong></div>` : ''}
          </div>
        `).join('')}
      </div>`;
  }

  function renderKPIs() {
    const kpis = CONFIG.kpis;
    if (!kpis || kpis.length === 0) {
      document.getElementById('kpiSection').style.display = 'none';
      return;
    }
    document.getElementById('kpiSection').innerHTML = `
      <div class="section-title">${CONFIG.meta?.kpiTitle || 'SLO / KPI Targets'}</div>
      <table class="slo-table">
        <thead><tr><th>Metric</th><th>Target</th><th>Notes</th></tr></thead>
        <tbody>
          ${kpis.map(k => `
            <tr>
              <td>${k.metric}</td>
              <td class="slo-target">${k.target}</td>
              <td>${k.notes || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  function renderFooter() {
    const meta = CONFIG.meta || {};
    document.getElementById('trackerFooter').innerHTML =
      `${meta.name || 'Release Tracker'} &middot; Progress saved to browser localStorage &middot; <a href="index.html" style="color:var(--accent);text-decoration:none;">Switch Project</a>`;
  }

  // ── Orchestrator View ──
  let currentView = 'phases'; // 'phases' | 'orchestrator'

  function getWaveStats(wave) {
    let total = 0, completed = 0, inProgress = 0;
    (wave.tasks || []).forEach(t => {
      total++;
      const s = getTaskState(t.id);
      if (s === 'completed') completed++;
      else if (s === 'in_progress') inProgress++;
    });
    return { total, completed, inProgress, pending: total - completed - inProgress };
  }

  function getWaveStatus(wave) {
    const orch = CONFIG.orchestrator;
    if (!orch) return 'pending';
    const stats = getWaveStats(wave);
    if (stats.completed === stats.total && stats.total > 0) return 'completed';
    // Check if dependencies are met
    const deps = wave.dependsOn || [];
    const depsMet = deps.every(depId => {
      const depWave = orch.waves.find(w => w.id === depId);
      if (!depWave) return true;
      const ds = getWaveStats(depWave);
      return ds.completed === ds.total && ds.total > 0;
    });
    if (!depsMet) return 'blocked';
    if (stats.inProgress > 0 || stats.completed > 0) return 'in-progress';
    return 'ready';
  }

  function getAgentById(id) {
    return (CONFIG.orchestrator?.agents || []).find(a => a.id === id) || { name: id, color: '#8b949e', icon: '&#x1F916;' };
  }

  function renderOrchestrator() {
    const orch = CONFIG.orchestrator;
    const container = document.getElementById('orchestratorView');
    if (!orch) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">No orchestrator config found. Add an "orchestrator" section to your config JSON.</div>';
      return;
    }

    // Agent roster
    const agents = orch.agents || [];
    const waves = orch.waves || [];

    // Compute agent workload
    const agentWorkload = {};
    agents.forEach(a => { agentWorkload[a.id] = { total: 0, completed: 0, inProgress: 0 }; });
    waves.forEach(w => (w.tasks || []).forEach(t => {
      const aid = t.agent || 'orchestrator';
      if (!agentWorkload[aid]) agentWorkload[aid] = { total: 0, completed: 0, inProgress: 0 };
      agentWorkload[aid].total++;
      const s = getTaskState(t.id);
      if (s === 'completed') agentWorkload[aid].completed++;
      else if (s === 'in_progress') agentWorkload[aid].inProgress++;
    }));

    container.innerHTML = `
      <div class="orch-description">
        <p>${orch.description || ''}</p>
      </div>

      <!-- Agent Roster -->
      <div class="section-title">Agent Roster</div>
      <div class="agent-roster">
        ${agents.map(a => {
          const wl = agentWorkload[a.id] || { total: 0, completed: 0, inProgress: 0 };
          const pct = wl.total > 0 ? Math.round((wl.completed / wl.total) * 100) : 0;
          const statusClass = wl.inProgress > 0 ? 'agent-active' : wl.completed === wl.total && wl.total > 0 ? 'agent-done' : '';
          return `
            <div class="agent-card ${statusClass}" style="--agent-color:${a.color}">
              <div class="agent-icon">${a.icon}</div>
              <div class="agent-info">
                <div class="agent-name">${a.name}</div>
                <div class="agent-role">${a.role}</div>
              </div>
              <div class="agent-workload">
                <div class="agent-pct" style="color:${a.color}">${pct}%</div>
                <div class="agent-counts">${wl.completed}/${wl.total}</div>
                ${wl.inProgress > 0 ? `<div class="agent-active-badge">${wl.inProgress} active</div>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>

      <!-- Wave Execution -->
      <div class="section-title" style="margin-top:32px;">Wave Execution</div>
      <div class="wave-timeline">
        ${waves.map((wave, idx) => {
          const stats = getWaveStats(wave);
          const status = getWaveStatus(wave);
          const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          const deps = (wave.dependsOn || []).map(d => {
            const dw = waves.find(w => w.id === d);
            return dw ? dw.title.split(':')[0] : d;
          });

          // Group tasks by agent
          const byAgent = {};
          (wave.tasks || []).forEach(t => {
            const aid = t.agent || 'orchestrator';
            if (!byAgent[aid]) byAgent[aid] = [];
            byAgent[aid].push(t);
          });

          const statusColors = {
            'completed': 'var(--green)',
            'in-progress': 'var(--yellow)',
            'ready': 'var(--accent)',
            'blocked': 'var(--red)',
            'pending': 'var(--border)'
          };
          const statusLabels = {
            'completed': 'COMPLETED',
            'in-progress': 'IN PROGRESS',
            'ready': 'READY',
            'blocked': 'BLOCKED',
            'pending': 'PENDING'
          };

          return `
            <div class="wave-card status-${status}" id="${wave.id}">
              <div class="wave-header" onclick="ReleaseTracker.togglePhase('${wave.id}')">
                <div class="wave-number" style="background:${statusColors[status]}">${idx}</div>
                <div class="wave-info">
                  <div class="wave-title">
                    ${wave.title}
                    <span class="wave-status-badge" style="background:${statusColors[status]}20;color:${statusColors[status]}">${statusLabels[status]}</span>
                  </div>
                  <div class="wave-meta">
                    <span>${wave.description || ''}</span>
                  </div>
                  ${deps.length > 0 ? `<div class="wave-deps">Depends on: ${deps.map(d => `<span class="dep-tag">${d}</span>`).join(' ')}</div>` : ''}
                </div>
                <div class="wave-agents-preview">
                  ${Object.keys(byAgent).map(aid => {
                    const ag = getAgentById(aid);
                    return `<span class="agent-dot" style="background:${ag.color}" title="${ag.name}">${ag.icon}</span>`;
                  }).join('')}
                </div>
                <div class="phase-progress">
                  <div class="phase-progress-pct" style="color:${statusColors[status]}">${pct}%</div>
                  <div class="phase-progress-bar">
                    <div class="phase-progress-fill" style="width:${pct}%;background:${statusColors[status]}"></div>
                  </div>
                </div>
                <div class="phase-chevron">&#x25B6;</div>
              </div>
              <div class="phase-body">
                ${Object.entries(byAgent).map(([aid, tasks]) => {
                  const ag = getAgentById(aid);
                  return `
                    <div class="milestone-group">
                      <div class="milestone-title" style="color:${ag.color}">
                        ${ag.icon} ${ag.name}
                      </div>
                      ${tasks.map(t => {
                        const ts = getTaskState(t.id);
                        const cbExtra = ts === 'in_progress' ? 'in-progress' : '';
                        return `
                          <div class="task-item ${ts === 'completed' ? 'completed' : ''}">
                            <input type="checkbox" class="task-checkbox ${cbExtra}"
                              ${ts === 'completed' ? 'checked' : ''}
                              onclick="ReleaseTracker.cycleTask('${t.id}')"
                              title="Click to cycle: pending > in progress > completed">
                            <div class="task-content">
                              <div class="task-name">${t.name}</div>
                            </div>
                            <span class="task-source" style="border:1px solid ${ag.color}40;color:${ag.color}">${ag.name.replace(' Agent','')}</span>
                          </div>`;
                      }).join('')}
                    </div>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>

      <!-- Dependency Graph (visual) -->
      <div class="section-title" style="margin-top:32px;">Dependency Graph</div>
      <div class="dep-graph">
        ${waves.map((wave, idx) => {
          const status = getWaveStatus(wave);
          const stats = getWaveStats(wave);
          const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          const statusColors = { 'completed':'var(--green)', 'in-progress':'var(--yellow)', 'ready':'var(--accent)', 'blocked':'var(--red)', 'pending':'var(--border)' };
          const deps = wave.dependsOn || [];
          return `
            <div class="dep-node" style="--node-color:${statusColors[status]}">
              <div class="dep-node-header">Wave ${idx}</div>
              <div class="dep-node-title">${wave.title.split(': ')[1] || wave.title}</div>
              <div class="dep-node-bar"><div style="width:${pct}%;background:${statusColors[status]};height:100%;border-radius:3px;"></div></div>
              <div class="dep-node-pct">${pct}%</div>
              ${deps.length > 0 ? `<div class="dep-node-arrows">${deps.map(d => {
                const di = waves.findIndex(w => w.id === d);
                return `<span class="dep-arrow">&#x2190; W${di}</span>`;
              }).join(' ')}</div>` : '<div class="dep-node-arrows"><span class="dep-arrow" style="color:var(--green)">START</span></div>'}
            </div>`;
        }).join(`<div class="dep-connector"></div>`)}
      </div>`;
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.view-tab[data-view="${view}"]`)?.classList.add('active');

    const phasesEl = document.getElementById('phasesView');
    const orchEl = document.getElementById('orchestratorView');
    const filtersEl = document.getElementById('viewControls');
    const rolloutEl = document.getElementById('rolloutSection');
    const kpiEl = document.getElementById('kpiSection');

    if (view === 'phases') {
      phasesEl.style.display = '';
      orchEl.style.display = 'none';
      filtersEl.style.display = '';
      rolloutEl.style.display = '';
      kpiEl.style.display = '';
    } else {
      phasesEl.style.display = 'none';
      orchEl.style.display = '';
      filtersEl.style.display = 'none';
      rolloutEl.style.display = 'none';
      kpiEl.style.display = 'none';
      renderOrchestrator();
    }
  }

  function render() {
    renderStatsBar();
    renderOverallBar();
    renderTimeline();
    if (currentView === 'orchestrator') renderOrchestrator();
  }

  // ── Public API ──
  return {
    async init(opts = {}) {
      const configUrl = opts.configUrl || new URLSearchParams(location.search).get('config') || 'configs/cveriskpilot.config.json';

      try {
        const res = await fetch(configUrl);
        if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
        CONFIG = await res.json();
      } catch (e) {
        document.getElementById('timeline').innerHTML =
          `<div style="padding:40px;text-align:center;color:var(--red)">
            <h2>Failed to load project config</h2>
            <p style="margin-top:8px;color:var(--text-muted)">${e.message}<br>Config URL: ${configUrl}</p>
            <a href="index.html" style="color:var(--accent)">Back to project launcher</a>
          </div>`;
        return;
      }

      STORAGE_KEY = `rt_${CONFIG.meta?.id || 'default'}_v1`;

      // Build lookup map of config-defined task statuses
      CONFIG_TASK_STATUS = {};
      (CONFIG.phases || []).forEach(p =>
        (p.milestones || []).forEach(m =>
          (m.tasks || []).forEach(t => {
            if (t.status) CONFIG_TASK_STATUS[t.id] = t.status;
          })
        )
      );
      if (CONFIG.orchestrator) {
        (CONFIG.orchestrator.waves || []).forEach(w =>
          (w.tasks || []).forEach(t => {
            if (t.status) CONFIG_TASK_STATUS[t.id] = t.status;
          })
        );
      }

      renderHeader();
      renderFilters();
      renderOverallBar();
      renderStatsBar();
      renderTimeline();
      renderRolloutGates();
      renderKPIs();
      renderFooter();
    },

    setFilter(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.view-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTimeline();
    },

    switchView(view) { switchView(view); },
    togglePhase(id) { document.getElementById(id)?.classList.toggle('expanded'); },
    expandAll() { document.querySelectorAll('.phase-card').forEach(c => c.classList.add('expanded')); },
    collapseAll() { document.querySelectorAll('.phase-card').forEach(c => c.classList.remove('expanded')); },

    cycleTask(id) {
      const configStatus = CONFIG_TASK_STATUS[id];
      const lsStatus = loadState()[id];
      const current = lsStatus || configStatus || 'pending';
      const next = current === 'pending' ? 'in_progress' : current === 'in_progress' ? 'completed' : 'pending';
      setTaskState(id, next);
      render();
    },

    resetAll() {
      if (confirm('Reset all progress? This will clear localStorage overrides and revert to config-defined states.')) {
        localStorage.removeItem(STORAGE_KEY);
        render();
      }
    },

    exportProgress() {
      const state = loadState();
      const blob = new Blob([JSON.stringify({ projectId: CONFIG.meta?.id, exportedAt: new Date().toISOString(), tasks: state }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${CONFIG.meta?.id || 'project'}-progress-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
    },

    importProgress() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        try {
          const text = await e.target.files[0].text();
          const data = JSON.parse(text);
          if (data.tasks) { saveState(data.tasks); render(); }
        } catch (err) { alert('Invalid progress file: ' + err.message); }
      };
      input.click();
    },

    getConfig() { return CONFIG; },
  };
})();
