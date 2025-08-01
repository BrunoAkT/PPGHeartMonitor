import React, { useState, useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: () => '#333',
  propsForDots: { r: '0' },
};

interface Props {
  dataPoint: number | null;
}

export const RealTimeGraph: React.FC<Props> = ({ dataPoint }) => {
  const [dataPoints, setDataPoints] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    if (
      typeof dataPoint === 'number' &&
      !isNaN(dataPoint) &&
      isFinite(dataPoint)
    ) {
      setDataPoints((prev) => {
        const updated = [...prev, dataPoint];
        if (updated.length > 10) updated.shift(); // mantém últimos 50 pontos
        return updated;
      });
    }
  }, [dataPoint]);

  return (
    <View>
      <LineChart
        data={{
          labels: [],
          datasets: [{ data: dataPoints }],
        }}
        width={screenWidth - 20}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={{ marginVertical: 8, borderRadius: 8 }}
      />
    </View>
  );
};
