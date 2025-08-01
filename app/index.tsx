import NoCameraDeviceError from '@/components/NoCameraDeviceError';
import PermissionsPage from '@/components/Permission';
import { Ppgtest } from '@/components/PPGconection';
import { RealTimeGraph } from '@/components/RealtimeGraph';
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';

let lastValidValue = 0

export default function PPGCamera() {
    const device = useCameraDevice('back');
    const [torch, setTorch] = useState<'on' | 'off'>('on');
    const { hasPermission } = useCameraPermission();
    const format = useCameraFormat(device, [
        { videoResolution: 'auto' },
        { fps: 30 },
        { autoFocusSystem: 'none' }
    ])

    const [bpm, setBpm] = useState<number | null>(null);
    const [valores, setValores] = useState<number | null>(null);

    const [data, setData] = useState<{ time: number; value: number }[]>([])

    const savePPGValue = (value: number) => {
        // Ignora valores não numéricos ou saltos muito grandes
        // O valor do salto (0.5 aqui) é um limiar que você pode ajustar.
        // Se a variação for maior que 50% em um único frame, é provavelmente um artefato.
        if (typeof value !== 'number' || !isFinite(value) || Math.abs(value - lastValidValue) > 0.5) {
            console.log(`Valor ignorado (salto grande): ${value}`);
            return; // Não adiciona o valor ao array
        }
        setValores(value)
        lastValidValue = value; // Atualiza o último valor válido
        const timestamp = Date.now();
        setData((prev) => [...prev.slice(-300), { time: timestamp, value }]);
    }
    const myFunctionJS = Worklets.createRunOnJS(savePPGValue)

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet'
        const heart = Ppgtest(frame)
        if (typeof heart === 'number' && isFinite(heart)) {
            myFunctionJS(heart)
            console.log(heart)
        }
    }, [])


    function movingAverage(data: number[], windowSize: number = 1) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = data.slice(start, i + 1);
            const avg = window.reduce((a, b) => a + b, 0) / window.length;
            result.push(avg);
        }
        return result;
    }

    function detectPeaks(values: number[], minDistance: number, minProminence: number): number[] {
        const peaks: number[] = [];
        if (values.length < 3) return peaks;

        for (let i = 1; i < values.length - 1; i++) {
            const currentValue = values[i];
            const prevValue = values[i - 1];
            const nextValue = values[i + 1];

            // É um pico local?
            if (currentValue > prevValue && currentValue > nextValue) {
                // Verifica a proeminência (quão alto é o pico em relação aos vales próximos)
                let leftValley = currentValue;
                for (let j = i - 1; j >= 0; j--) {
                    leftValley = Math.min(leftValley, values[j]);
                    if (values[j] > currentValue) break; // Parar se encontrarmos um pico maior
                }

                let rightValley = currentValue;
                for (let j = i + 1; j < values.length; j++) {
                    rightValley = Math.min(rightValley, values[j]);
                    if (values[j] > currentValue) break;
                }

                const prominence = currentValue - Math.max(leftValley, rightValley);

                if (prominence >= minProminence) {
                    // Verifica a distância do último pico encontrado
                    if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
                        peaks.push(i);
                    }
                }
            }
        }
        return peaks;
    }

    function calculateBPM(timestamps: number[]): number {
        if (timestamps.length < 2) return 0;

        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            const delta = timestamps[i] - timestamps[i - 1]; // em ms
            intervals.push(delta);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        return 60000 / avgInterval; // ms -> bpm
    }
    useEffect(() => {
        // Processar apenas quando tivermos dados suficientes (ex: 5 segundos de dados a 30 FPS)
        const MIN_SAMPLES = 150;
        if (data.length < MIN_SAMPLES) {
            setBpm(null); // Ainda não temos dados suficientes
            return;
        }

        const values = data.map((d) => d.value);
        const times = data.map((d) => d.time);

        // 1. Filtragem: Aplica uma média móvel para suavizar o ruído
        const filteredValues = movingAverage(values, 3); // Janela pequena para suavizar

        // 2. Detecção de Picos
        const fps = 30; // O FPS que você configurou na câmera
        // Distância mínima: 40 bpm -> 1.5s/batida -> 1.5*30 = 45 frames
        const minPeakDistance = fps * (60 / 200); // Distância para 200 bpm (máximo)
        const minPeakProminence = 0.004; // Ajuste este valor! Dependerá da amplitude do seu sinal AC. Comece baixo.

        const peakIndices = detectPeaks(filteredValues, minPeakDistance, minPeakProminence);

        if (peakIndices.length < 2) {
            setBpm(null); // Não há picos suficientes para calcular
            return;
        }

        const peakTimes = peakIndices.map((index) => times[index]);
        const bpm = calculateBPM(peakTimes);

        // 3. Validação do BPM
        // Se o BPM estiver fora de uma faixa razoável, ignore-o.
        if (bpm > 40 && bpm < 200) {
            setBpm(Math.round(bpm));
        }
    }, [data]);

    if (!hasPermission) return <PermissionsPage />;
    if (!device) return <NoCameraDeviceError />;

    return (
        <View style={{ flex: 1 }}>
            <Camera
                style={{ flex: 1 }}
                device={device}
                isActive={true}
                torch={torch}
                format={format}
                fps={format?.maxFps}
                frameProcessor={frameProcessor}
            />
            <View style={{ position: 'absolute', width: '100%', zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', bottom: 40, }}>
                <Button
                    title={torch === 'on' ? 'Desligar lanterna' : 'Ligar lanterna'}
                    onPress={() => setTorch(torch === 'on' ? 'off' : 'on')}
                />
                <View style={{ position: 'absolute', bottom: 100, width: '100%' }}>
                    <RealTimeGraph dataPoint={valores} />
                </View>
                <Text style={{ fontSize: 24, textAlign: 'center', width: '100%' }}>
                    BPM: {bpm ?? 'Detectando...'}
                </Text>
                <Text style={{ fontSize: 16 }}>Red: {data.length > 0 ? data[data.length - 1].value.toFixed(2) : '...'}</Text>
            </View>
        </View>
    );
}
