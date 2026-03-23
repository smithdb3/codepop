import {useState} from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import * as DocumentPicker from 'expo-document-picker';

const Scheduler = () => {
    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({});
            console.log('Selected file:', result);
        } catch (error) {
            console.error('File picker error:', error);
        }
    };

    return(
        <TouchableOpacity onPress={handleUpload} style={styles.uploadButton}>
            <Text style={styles.uploadText}>UPLOAD</Text>
        </TouchableOpacity>
        
    )
}

const styles = StyleSheet.create({
    uploadButton: {
        margin: 10,
        padding: 15,
        backgroundColor: '#8DF1D3',
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
        color: '#000',
    },
});

export default Scheduler;