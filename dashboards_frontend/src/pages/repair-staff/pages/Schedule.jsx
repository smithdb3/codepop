import React, { useState } from 'react';
import { SCHEDULE_JOBS } from '../mockData';
import styles from './Schedule.module.css';

export function Schedule({ onNavigate }) {
  const [view, setView] = useState('timeline');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedSections, setExpandedSections] = useState({
    today: true,
    overdue: false,
    upcoming: false,
    waiting: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const monthLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Group jobs by category
  const todayJobs = SCHEDULE_JOBS.filter((j) => j.category === 'today');
  const overdueJobs = SCHEDULE_JOBS.filter((j) => j.category === 'overdue');
  const upcomingJobs = SCHEDULE_JOBS.filter((j) => j.category === 'upcoming');
  const waitingJobs = SCHEDULE_JOBS.filter((j) => j.category === 'waiting_on_parts');

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Repair Schedule</h1>
        <div className={styles.toolbar}>
          <div className={styles.dateNav}>
            <button className={styles.dateNavBtn} onClick={handlePrevMonth}>
              ←
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button className={styles.dateNavBtn} onClick={handleNextMonth}>
              →
            </button>
          </div>
          <div className={styles.viewToggle}>
            {['Timeline', 'Week', 'Month'].map((label) => (
              <button
                key={label.toLowerCase()}
                className={`${styles.viewBtn} ${
                  view === label.toLowerCase() ? styles.active : ''
                }`}
                onClick={() => setView(label.toLowerCase())}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar/Gantt View */}
      {view === 'timeline' && (
        <div className={styles.ganttContainer}>
          <div className={styles.ganttLabelCol}>
            {SCHEDULE_JOBS.map((job) => (
              <div key={job.id} className={styles.ganttRow} style={{ minHeight: '52px' }}>
                <span className={styles.machineLabel}>
                  {job.machineId}
                  <br />
                  <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
                    {job.machineStatus}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className={styles.ganttBody}>
            <div className={styles.ganttTimeline}>
              {/* Time headers 8am-6pm */}
              <div className={styles.timeHeaders}>
                {Array.from({ length: 11 }).map((_, i) => {
                  const hour = 8 + i;
                  return (
                    <div key={hour} className={styles.timeHeader} style={{ minWidth: '60px' }}>
                      {hour}:00
                    </div>
                  );
                })}
              </div>
              {/* Job bars */}
              {SCHEDULE_JOBS.map((job) => (
                <div key={job.id} className={styles.ganttRow} style={{ minHeight: '52px' }}>
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <div
                      className={`${styles.ganttBar} ${styles[`ganttBar${job.category === 'today' ? 'Scheduled' : job.category === 'overdue' ? 'Overdue' : job.category === 'waiting_on_parts' ? 'InProgress' : 'Completed'}`]}`}
                      style={{
                        left: `${((job.startMinutes - 480) / 600) * 100}%`,
                        width: `${((job.endMinutes - job.startMinutes) / 600) * 100}%`,
                      }}
                      title={`${job.machineId}: ${job.startTime}-${job.endTime}`}
                    >
                      {job.machineId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className={styles.weekGrid}>
          <div className={styles.weekHeader}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <div key={day} className={styles.weekDayHeader}>
                <div className={styles.dayName}>{day}</div>
              </div>
            ))}
          </div>
          <div className={styles.weekBody}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className={styles.weekDay}>
                {SCHEDULE_JOBS.filter((j) => j.startTime.includes(day.charAt(0))).map((job) => (
                  <div key={job.id} className={styles.weekJob}>
                    {job.machineId}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'month' && (
        <div className={styles.monthGrid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className={styles.monthDayHeader}>
              {day}
            </div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className={styles.monthCell}>
              <div className={styles.monthCellDate}>{i + 1}</div>
              <div className={styles.monthCellJobs}>
                {SCHEDULE_JOBS.slice(0, 2).map((job) => (
                  <div key={job.id} className={styles.monthJob}>
                    {job.machineId}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Categorized Sections */}
      <div className={styles.sectionsContainer}>
        <AccordionSection
          title="Today's Schedule"
          isExpanded={expandedSections.today}
          onToggle={() => toggleSection('today')}
          itemCount={todayJobs.length}
          badgeColor="none"
        >
          {todayJobs.length > 0 ? (
            todayJobs.map((job) => (
              <div key={job.id} className={styles.scheduleItem}>
                <span className={styles.scheduleTime}>
                  {job.startTime}–{job.endTime}
                </span>
                <div className={styles.scheduleInfo}>
                  <strong>{job.machineId}</strong> • {job.storeName}
                </div>
                <span className={styles.scheduleStatus}>{job.machineStatus}</span>
                <button className={styles.scheduleBtn}>Start Repair</button>
              </div>
            ))
          ) : (
            <div className={styles.emptySection}>No jobs scheduled for today</div>
          )}
        </AccordionSection>

        <AccordionSection
          title="Overdue Maintenance"
          isExpanded={expandedSections.overdue}
          onToggle={() => toggleSection('overdue')}
          itemCount={overdueJobs.length}
          badgeColor="error"
        >
          {overdueJobs.length > 0 ? (
            overdueJobs.map((job) => (
              <div key={job.id} className={styles.scheduleItem}>
                <span className={styles.scheduleTime}>
                  {job.startTime}–{job.endTime}
                </span>
                <div className={styles.scheduleInfo}>
                  <strong>{job.machineId}</strong> • {job.storeName}
                </div>
                <span className={styles.scheduleStatus}>{job.machineStatus}</span>
                <button className={styles.scheduleBtn}>Schedule Now</button>
              </div>
            ))
          ) : (
            <div className={styles.emptySection}>No overdue maintenance</div>
          )}
        </AccordionSection>

        <AccordionSection
          title="Upcoming This Week"
          isExpanded={expandedSections.upcoming}
          onToggle={() => toggleSection('upcoming')}
          itemCount={upcomingJobs.length}
          badgeColor="none"
        >
          {upcomingJobs.length > 0 ? (
            upcomingJobs.map((job) => (
              <div key={job.id} className={styles.scheduleItem}>
                <span className={styles.scheduleTime}>
                  {job.startTime}–{job.endTime} on {job.date}
                </span>
                <div className={styles.scheduleInfo}>
                  <strong>{job.machineId}</strong> • {job.storeName}
                </div>
                <span className={styles.scheduleStatus}>{job.machineStatus}</span>
              </div>
            ))
          ) : (
            <div className={styles.emptySection}>No upcoming jobs this week</div>
          )}
        </AccordionSection>

        <AccordionSection
          title="Waiting on Parts"
          isExpanded={expandedSections.waiting}
          onToggle={() => toggleSection('waiting')}
          itemCount={waitingJobs.length}
          badgeColor="warning"
        >
          {waitingJobs.length > 0 ? (
            waitingJobs.map((job) => (
              <div key={job.id} className={styles.scheduleItem}>
                <span className={styles.scheduleTime}>
                  Scheduled {job.date}
                </span>
                <div className={styles.scheduleInfo}>
                  <strong>{job.machineId}</strong> • {job.storeName}
                </div>
                {job.partsEta && (
                  <span className={styles.scheduleEta}>Parts ETA: {job.partsEta}</span>
                )}
              </div>
            ))
          ) : (
            <div className={styles.emptySection}>No jobs waiting on parts</div>
          )}
        </AccordionSection>
      </div>
    </div>
  );
}

function AccordionSection({ title, isExpanded, onToggle, itemCount, badgeColor, children }) {
  return (
    <div className={styles.accordionCard}>
      <button className={styles.accordionHeader} onClick={onToggle}>
        <div>
          <h3 className={styles.accordionTitle}>{title}</h3>
          {itemCount > 0 && (
            <span
              className={styles.accordionBadge}
              style={{
                background:
                  badgeColor === 'error'
                    ? '#FEE2E2'
                    : badgeColor === 'warning'
                      ? '#FEF3C7'
                      : 'var(--color-background)',
                color:
                  badgeColor === 'error'
                    ? '#DC2626'
                    : badgeColor === 'warning'
                      ? '#D97706'
                      : 'var(--color-text-secondary)',
              }}
            >
              {itemCount}
            </span>
          )}
        </div>
        <span
          className={`${styles.accordionChevron} ${isExpanded ? styles.open : ''}`}
        >
          ▶
        </span>
      </button>
      {isExpanded && <div className={styles.accordionBody}>{children}</div>}
    </div>
  );
}
