import NoCameraDeviceError from '@/components/NoCameraDeviceError';
import PermissionsPage from '@/components/Permission';
import { Ppgtest } from '@/components/PPGconection';
import { RealTimeGraph } from '@/components/RealtimeGraph';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';

let lastValidValue = 0

export default function PPGCamera() {
    const device = useCameraDevice('back');
    const [torch, setTorch] = useState<'on' | 'off'>('off');
    const { hasPermission } = useCameraPermission();
    const format = useCameraFormat(device, [
        { videoResolution: 'auto' },
        { fps: 30 },
        { autoFocusSystem: 'none' }
    ])

    const [bpm, setBpm] = useState<number | null>(null);
    const [valores, setValores] = useState<number | null>(null);

    const [data, setData] = useState<{ time: number; value: number }[]>([])

    const [isFingerDetected, setIsFingerDetected] = useState(false);
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [calibrationData, setCalibrationData] = useState<number[]>([]);

    const isFingerDetectedRef = useRef(isFingerDetected);
    const isCalibratedRef = useRef(isCalibrated);

    useEffect(() => {
        isFingerDetectedRef.current = isFingerDetected;
        isCalibratedRef.current = isCalibrated;
    }, [isFingerDetected, isCalibrated]);

    const savePPGValue = (result: { ac: number, dc: number }) => {
        // 1. Portão de Qualidade: o dedo está na câmera?
        if (result.dc < 180) {
            if (isFingerDetectedRef.current) { // Apenas reseta se estava detectado antes
                setIsFingerDetected(false);
                setIsCalibrated(false);
                setCalibrationData([]);
                setData([]);
                setBpm(null);
            }
            return;
        }

        if (!isFingerDetectedRef.current) {
            setIsFingerDetected(true);
        }

        // 2. Fase de Calibração
        if (isFingerDetectedRef.current && !isCalibratedRef.current) {
            // Usando a forma funcional para garantir que estamos adicionando ao array mais recente
            setCalibrationData(prevCalibrationData => {
                const newCalibrationData = [...prevCalibrationData, result.ac];

                console.log(`Calibrando... ${newCalibrationData.length}/90`);

                // A lógica de finalização de calibração vai aqui dentro
                if (newCalibrationData.length >= 90) {
                    console.log("Calibração concluída! Iniciando medição.");
                    setIsCalibrated(true);
                    // Prepara para a próxima medição limpando os dados de calibração
                    return [];
                }

                // Continua a calibração retornando o novo array
                return newCalibrationData;
            });
            return; // Sai da função durante a calibração
        }

        // 3. Fase de Medição
        if (isCalibratedRef.current) {
            const timestamp = Date.now();
            setData((prev) => [...prev.slice(-300), { time: timestamp, value: result.ac }]);
            setValores(result.ac);
        }
    };
    const myFunctionJS = Worklets.createRunOnJS(savePPGValue);

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet'
        const heart = Ppgtest(frame)
        if (heart && typeof heart.ac === 'number' && typeof heart.dc === 'number') {
            myFunctionJS(heart)
            //console.log(heart)

        }
    }, [])

    function bandpassFilter(data: number[], lowCutoff: number, highCutoff: number): number[] {
        // Esta é uma implementação simplificada usando médias móveis

        // Filtro Passa-Baixa (remove altas frequências)
        const lowPassFiltered = movingAverage(data, lowCutoff);

        // Filtro Passa-Alta (remove baixas frequências)
        const highPassFiltered = movingAverage(data, highCutoff);

        // O sinal final é o resultado do passa-baixa menos o passa-alta
        const bandPassFiltered = lowPassFiltered.map((value, index) => {
            return value - highPassFiltered[index];
        });

        return bandPassFiltered;
    }

    function movingAverage(data: number[], windowSize: number): number[] {
        const result: number[] = [];
        for (let i = 0; i < data.length; i++) {
            // Para os primeiros elementos, a janela é menor
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
    // Função para calcular desvio padrão
    function getStandardDeviation(array: number[]): number {
        const n = array.length;
        if (n === 0) return 0;
        const mean = array.reduce((a, b) => a + b) / n;
        const variance = array.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        return Math.sqrt(variance);
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
        const filteredValues = bandpassFilter(values, 2, 10);
        // Calcule o desvio padrão do sinal filtrado
        const signalStdDev = getStandardDeviation(filteredValues);

        // 2. Detecção de Picos
        const fps = 30; // O FPS que você configurou na câmera
        // Distância mínima: 40 bpm -> 1.5s/batida -> 1.5*30 = 45 frames
        const minPeakDistance = fps * (60 / 200); // Distância para 200 bpm (máximo)
        // Use o desvio padrão para definir a proeminência dinamicamente!
        // Um bom ponto de partida é usar o próprio desvio padrão como limiar.
        // Você pode multiplicar por um fator (ex: 1.5) se precisar de mais seletividade.
        const minPeakProminence = signalStdDev * 1.2;
        const peakIndices = detectPeaks(filteredValues, minPeakDistance, minPeakProminence);

        if (peakIndices.length < 2) {
            console.log('Não há picos suficientes para calcular')
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
                    {isFingerDetected ? (bpm ?? 'Analisando...') : 'Posicione o dedo na câmera'}
                </Text>
                <View style={{
                    backgroundColor:
                        data.length > 0
                            ? data[data.length - 1].value >= 0
                                ? 'red'
                                : 'green'
                            : 'transparent',
                    padding: 8,
                    borderRadius: 5,
                }}>
                    <Text style={{ fontSize: 16, color: 'white' }}>
                        Red: {data.length > 0 ? data[data.length - 1].value.toFixed(2) : '...'}
                    </Text>
                </View>
            </View>
        </View>
    );
}
