import React, { useState } from 'react';
import { Modal } from '../components/Modal';
import styles from './SystemSettings.module.css';

export function SystemSettings() {
  const [maintenance, setMaintenance] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingToggle, setPendingToggle] = useState(null);

  const handleToggleClick = (toggleName) => {
    setPendingToggle(toggleName);
    setShowConfirmModal(true);
  };

  const confirmToggle = () => {
    if (pendingToggle === 'maintenance') {
      setMaintenance(!maintenance);
    }
    setShowConfirmModal(false);
    setPendingToggle(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard {'>'} System Settings</div>
        <h1 className={styles.title}>System Settings</h1>
      </div>

      {/* Maintenance Mode */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Maintenance Mode</h2>
        <div className={styles.settingCard}>
          <div className={styles.settingContent}>
            <div className={styles.settingLabel}>Enable Maintenance Mode</div>
            <div className={styles.settingDescription}>Disables all orders temporarily</div>
          </div>
          <label className={styles.toggle}>
            <input type="checkbox" checked={maintenance} readOnly />
            <span className={styles.toggleSlider}></span>
          </label>
        </div>
        {maintenance && (
          <div className={styles.subSettings}>
            <div className={styles.formGroup}>
              <label>Maintenance Window Until</label>
              <input type="datetime-local" />
            </div>
            <div className={styles.formGroup}>
              <label>Broadcast Message (optional)</label>
              <textarea placeholder="Message to show to users..." rows="3"></textarea>
            </div>
          </div>
        )}
      </div>

      {/* System Override Toggles */}
      <div className={`${styles.section} ${styles.warningSection}`}>
        <div className={styles.warningBanner}>
          ⚠️ Override controls affect all users and systems. Use with caution.
        </div>

        <h2 className={styles.sectionTitle}>System Override Toggles</h2>

        {[
          { id: 'maintenance', label: 'Pause All Recurring Orders', description: 'Paused 145 recurring orders' },
          { id: 'geolocation', label: 'Disable Geolocation Tracking', description: 'All stores using manual ordering' },
          { id: 'ratelimit', label: 'Rate Limiter Override', description: 'Current limit: 5000 requests/minute' },
        ].map((toggle) => (
          <div key={toggle.id} className={styles.settingCard}>
            <div className={styles.settingContent}>
              <div className={styles.settingLabel}>{toggle.label}</div>
              <div className={styles.settingDescription}>{toggle.description}</div>
            </div>
            <button
              className={styles.toggleBtn}
              onClick={() => handleToggleClick(toggle.id)}
            >
              Toggle
            </button>
          </div>
        ))}
      </div>

      {/* Notification Thresholds */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Notification Thresholds</h2>

        <div className={styles.thresholdGroup}>
          <div className={styles.control}>
            <label>Critical Latency (ms): 500</label>
            <input type="range" min="100" max="2000" defaultValue="500" />
          </div>
          <div className={styles.control}>
            <label>Low Inventory (%): 20</label>
            <input type="range" min="5" max="50" defaultValue="20" />
          </div>
          <div className={styles.control}>
            <label>Machine Downtime (hours): 4</label>
            <input type="range" min="1" max="24" defaultValue="4" />
          </div>
        </div>

        <div className={styles.notificationChannels}>
          <label>Notification Channels</label>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxItem}>
              <input type="checkbox" defaultChecked /> Email
            </label>
            <label className={styles.checkboxItem}>
              <input type="checkbox" defaultChecked /> In-App
            </label>
            <label className={styles.checkboxItem}>
              <input type="checkbox" /> SMS
            </label>
          </div>
        </div>
      </div>

      {/* Backup & Recovery */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Backup & Recovery</h2>

        <div className={styles.backupInfo}>
          <div className={styles.infoRow}>
            <span>Last Backup:</span>
            <strong>Yesterday 2:00 AM</strong>
          </div>
          <div className={styles.infoRow}>
            <span>Backup Frequency:</span>
            <select defaultValue="daily">
              <option>Daily</option>
              <option>Weekly</option>
            </select>
          </div>
          <div className={styles.infoRow}>
            <span>Retention Policy:</span>
            <select defaultValue="90">
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>
        </div>

        <div className={styles.backupActions}>
          <button className={styles.backupBtn}>Backup Now</button>
          <button className={styles.restoreBtn}>Restore from Backup</button>
        </div>
      </div>

      {/* System Health */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>System Health Dashboard</h2>

        <div className={styles.healthGrid}>
          {[
            { name: 'Database', uptime: '99.99%' },
            { name: 'Cache (Redis)', uptime: '99.95%' },
            { name: 'Queue (Celery)', uptime: '99.98%' },
            { name: 'External Services', uptime: '99.90%' },
          ].map((system) => (
            <div key={system.name} className={styles.healthCard}>
              <div className={styles.healthStatus}>🟢</div>
              <div className={styles.healthName}>{system.name}</div>
              <div className={styles.healthUptime}>Uptime: {system.uptime}</div>
              <div className={styles.healthTime}>Last checked: 2 min ago</div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Override"
      >
        <div className={styles.modalContent}>
          <p className={styles.warningText}>
            ⚠️ This action will affect all users and systems. Are you sure?
          </p>
          <div className={styles.modalActions}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </button>
            <button className={styles.confirmBtn} onClick={confirmToggle}>
              Confirm Override
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
