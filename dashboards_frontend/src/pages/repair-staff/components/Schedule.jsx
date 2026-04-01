import { useState, useEffect } from "react";
import { getSchedules } from "../../../api/schedules";
import { getMachine } from "../../../api/machines";
// import styles from './Schedule.module.css';

export function Schedule(){
    const [repairSchedule, setRepairSchedule] = useState([]);

    useEffect(() => {
    const fetchData = async () => {
        const schedules = await getSchedules();
        const schedulePair = await Promise.all( //Pairs a schedule and it's associated machine
            schedules.map(async (s) => [s, await getMachine(s.machine)])
        ); 
            setRepairSchedule(schedulePair);
      };
      fetchData();
    }, []);

    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Name</th>
                        <th>Location</th>
                        <th>Scheduled At</th>
                        <th>Notes</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {repairSchedule.map(([schedule, machine]) => <tr key={machine.machine_id}>
                        <td>{machine.status}</td>
                        <td>{machine.name}</td>
                        <td>{machine.location}</td>
                        <td>{schedule.scheduled_at}</td>
                        <td>{machine.notes}</td>
                        <td>{schedule.description}</td>
                    </tr>)}
                </tbody>
            </table>
        </div>
    )
}