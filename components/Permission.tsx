import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';

export default function PermissionsPage() {
  const { hasPermission, requestPermission } = useCameraPermission();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permissão necessária</Text>
      <Text style={styles.text}>
        O app precisa de acesso à câmera para medir os batimentos.
      </Text>
      {!hasPermission && (
        <Button title="Permitir acesso à câmera" onPress={requestPermission} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});
