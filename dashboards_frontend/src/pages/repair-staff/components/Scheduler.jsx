import { useState } from "react";
import { createSchedule } from "../../../api/schedules";
import styles from './Scheduler.module.css';

export function Scheduler() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fileContents, setFileContents] = useState([]);

    const handleUpload = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            const file = event.target.files[0];

            if(!file) return;

            const reader = new FileReader();

            reader.onload = (f) =>{ //Breaks up CSV by line
                setFileContents(f.target.result.split("\n"));
                };

            reader.onerror = (f) => {
                    setError("Failed to upload file. Please try again.");
                };

            reader.readAsText(file); 
            
            //For each line in the csv it makes a schedule for a machine
            for(line of fileContents){ 
                const components = line.split(",").trim();
                const Schedule = {
                machine: components[0],     
                assigned_to: localStorage.getItem("cp_user_id"), 
                description: components[1], 
                created_at: Date.now(),  
            };

            createSchedule(Schedule)
            }
            
        } catch (error) {
            console.error('File upload error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
            <div id="file-upload">
                <label className={styles.uploadButton}> Upload Schedule
                    <input
                    onChange={handleUpload}
                    type="file"
                    accept=".csv"
                    />
                </label>
                <div>
                    {error}
                </div>
            </div>

    );
}