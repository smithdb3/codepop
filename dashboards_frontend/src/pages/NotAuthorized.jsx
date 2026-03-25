import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotAuthorized.module.css';

export function NotAuthorized() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
        <Link to="/login" className={styles.link}>
          Return to Login
        </Link>
      </div>
    </div>
  );
}
