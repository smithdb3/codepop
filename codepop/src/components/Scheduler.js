import {useState} from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

const Scheduler = () => {
    const handleUpload = () => {
        console.log('Upload button pressed');
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