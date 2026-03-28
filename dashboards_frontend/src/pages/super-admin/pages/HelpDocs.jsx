import React from 'react';
import styles from './HelpDocs.module.css';

export function HelpDocs() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard {'>'} Help & Documentation</div>
        <h1 className={styles.title}>Help & Documentation</h1>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Getting Started</h2>
          <p>
            Welcome to the CodePop Super Admin Dashboard. This guide will help you navigate the system and manage your operations.
          </p>
          <ul>
            <li>View real-time metrics across all regions</li>
            <li>Manage users, stores, and supply hubs</li>
            <li>Configure AI parameters for recommendations and forecasting</li>
            <li>Monitor system health and performance</li>
            <li>Access detailed audit logs</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dashboard Overview</h2>
          <p>
            The main dashboard provides a comprehensive view of your system's health and performance across all regions.
          </p>
          <h3 className={styles.subsectionTitle}>Key Metrics</h3>
          <p>
            The dashboard displays 6 key performance indicators updated in real-time:
          </p>
          <ul>
            <li><strong>Active Orders:</strong> Total number of pending orders system-wide</li>
            <li><strong>Revenue Today:</strong> Current day's revenue across all regions</li>
            <li><strong>Inventory Health:</strong> Overall inventory stock level percentage</li>
            <li><strong>Machine Uptime:</strong> Percentage of functional vending machines</li>
            <li><strong>API Response Time:</strong> Average API latency in milliseconds</li>
            <li><strong>Network Latency:</strong> Average network latency</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Regions & Stores</h2>
          <p>
            Manage all stores across CodePop's 7 regions. Select a region to view detailed store information including status, orders, and inventory levels.
          </p>
          <h3 className={styles.subsectionTitle}>Store Management</h3>
          <ul>
            <li>Create new stores with region assignment</li>
            <li>View store status and health checks</li>
            <li>Force offline mode for maintenance</li>
            <li>Monitor orders and revenue per store</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>User Management</h2>
          <p>
            Manage all users and their roles. Control access permissions and user activities.
          </p>
          <h3 className={styles.subsectionTitle}>User Roles</h3>
          <ul>
            <li><strong>Super Admin:</strong> Full system access</li>
            <li><strong>Admin:</strong> Regional management and user administration</li>
            <li><strong>Manager:</strong> Store-level operations</li>
            <li><strong>Repair Staff:</strong> Machine maintenance and repairs</li>
            <li><strong>Logistics Manager:</strong> Supply chain and inventory</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>AI Configuration</h2>
          <p>
            Fine-tune AI parameters for the recommendation engine, chatbot, and forecasting system.
          </p>
          <h3 className={styles.subsectionTitle}>Key Settings</h3>
          <ul>
            <li>Confidence thresholds for recommendations</li>
            <li>Suggestion frequency and personalization levels</li>
            <li>Chatbot response quality and escalation rules</li>
            <li>Forecasting update frequency and accuracy targets</li>
            <li>Auto-restock recommendations</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>System Settings</h2>
          <p>
            Configure critical system parameters and emergency overrides.
          </p>
          <h3 className={styles.subsectionTitle}>Important Controls</h3>
          <ul>
            <li><strong>Maintenance Mode:</strong> Temporarily disable ordering system-wide</li>
            <li><strong>System Overrides:</strong> Emergency controls for pause orders, geolocation, rate limiting</li>
            <li><strong>Notification Thresholds:</strong> Alert sensitivity and delivery channels</li>
            <li><strong>Backup & Recovery:</strong> System backup management and restoration</li>
            <li><strong>System Health:</strong> Monitor database, cache, queue, and external services</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Audit Logs</h2>
          <p>
            Track all administrative actions for compliance and security. Search and filter by user, action, date, or status.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reports & Analytics</h2>
          <p>
            Access comprehensive reports on revenue, orders, inventory, and machine uptime. Export data as CSV or PDF.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Keyboard Shortcuts</h2>
          <ul>
            <li><code>Tab</code> - Navigate between interactive elements</li>
            <li><code>Enter</code> - Activate buttons and links</li>
            <li><code>Space</code> - Toggle switches and checkboxes</li>
            <li><code>Escape</code> - Close modals and menus</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact & Support</h2>
          <p>
            For issues or questions about the dashboard, please contact:
          </p>
          <ul>
            <li>Email: <code>support@codepop.com</code></li>
            <li>Slack: <code>#admin-support</code></li>
            <li>Phone: <code>1-800-CODEPOP</code></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
