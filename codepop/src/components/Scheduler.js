import {useState} from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const Scheduler = (colors) => {
    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type:"text/comma-separated-values"})
            if (result.canceled) return;
            const file = result.assets[0];
            console.log('File selected:', file);
            const contents = await FileSystem.readAsStringAsync(file.uri);
            console.log('File contents:', contents);
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