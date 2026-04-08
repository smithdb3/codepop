import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { KPICard } from '../../super-admin/components/KPICard';
import styles from './Overview.module.css';
import { getMachines } from '../../../api/machines';
import { getSchedules } from '../../../api/schedules';
import { getRepairProfile } from '../../../api/repairProfile';

export function Overview({ onNavigate }) {
  const { user } = useAuth();
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState(new Set());
  const [machines, setMachines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [machinesData, schedulesData, profileData] = await Promise.all([
          getMachines(),
          getSchedules(),
          getRepairProfile(),
        ]);
        setMachines(machinesData);
        setSchedules(schedulesData);
        setProfile(profileData);
      } catch (error) {
        console.error('Failed to fetch overview data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Map backend status to frontend status
  const statusMap = {
    NORMAL: 'operational',
    WARNING: 'degraded',
    ERROR: 'critical',
    OUT_OF_ORDER: 'critical',
    SCHEDULE_SERVICE: 'degraded',
    REPAIR_START: 'degraded',
    REPAIR_END: 'operational',
  };

  // Derive KPIs from real data
  const machinesDown = machines.filter((m) => ['ERROR', 'OUT_OF_ORDER'].includes(m.status)).length;
  const totalRevenueImpact = machines
    .filter((m) => ['ERROR', 'OUT_OF_ORDER'].includes(m.status))
    .reduce((sum, m) => sum + parseFloat(m.revenue_impact || 0), 0);
  const revenueImpactStr = `$${totalRevenueImpact.toFixed(0)}/hr`;

  // Today's jobs: filter schedules by today's date
  const today = new Date().toISOString().split('T')[0];
  const todayJobs = schedules
    .filter((s) => s.scheduled_at && s.scheduled_at.startsWith(today))
    .slice(0, 5)
    .map((s) => {
      // s.machine is an FK integer (Machine PK), but we need to find by id
      const machine = machines.find((m) => m.id === s.machine) || {};
      return {
        id: s.id,
        storeName: machine.machine_id ? `${machine.machine_id}` : 'Unknown',
        storeAddress: machine.location || 'Unknown',
        machineStatus: statusMap[machine.status] || 'operational',
        startTime: new Date(s.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        endTime: new Date(new Date(s.scheduled_at).getTime() + 60 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        durationLabel: '1h',
      };
    });

  // Regional Summary
  const regionalData = profile ? {
    region: profile.region_name || 'Unknown',
    storeCount: profile.assigned_stores?.length || 0,
    machineCount: machines.length,
    operational: machines.filter((m) => m.status === 'NORMAL' || m.status === 'REPAIR_END').length,
    degraded: machines.filter((m) => ['WARNING', 'SCHEDULE_SERVICE', 'REPAIR_START'].includes(m.status)).length,
    critical: machines.filter((m) => ['ERROR', 'OUT_OF_ORDER'].includes(m.status)).length,
  } : {
    region: 'Unknown',
    storeCount: 0,
    machineCount: 0,
    operational: 0,
    degraded: 0,
    critical: 0,
  };

  // Alerts derived from machines down
  const alerts = machines
    .filter((m) => ['ERROR', 'OUT_OF_ORDER'].includes(m.status))
    .map((m, idx) => ({
      id: idx,
      severity: 'critical',
      message: `Machine ${m.machine_id} at ${m.location} is ${m.status.toLowerCase()}`,
      timestamp: 'Now',
    }));

  const activeAlerts = alerts.filter((a) => !dismissedAlertIds.has(a.id));
  const firstName = user?.firstName || 'Technician';

  const handleDismissAlert = (id) => {
    setDismissedAlertIds((prev) => new Set([...prev, id]));
  };

  const handleDismissBanner = () => {
    setAlertDismissed(true);
  };

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>Good morning, {firstName}</h1>
          <div className={styles.datePill}>
            {todayDate} • <span className={styles.regionBadge}>Chicago Region</span>
          </div>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {!alertDismissed && machinesDown > 0 && (
        <div className={styles.alertBanner}>
          <div className={styles.alertContent}>
            <span className={styles.alertIcon}>⚠️</span>
            <span className={styles.alertText}>
              {machinesDown} machine{machinesDown !== 1 ? 's' : ''} offline — estimated revenue impact {revenueImpactStr}.{' '}
              <button
                className={styles.alertLink}
                onClick={() => {
                  setAlertDismissed(true);
                  onNavigate('machines');
                }}
              >
                View Machines →
              </button>
            </span>
          </div>
          <button className={styles.alertDismiss} onClick={handleDismissBanner}>
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#EF4444' }}>
          <KPICard
            label="Machines Down"
            value={machinesDown}
            trend={-1}
            target={0}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#FF2E63' }}>
          <KPICard
            label="Repairs Today"
            value={todayJobs.length}
            trend={2}
            target={5}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#F59E0B' }}>
          <KPICard
            label="Alerts Active"
            value={alerts.length}
            trend={-1}
            target={0}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#10B981' }}>
          <KPICard
            label="Revenue Impact"
            value={revenueImpactStr}
            trend={-3}
            target="$0"
          />
        </div>
      </div>

      {/* Two-Column Row: Today's Schedule + Regional Summary */}
      <div className={styles.twoCol}>
        {/* Today's Schedule Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Today's Schedule</h3>
            <button
              className={styles.secondaryBtn}
              onClick={() => onNavigate('schedule')}
            >
              Route Optimization
            </button>
          </div>
          <div className={styles.scheduleList}>
            {todayJobs.length > 0 ? (
              <>
                {todayJobs.map((job) => (
                  <div key={job.id} className={styles.scheduleRow}>
                    <span className={styles.timeBlock}>
                      {job.startTime}–{job.endTime}
                    </span>
                    <div className={styles.storeInfo}>
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(
                          job.storeAddress
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.storeLink}
                      >
                        <strong>{job.storeName}</strong>
                      </a>
                      <div className={styles.storeAddress}>{job.storeAddress}</div>
                    </div>
                    <StatusBadge status={job.machineStatus} />
                    <span className={styles.duration}>({job.durationLabel})</span>
                    <button className={styles.primaryBtn}>Start Repair</button>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(
                        job.storeAddress
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.ghostBtn}
                    >
                      Open in Maps
                    </a>
                  </div>
                ))}
                {SCHEDULE_JOBS.filter((j) => j.category === 'today').length > 5 && (
                  <button
                    className={styles.viewAllLink}
                    onClick={() => onNavigate('schedule')}
                  >
                    View all →
                  </button>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                No repairs scheduled for today.{' '}
                <button
                  className={styles.viewAllLink}
                  onClick={() => onNavigate('schedule')}
                >
                  View Schedule →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Regional Summary Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Regional Summary</h3>
          <div className={styles.regionalContent}>
            <div className={styles.regionalRow}>
              <span className={styles.regionalLabel}>Assigned to:</span>
              <strong>{regionalData.region}</strong>
            </div>
            <div className={styles.regionalRow}>
              <span className={styles.regionalLabel}>Stores:</span>
              <strong>{regionalData.storeCount} stores</strong>
            </div>
            <div className={styles.regionalRow}>
              <span className={styles.regionalLabel}>Machines:</span>
              <strong>{regionalData.machineCount} machines</strong>
            </div>
            <div className={styles.stackedBarContainer}>
              <div className={styles.stackedBar}>
                <div
                  className={styles.stackedSegment}
                  style={{
                    flex: regionalData.operational,
                    backgroundColor: '#10B981',
                  }}
                  title={`${regionalData.operational} Operational`}
                >
                  {regionalData.operational > 5 && (
                    <span className={styles.segmentLabel}>
                      {regionalData.operational}
                    </span>
                  )}
                </div>
                <div
                  className={styles.stackedSegment}
                  style={{
                    flex: regionalData.degraded,
                    backgroundColor: '#F59E0B',
                  }}
                  title={`${regionalData.degraded} Degraded`}
                >
                  {regionalData.degraded > 0 && (
                    <span className={styles.segmentLabel}>
                      {regionalData.degraded}
                    </span>
                  )}
                </div>
                <div
                  className={styles.stackedSegment}
                  style={{
                    flex: regionalData.critical,
                    backgroundColor: '#EF4444',
                  }}
                  title={`${regionalData.critical} Critical`}
                >
                  {regionalData.critical > 0 && (
                    <span className={styles.segmentLabel}>
                      {regionalData.critical}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.stackedLegend}>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: '#10B981' }}
                />
                <span>{regionalData.operational} Operational</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: '#F59E0B' }}
                />
                <span>{regionalData.degraded} Degraded</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: '#EF4444' }}
                />
                <span>{regionalData.critical} Critical</span>
              </div>
            </div>
            <button
              className={styles.primaryBtn}
              onClick={() => onNavigate('machines')}
            >
              View All Machines
            </button>
          </div>
        </div>
      </div>

      {/* Alerts & Activity Feed */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Alerts & Activity</h3>
        <div className={styles.alertsList}>
          {activeAlerts.length > 0 ? (
            activeAlerts.map((alert) => (
              <div key={alert.id} className={styles.alertRow}>
                <span
                  className={styles.severityDot}
                  style={{
                    backgroundColor:
                      alert.severity === 'critical'
                        ? '#EF4444'
                        : alert.severity === 'warning'
                          ? '#F59E0B'
                          : '#10B981',
                  }}
                />
                <div className={styles.alertMessage}>{alert.message}</div>
                <span className={styles.alertTimestamp}>{alert.timestamp}</span>
                <button
                  className={styles.dismissLink}
                  onClick={() => handleDismissAlert(alert.id)}
                >
                  Dismiss
                </button>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>All caught up! No recent alerts.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    critical: { bg: '#FEE2E2', text: '#DC2626', label: 'Critical' },
    degraded: { bg: '#FEF3C7', text: '#D97706', label: 'Degraded' },
    operational: { bg: '#DCFCE7', text: '#16A34A', label: 'Operational' },
    parts_pending: { bg: '#E0E7FF', text: '#4F46E5', label: 'Pending' },
  };

  const config_status = config[status] || config.operational;

  return (
    <span
      style={{
        background: config_status.bg,
        color: config_status.text,
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {config_status.label}
    </span>
  );
}
