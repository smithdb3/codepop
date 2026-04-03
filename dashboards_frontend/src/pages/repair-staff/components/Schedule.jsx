import { useState, useEffect } from "react";
import { getSchedules } from "../../../api/schedules";
import { getMachine, getMachinePair } from "../../../api/machines";
// import styles from './Schedule.module.css';

export function Schedule(){
    const [repairSchedule, setRepairSchedule] = useState([]);

    useEffect(() => {
    const fetchData = async () => {
        const schedules = await getSchedules();
        const schedulePair = await Promise.all( //Gets the machine associated with a schedule and pairs them
            schedules.map(async (s) => { //Gets the store and machine and parses the data
                const pair = await getMachinePair(s.machine);

                return [s, pair.machine, pair.store];
            })
        ); 

        // Promise.all(schedulePair.map( async (pair) => {
        //     const id = pair[1].store_id;
        //     if(!stores.has(id)){ //If id is undefined then execute the code
        //         const store = await getStore(id);
        //         console.log(store);
        //         stores.set(id, store);
        //     }
        // }));
        setRepairSchedule(schedulePair);
      };
      fetchData();
    }, []);

    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Name</th>
                        <th>Scheduled At</th>
                        <th>Notes</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {repairSchedule.map(([schedule, machine, store]) =>
                    <tr key={machine.machine_id}>
                        <td>
                          <a
                            href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {store.store_name}
                          </a>
                        </td>
                        <td>{machine.status}</td>
                        <td>{machine.name}</td>
                        <td>{schedule.scheduled_at}</td>
                        <td>{machine.notes}</td>
                        <td>{schedule.description}</td>
                    </tr>)}
                </tbody>
            </table>
        </div>
    )
}