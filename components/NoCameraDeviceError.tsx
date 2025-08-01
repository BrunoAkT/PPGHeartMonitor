import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NoCameraDeviceError() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Erro ao acessar a câmera</Text>
      <Text style={styles.text}>
        Nenhuma câmera disponível foi encontrada no dispositivo.
      </Text>
      <Text style={styles.subtext}>
        Verifique se as permissões estão corretas ou tente reiniciar o app.
      </Text>
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
    color: '#d32f2f',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
});
