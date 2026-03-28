import React, { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { KPICard } from '../../super-admin/components/KPICard';
import {
  TECHNICIAN,
  KPI_OVERVIEW,
  SCHEDULE_JOBS,
  REGIONAL_SUMMARY,
  ALERTS_ACTIVITY,
} from '../mockData';
import styles from './Overview.module.css';

export function Overview({ onNavigate }) {
  const { user } = useAuth();
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState(new Set());

  const firstName = user?.firstName || TECHNICIAN.firstName;
  const todayJobs = SCHEDULE_JOBS.filter((j) => j.category === 'today').slice(0, 5);
  const activeAlerts = ALERTS_ACTIVITY.filter((a) => !dismissedAlertIds.has(a.id));

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
      {!alertDismissed && (
        <div className={styles.alertBanner}>
          <div className={styles.alertContent}>
            <span className={styles.alertIcon}>⚠️</span>
            <span className={styles.alertText}>
              2 machines offline for 3h 15m — estimated revenue impact $660/hr.{' '}
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
            value={KPI_OVERVIEW.machinesDown}
            trend={-1}
            target={0}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#FF2E63' }}>
          <KPICard
            label="Repairs Today"
            value={KPI_OVERVIEW.repairsToday}
            trend={2}
            target={5}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#F59E0B' }}>
          <KPICard
            label="Parts Pending"
            value={KPI_OVERVIEW.partsPending}
            trend={-1}
            target={0}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#10B981' }}>
          <KPICard
            label="Revenue Impact"
            value={KPI_OVERVIEW.revenueImpact}
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
              <strong>{REGIONAL_SUMMARY.region}</strong>
            </div>
            <div className={styles.regionalRow}>
              <span className={styles.regionalLabel}>Stores:</span>
              <strong>{REGIONAL_SUMMARY.storeCount} stores</strong>
            </div>
            <div className={styles.regionalRow}>
              <span className={styles.regionalLabel}>Machines:</span>
              <strong>{REGIONAL_SUMMARY.machineCount} machines</strong>
            </div>
            <div className={styles.stackedBarContainer}>
              <div className={styles.stackedBar}>
                <div
                  className={styles.stackedSegment}
                  style={{
                    flex: REGIONAL_SUMMARY.operational,
                    backgroundColor: '#10B981',
                  }}
                  title={`${REGIONAL_SUMMARY.operational} Operational`}
                >
                  {REGIONAL_SUMMARY.operational > 5 && (
                    <span className={styles.segmentLabel}>
                      {REGIONAL_SUMMARY.operational}
                    </span>
                  )}
                </div>
                <div
                  className={styles.stackedSegment}
                  style={{
                    flex: REGIONAL_SUMMARY.degraded,
                    backgroundColor: '#F59E0B',
                  }}
                  title={`${REGIONAL_SUMMARY.degraded} Degraded`}
                >
                  {REGIONAL_SUMMARY.degraded > 0 && (
                    <span className={styles.segmentLabel}>
                      {REGIONAL_SUMMARY.degraded}
                    </span>
                  )}
                </div>
                <div
                  className={styles.stackedSegment}
                  style={{
                    flex: REGIONAL_SUMMARY.critical,
                    backgroundColor: '#EF4444',
                  }}
                  title={`${REGIONAL_SUMMARY.critical} Critical`}
                >
                  {REGIONAL_SUMMARY.critical > 0 && (
                    <span className={styles.segmentLabel}>
                      {REGIONAL_SUMMARY.critical}
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
                <span>{REGIONAL_SUMMARY.operational} Operational</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: '#F59E0B' }}
                />
                <span>{REGIONAL_SUMMARY.degraded} Degraded</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: '#EF4444' }}
                />
                <span>{REGIONAL_SUMMARY.critical} Critical</span>
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
