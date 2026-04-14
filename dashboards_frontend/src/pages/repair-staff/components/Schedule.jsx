import { setCompletion } from "../../../api/schedules";
import { updateMachineStatus } from "../../../api/machines";
import styles from './Schedule.module.css';

const statusStyles = {
    'REPAIR_START': '#ff00ea',
    'WARNING': '#F97316',        
    'ERROR': '#EF4444',          
    'OUT_OF_ORDER': '#F97316',   
    'SCHEDULE_SERVICE': '#af00ff', 
}

export function Schedule(props){
    const repairSchedule = props.repairSchedule;
    const setRepairSchedule = props.setRepairSchedule;

    return (
        <div>
            <table id={styles.scheduleTable}>
                <thead>
                    <tr id={styles.scheduleHead}>
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
                    <tr className={styles.scheduleRow} key={machine.machine_id}>
                        <td>
                          <a
                            href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {store.store_name}
                          </a>
                        </td>
                        <td style={{ color: statusStyles[machine.status]}}>{machine.status}</td>
                        <td>{machine.name}</td>
                        <td>{schedule.scheduled_at}</td>
                        <td>{machine.notes}</td>
                        <td>{schedule.description}</td>
                        <td>TEST</td>
                        <td className={styles.buttonElement}>
                            <button className={styles.statusButton} onClick={() => {
                                const newStatus = machine.status == 'REPAIR_START'? 'NORMAL': 'REPAIR_START';
                                const schedules = [...repairSchedule].map(([s, m, st]) =>
                                    m.machine_id === machine.machine_id ? [s, {...m, status: newStatus}, st] : [s, m, st] //updates the machines status on the frontend
                                );
                                updateMachineStatus(machine.machine_id, newStatus);

                                if(newStatus == 'NORMAL'){
                                    const index = schedules.findIndex(([s]) => s.id === schedule.id);
                                    setCompletion(schedule.id);

                                    if(index > -1){
                                        schedules.splice(index, 1);
                                    }

                                }

                                setRepairSchedule(schedules);
                                }}>
                                {machine.status == 'REPAIR_START'? 'Finish repair': 'Start repair'}
                            </button>
                        </td>
                    </tr>)}
                </tbody>
            </table>
        </div>
    )
}