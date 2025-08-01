import NoCameraDeviceError from '@/components/NoCameraDeviceError';
import PermissionsPage from '@/components/Permission';
import { Ppgtest } from '@/components/PPGconection';
import { RealTimeGraph } from '@/components/RealtimeGraph';
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';

export default function PPGCamera() {
    const device = useCameraDevice('back');
    const [torch, setTorch] = useState<'on' | 'off'>('on');
    const { hasPermission } = useCameraPermission();
    
    let lastUpdateTime = 0
    const [bpm, setBpm] = useState<number | null>(null);
    const myFunctionJS = Worklets.createRunOnJS(setBpm)
    const frameProcessor = useFrameProcessor((frame) => {
        'worklet'
        const now = Date.now()
        const heart = Ppgtest(frame)
        if (typeof heart === 'number' && isFinite(heart) && now - lastUpdateTime > 1000) {
            lastUpdateTime = now
            myFunctionJS(heart)
            console.log(heart)
        }
    }, [])


    if (!hasPermission) return <PermissionsPage />;
    if (!device) return <NoCameraDeviceError />;

    return (
        <View style={{ flex: 1 }}>
            <Camera
                style={{ flex: 1 }}
                device={device}
                isActive={true}
                torch={torch}
                frameProcessor={frameProcessor}
            />
            <View style={{ position: 'absolute', bottom: 100, width: '100%' }}>
                <RealTimeGraph dataPoint={bpm} />
            </View>
            <View style={{ position: 'absolute', width: '100%', zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', bottom: 40, }}>
                <Button
                    title={torch === 'on' ? 'Desligar lanterna' : 'Ligar lanterna'}
                    onPress={() => setTorch(torch === 'on' ? 'off' : 'on')}
                />
                <Text style={{ fontSize: 24, textAlign: 'center', width: '100%' }}>
                    BPM: {bpm ?? 'Detectando...'}
                </Text>

            </View>
        </View>
    );
}
