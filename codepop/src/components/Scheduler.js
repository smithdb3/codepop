import {useState} from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseURL } from "../../ip_address";

export const createMachine = async (machineData) => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const url = `${getBaseURL()}/backend/machines/`;

        console.log('Token:', token);
        console.log('URL:', url);
        console.log('Machine data:', machineData);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(machineData),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const result = await response.json();
        console.log('Machine created successfully:', result);
        return result;
    } catch (error) {
        console.error('Error creating machine:', error);
        throw error;
    }
};

const Scheduler = (colors) => {
    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type:"text/comma-separated-values"})
            if (result.canceled) return;
            const file = result.assets[0];
            const contents = (await FileSystem.readAsStringAsync(file.uri)).trim().split(',');
            let machine = {
                machine_id: contents[0],
                name: contents[1],      
                location: contents[2],  
                status: contents[3],    
                last_status_change: Date.now(),
                notes: contents[4]      
            }
            await createMachine(machine);
            // contents.forEach((line) => {
            //     console.log(line);
            // });

        } catch (error) {
            console.error('File picker error:', error);
        }
    };

    const styles = StyleSheet.create({
    uploadButton: {
        margin: 10,
        padding: 15,
        backgroundColor: colors.primary,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    uploadText: {
        fontSize: 16,
        color: colors.surface,
    },
});

    return(
        <TouchableOpacity onPress={handleUpload} style={styles.uploadButton}>
            <Text style={styles.uploadText}>Upload Schedule</Text>
        </TouchableOpacity>
        
    )
}

export default Scheduler;