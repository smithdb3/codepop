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
                const contents = f.target.result.trim().split("\n");

                //For each line in the csv it makes a javascript schedule object to be sent to the data base.
                for(const line of contents){
                    const components = line.trim().split(",");
                    const Schedule = {
                        machine: components[0], //Machine ID
                        assigned_to: localStorage.getItem("cp_user_id"),
                        scheduled_at: new Date().toISOString(), //Dajngo expects dates in this format
                        completed_at: null,
                        description: components[1],
                    };
                    createSchedule(Schedule);
                }
            };

            reader.onerror = (f) => {
                    setError("Failed to upload file. Please try again.");
                };

            reader.readAsText(file);

            
        } catch (error) {
            console.error('File upload error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
            <div id="file-upload">
                <label className={styles.uploadButton}> {loading ? "Uploading...": "Upload Schedule"}
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