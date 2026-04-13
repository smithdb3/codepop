import React, { useState, useEffect } from 'react';
import { SCHEDULE_JOBS } from '../mockData';
import styles from './Schedule.module.css';
import { Scheduler } from '../components/Scheduler';
import { getSchedules } from "../../../api/schedules";
import { getMachinePair } from "../../../api/machines";
import { Schedule as ScheduleComponent } from '../components/Schedule';

export function Schedule({ onNavigate }) {
  const [view, setView] = useState('timeline');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [repairSchedule, setRepairSchedule] = useState([]); //Hoisted state
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
  const fetchSchedules = async () => { //Hoisted function
    const schedules = await getSchedules();
    const schedulePair = await Promise.all( //Gets the machine associated with a schedule and pairs them
      schedules.map(async (s) => { //Gets the store and machine and parses the data
        const pair = await getMachinePair(s.machine);
        return [s, pair.machine, pair.store]; // Return 3-tuple: schedule, machine, store
      })
    );
    setRepairSchedule(schedulePair);
  };

  useEffect(()=>{fetchSchedules();}, []);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Repair Schedule</h1>
        <div className={styles.toolbar}>
        </div>
      </div>
      <Scheduler fetchSchedules={fetchSchedules}></Scheduler>
      <ScheduleComponent repairSchedule={repairSchedule} setRepairSchedule={setRepairSchedule}></ScheduleComponent>
    </div>
  );
}
