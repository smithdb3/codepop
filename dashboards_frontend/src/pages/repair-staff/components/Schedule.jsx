import { useState, useEffect } from "react";
import { getSchedules } from "../../../api/schedules";
import { getMachine } from "../../../api/machines";
import { getStore } from "../../../api/store";
// import styles from './Schedule.module.css';

export function Schedule(){
    const [repairSchedule, setRepairSchedule] = useState([]);
    const stores = new Map();

    useEffect(() => {
    const fetchData = async () => {
        const schedules = await getSchedules();
        const schedulePair = await Promise.all( //Gets the machine associated with a schdule and pairs them
            schedules.map(async (s) => [s, await getMachine(s.machine)])); 

        Promise.all(schedulePair.map( async (pair) => {
            const id = pair[1].store_id;
            if(!stores.has(id)){ //If id is undefined then excute the code
                const store = await getStore(id);
                console.log(store);
                stores.set(id, store);
            }
        }));
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
                    {repairSchedule.map(([schedule, machine]) => 
                    <tr key={machine.machine_id}>
                        <td>{machine.status}</td>
                        <td>{machine.name}</td>
                        <td>{stores.get(machine.store_id).store_name}</td>
                        <td>{schedule.scheduled_at}</td>
                        <td>{machine.notes}</td>
                        <td>{schedule.description}</td>
                    </tr>)}
                </tbody>
            </table>
        </div>
    )
}