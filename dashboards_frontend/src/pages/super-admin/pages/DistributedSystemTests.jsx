import React, { useState, useRef, useEffect } from 'react';
import { runDistributedTest } from '../../../api/distributedTests';
import styles from './DistributedSystemTests.module.css';

// ─── Config (mirrors demo_distributed_system.py) ──────────────────────────────

const LABELS = {
  health:         'Health Check',
  registry:       'Store Registry',
  heartbeat:      'Heartbeat',
  cross_store:    'Cross-Store Login',
  cross_region:   'Cross-Region Login',
  p2p_sync:       'P2P User Sync',
  profile_update: 'Profile Propagation',
  revenue:        'Revenue Aggregation',
  auth_reject:    'Auth Rejection',
};

const TEST_LINKS = {
  health:         [],
  registry:       ['hub-mesh'],
  heartbeat:      ['loghub-logs1','loghub-logs2','atlhub-atls1','atlhub-atls2'],
  cross_store:    ['loghub-logs1','loghub-logs2'],
  cross_region:   ['loghub-logs1','hub-mesh','atlhub-atls1'],
  p2p_sync:       ['loghub-logs1','loghub-logs2'],
  profile_update: ['loghub-logs1','loghub-logs2'],
  revenue:        ['loghub-logs1','loghub-logs2','hub-mesh','atlhub-atls1','atlhub-atls2'],
  auth_reject:    [],
};

const TEST_NODES = {
  health:         ['logan-hub','logan-s1','logan-s2','atlanta-hub','atlanta-s1','atlanta-s2'],
  registry:       ['logan-hub','atlanta-hub'],
  heartbeat:      ['logan-s1','logan-s2','atlanta-s1','atlanta-s2','logan-hub','atlanta-hub'],
  cross_store:    ['logan-s1','logan-hub','logan-s2'],
  cross_region:   ['logan-s1','logan-hub','atlanta-hub','atlanta-s1'],
  p2p_sync:       ['logan-s1','logan-s2'],
  profile_update: ['logan-s1','logan-s2'],
  revenue:        ['logan-hub','atlanta-hub','logan-s1','logan-s2','atlanta-s1','atlanta-s2'],
  auth_reject:    ['logan-hub','logan-s1','atlanta-hub'],
};

const ALL_TESTS = Object.keys(LABELS);


// ─── Component ────────────────────────────────────────────────────────────────

export function DistributedSystemTests() {
  const [btnStates,   setBtnStates]   = useState(() => Object.fromEntries(ALL_TESTS.map(t => [t, 'idle'])));
  const [results,     setResults]     = useState({});
  const [nodeStates,  setNodeStates]  = useState({
    'logan-hub': 'unknown', 'logan-s1': 'unknown', 'logan-s2': 'unknown',
    'atlanta-hub': 'unknown', 'atlanta-s1': 'unknown', 'atlanta-s2': 'unknown',
  });
  const [nodeIds,     setNodeIds]     = useState({
    'logan-hub': 'store_id=?', 'logan-s1': 'store_id=?', 'logan-s2': 'store_id=?',
    'atlanta-hub': 'store_id=?', 'atlanta-s1': 'store_id=?', 'atlanta-s2': 'store_id=?',
  });
  const [activeLinks, setActiveLinks] = useState(new Set());
  const [logEntries,  setLogEntries]  = useState([]);
  const [overall,     setOverall]     = useState('idle');

  const running    = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const logRef     = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logEntries]);

  // ── Helpers ────────────────────────────────────────────────────────

  const log = (msg, cls = '') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogEntries(prev => [...prev, { ts, msg, cls }]);
  };

  const activateLinks = (testId, on) => {
    setActiveLinks(prev => {
      const next = new Set(prev);
      (TEST_LINKS[testId] || []).forEach(l => on ? next.add(l) : next.delete(l));
      return next;
    });
  };

  const setNodesChecking = (testId) => {
    setNodeStates(prev => {
      const next = { ...prev };
      (TEST_NODES[testId] || []).forEach(id => { next[id] = 'checking'; });
      return next;
    });
  };

  const clearNodesChecking = (testId) => {
    setNodeStates(prev => {
      const next = { ...prev };
      (TEST_NODES[testId] || []).forEach(id => {
        if (next[id] === 'checking') next[id] = 'unknown';
      });
      return next;
    });
  };

  const applyHealthNodes = (data) => {
    setNodeStates(prev => {
      const next = { ...prev };
      (data.nodes || []).forEach(n => { next[n.id] = n.ok ? 'ok' : 'fail'; });
      return next;
    });
    setNodeIds(prev => {
      const next = { ...prev };
      (data.nodes || []).forEach(n => { if (n.store_id) next[n.id] = `store_id=${n.store_id}`; });
      return next;
    });
  };

  // ── Core runner (no lock — used internally) ────────────────────────

  const runInternal = async (testId) => {
    setBtnStates(prev => ({ ...prev, [testId]: 'running' }));
    setNodesChecking(testId);
    activateLinks(testId, true);
    log(`Starting: ${LABELS[testId]}`, 'info');

    try {
      const data = await runDistributedTest(testId);
      clearNodesChecking(testId);
      activateLinks(testId, false);
      setBtnStates(prev => ({ ...prev, [testId]: data.ok ? 'pass' : 'fail' }));
      setResults(prev => ({ ...prev, [testId]: data }));
      if (testId === 'health') applyHealthNodes(data);
      log(`${data.ok ? '✓' : '✗'} ${LABELS[testId]} — ${data.ok ? 'PASSED' : 'FAILED'}`,
          data.ok ? 'ok' : 'fail');
      return data.ok;
    } catch (e) {
      clearNodesChecking(testId);
      activateLinks(testId, false);
      setBtnStates(prev => ({ ...prev, [testId]: 'fail' }));
      log(`✗ ${LABELS[testId]} — error: ${e.message}`, 'fail');
      return false;
    }
  };

  // ── User-triggered: single test ────────────────────────────────────

  const runOne = async (testId) => {
    if (running.current) return;
    running.current = true;
    setIsLocked(true);
    await runInternal(testId);
    running.current = false;
    setIsLocked(false);
  };

  // ── User-triggered: all tests ──────────────────────────────────────

  const runAll = async () => {
    if (running.current) return;
    running.current = true;
    setIsLocked(true);
    setOverall('running');
    log('▶ Running all tests sequentially…', 'info');

    let anyFail = false;
    for (const testId of ALL_TESTS) {
      const ok = await runInternal(testId);
      if (!ok) anyFail = true;
    }

    setOverall(anyFail ? 'fail' : 'pass');
    log('■ All tests complete', 'info');
    running.current = false;
    setIsLocked(false);
  };

  const overallLabel = overall === 'running' ? 'Running…'
    : overall === 'pass' ? 'All Passed'
    : overall === 'fail' ? 'Some Failed'
    : 'Idle';

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <h1 className={styles.h1}>
          CodePop <span className={styles.accent}>Network</span> Demo
        </h1>
        <span className={`${styles.overallBadge} ${styles[`overall_${overall}`] || ''}`}>
          {overallLabel}
        </span>
      </header>

      {/* ── Main: topology (left) + controls (right 300px) ── */}
      <div className={styles.main}>

        {/* Topology */}
        <div className={styles.topologyPanel}>
          <h2 className={styles.panelHeading}>Live Network Topology</h2>
          <svg viewBox="0 0 820 330" width="100%" preserveAspectRatio="xMidYMid meet">

            <text className={styles.regionLabel} x="210" y="310">LOGAN REGION</text>
            <text className={styles.regionLabel} x="610" y="310">ATLANTA REGION</text>

            {/* Hub mesh connection */}
            <line
              className={[
                styles.link,
                styles.linkMesh,
                activeLinks.has('hub-mesh') ? styles.linkActive : '',
                activeLinks.has('hub-mesh') ? styles.linkMeshActive : '',
              ].join(' ')}
              x1="295" y1="68" x2="525" y2="68"
            />

            {/* Hub → Store connections */}
            {[
              ['loghub-logs1', 195, 105, 100,  224],
              ['loghub-logs2', 210, 105, 295,  224],
              ['atlhub-atls1', 605, 105, 510,  224],
              ['atlhub-atls2', 620, 105, 710,  224],
            ].map(([id, x1, y1, x2, y2]) => (
              <line
                key={id}
                className={`${styles.link} ${activeLinks.has(id) ? styles.linkActive : ''}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
              />
            ))}

            {/* Logan Hub */}
            <NodeShape type="hub" x={110} y={30} w={190} h={75} rx={10}
              label="Logan Hub" sub="hub · logan" storeId={nodeIds['logan-hub']}
              state={nodeStates['logan-hub']} dotCx={290} dotCy={38} dotR={6}/>

            {/* Atlanta Hub */}
            <NodeShape type="hub" x={520} y={30} w={190} h={75} rx={10}
              label="Atlanta Hub" sub="hub · atlanta" storeId={nodeIds['atlanta-hub']}
              state={nodeStates['atlanta-hub']} dotCx={700} dotCy={38} dotR={6}/>

            {/* Logan Store 1 */}
            <NodeShape type="store" x={28} y={224} w={148} h={60} rx={8}
              label="Logan Store 1" sub="store · logan" storeId={nodeIds['logan-s1']}
              state={nodeStates['logan-s1']} dotCx={168} dotCy={230} dotR={5}/>

            {/* Logan Store 2 */}
            <NodeShape type="store" x={220} y={224} w={148} h={60} rx={8}
              label="Logan Store 2" sub="store · logan" storeId={nodeIds['logan-s2']}
              state={nodeStates['logan-s2']} dotCx={360} dotCy={230} dotR={5}/>

            {/* Atlanta Store 1 */}
            <NodeShape type="store" x={440} y={224} w={148} h={60} rx={8}
              label="Atlanta Store 1" sub="store · atlanta" storeId={nodeIds['atlanta-s1']}
              state={nodeStates['atlanta-s1']} dotCx={580} dotCy={230} dotR={5}/>

            {/* Atlanta Store 2 */}
            <NodeShape type="store" x={635} y={224} w={148} h={60} rx={8}
              label="Atlanta Store 2" sub="store · atlanta" storeId={nodeIds['atlanta-s2']}
              state={nodeStates['atlanta-s2']} dotCx={775} dotCy={230} dotR={5}/>

          </svg>
        </div>

        {/* Controls panel */}
        <div className={styles.controlsPanel}>
          <h2 className={styles.panelHeading}>Tests</h2>
          <button className={styles.btnRunAll} onClick={runAll} disabled={isLocked}>
            Run All Tests
          </button>
          <hr className={styles.divider} />
          {ALL_TESTS.map(testId => (
            <button
              key={testId}
              className={[
                styles.testBtn,
                btnStates[testId] !== 'idle' ? styles[`tbtn_${btnStates[testId]}`] : '',
              ].join(' ')}
              onClick={() => runOne(testId)}
              disabled={isLocked}
            >
              <span>{LABELS[testId]}</span>
              <span className={styles.statusIcon}>
                {btnStates[testId] === 'running' ? <span className={styles.spinner}>⟳</span>
                  : btnStates[testId] === 'pass'  ? '✓'
                  : btnStates[testId] === 'fail'  ? '✗'
                  : '–'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Results grid ── */}
      <div className={styles.resultsSection}>
        <h2 className={styles.sectionHeading}>Test Results</h2>
        <div className={styles.resultsGrid}>
          {ALL_TESTS.map(testId => {
            const data = results[testId];
            if (!data) return null;
            return (
              <div
                key={testId}
                className={`${styles.resultCard} ${data.ok ? styles.cardPass : styles.cardFail}`}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>{LABELS[testId]}</span>
                  <span className={`${styles.cardBadge} ${data.ok ? styles.badgePass : styles.badgeFail}`}>
                    {data.ok ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <ResultBody testId={testId} data={data} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Activity log ── */}
      <div className={styles.logSection}>
        <h2 className={styles.sectionHeading}>Activity Log</h2>
        <div className={styles.logFeed} ref={logRef}>
          {logEntries.length === 0 && (
            <span className={styles.logEmpty}>No activity yet — run a test to begin</span>
          )}
          {logEntries.map((entry, i) => (
            <div key={i} className={styles.logLine}>
              <span className={styles.logTime}>{entry.ts}</span>
              <span className={`${styles.logMsg} ${entry.cls ? styles[`log_${entry.cls}`] : ''}`}>
                {entry.msg}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}


// ─── SVG Node helper ──────────────────────────────────────────────────────────

function NodeShape({ type, x, y, w, h, rx, label, sub, storeId, state, dotCx, dotCy, dotR }) {
  const rectClass = [
    type === 'hub' ? styles.nodeHub : styles.nodeStore,
    state !== 'unknown' ? styles[`ns_${state}`] : '',
  ].join(' ');

  const textX = x + w / 2;
  const textY1 = y + h * 0.37;
  const textY2 = y + h * 0.58;
  const textY3 = y + h * 0.78;

  return (
    <>
      <rect className={rectClass} x={x} y={y} width={w} height={h} rx={rx} />
      <text className={styles.nodeLabel} x={textX} y={textY1}>{label}</text>
      <text className={styles.nodeSub}   x={textX} y={textY2}>{sub}</text>
      <text className={styles.nodeId}    x={textX} y={textY3}>{storeId}</text>
      <circle
        className={`${styles.statusDot} ${styles[`dot_${state}`] || styles.dot_unknown}`}
        cx={dotCx} cy={dotCy} r={dotR}
      />
    </>
  );
}


// ─── Result body renderers ────────────────────────────────────────────────────

function ResultBody({ testId, data }) {
  if (testId === 'health')      return <RenderHealth data={data} />;
  if (testId === 'registry')    return <RenderRegistry data={data} />;
  if (testId === 'heartbeat')   return <RenderHeartbeat data={data} />;
  if (testId === 'revenue')     return <RenderRevenue data={data} />;
  if (testId === 'auth_reject') return <RenderAuthReject data={data} />;
  if (data.steps)               return <RenderSteps steps={data.steps} />;
  return <pre className={styles.rawJson}>{JSON.stringify(data, null, 2)}</pre>;
}

function ok2color(ok) { return ok ? 'var(--dm-ok)' : 'var(--dm-fail)'; }
function stepIcon(ok) { return ok ? '✓' : '✗'; }

function RenderSteps({ steps }) {
  return (steps || []).map((s, i) => (
    <div key={i} className={styles.stepRow}>
      <span className={styles.stepIcon} style={{ color: ok2color(s.ok) }}>{stepIcon(s.ok)}</span>
      <div style={{ flex: 1 }}>
        <div className={styles.stepName}>{s.step}</div>
        {s.detail && <div className={styles.stepDetail}>{s.detail}</div>}
      </div>
      {s.status && (
        <span className={`${styles.stepStatus} ${s.ok ? styles.stepStatusOk : styles.stepStatusFail}`}>
          HTTP {s.status}
        </span>
      )}
      {s.ms != null && <span className={styles.stepMs}>{s.ms}ms</span>}
    </div>
  ));
}

function RenderHealth({ data }) {
  return (data.nodes || []).map((n, i) => (
    <div key={i} className={styles.stepRow}>
      <span className={styles.stepIcon} style={{ color: ok2color(n.ok) }}>{stepIcon(n.ok)}</span>
      <div style={{ flex: 1 }}>
        <div className={styles.stepName}>{n.name}</div>
        <div className={styles.stepDetail}>
          {n.ok ? `store_id=${n.store_id} · ${n.region}` : (n.error || 'unreachable')}
        </div>
      </div>
      <span className={styles.stepMs}>{n.ms}ms</span>
    </div>
  ));
}

function RenderRegistry({ data }) {
  return Object.entries(data.hubs || {}).map(([hub, info]) => (
    <div key={hub} className={styles.stepRow} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        <span className={styles.stepIcon} style={{ color: ok2color(info.ok) }}>{stepIcon(info.ok)}</span>
        <span className={styles.stepName}>{hub}</span>
        <span className={styles.stepMs} style={{ marginLeft: 'auto' }}>
          {info.count} store(s) · {info.ms}ms
        </span>
      </div>
      {(info.stores || []).map((s, j) => (
        <div key={j} className={styles.stepDetail} style={{ marginLeft: 22 }}>
          ↳ {s.store_name || s.store_id} · {s.api_endpoint || ''}
        </div>
      ))}
    </div>
  ));
}

function RenderHeartbeat({ data }) {
  return (data.results || []).map((r, i) => (
    <div key={i} className={styles.stepRow}>
      <span className={styles.stepIcon} style={{ color: ok2color(r.ok) }}>{stepIcon(r.ok)}</span>
      <div style={{ flex: 1 }}>
        <div className={styles.stepName}>{r.store}</div>
        <div className={styles.stepDetail}>→ {r.hub} (store_id={r.store_id})</div>
      </div>
      <span className={styles.stepMs}>{r.ms}ms</span>
    </div>
  ));
}

function RenderRevenue({ data }) {
  return (
    <>
      {Object.entries(data.hubs || {}).map(([hub, info]) => (
        <div key={hub} className={styles.stepRow}>
          <span className={styles.stepIcon} style={{ color: ok2color(info.ok) }}>{stepIcon(info.ok)}</span>
          <div style={{ flex: 1 }}>
            <div className={styles.stepName}>{hub} — {info.region || ''}</div>
            <div className={styles.stepDetail}>
              {info.ok
                ? `$${info.total?.toFixed(2)} across ${info.stores} store(s)`
                : (info.error || 'error')}
            </div>
          </div>
          <span className={styles.stepMs}>{info.ms}ms</span>
        </div>
      ))}
      <div className={`${styles.stepRow} ${styles.totalRow}`}>
        <span className={styles.stepIcon} />
        <span className={styles.stepName} style={{ fontWeight: 700 }}>Grand Total (all regions)</span>
        <span className={`${styles.stepMs} ${styles.grandTotal}`}>
          ${(data.grand_total || 0).toFixed(2)}
        </span>
      </div>
    </>
  );
}

function RenderAuthReject({ data }) {
  return (data.results || []).map((r, i) => (
    <div key={i} className={styles.stepRow}>
      <span className={styles.stepIcon} style={{ color: ok2color(r.ok) }}>{stepIcon(r.ok)}</span>
      <div style={{ flex: 1 }}>
        <div className={styles.stepName}>
          {r.node} — <code className={styles.code}>{r.endpoint}</code>
        </div>
        <div className={styles.stepDetail}>{r.detail}</div>
      </div>
      <span className={`${styles.stepStatus} ${r.ok ? styles.stepStatusOk : styles.stepStatusFail}`}>
        HTTP {r.status}
      </span>
    </div>
  ));
}
