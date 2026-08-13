import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import type { Composition } from '@/types/journal';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

interface MomentumChartProps {
  compositions: Composition[];
}

export function MomentumChart({ compositions }: MomentumChartProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // Screen padding (16*2) + Container padding (16*2) + Borders (1*2) = 66
  const chartWidth = width - 66; 
  const chartHeight = 120;
  
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  // Create 10 data points (e.g. over 10 intervals) for a fake momentum curve based on entry frequency
  const data = useMemo(() => {
    // Generate a simple curve representing activity over the last 10 days
    const result = Array(10).fill(0);
    const now = new Date();
    
    compositions.forEach(c => {
      const diffTime = Math.abs(now.getTime() - new Date(c.createdAt).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays <= 10 && diffDays > 0) {
        result[10 - diffDays] += 1;
      }
    });
    
    // Add some noise to make it look like a cool graph even with little data
    return result.map((v, i) => v + Math.sin(i * 0.8) * 1.5 + 2);
  }, [compositions]);

  const maxVal = Math.max(...data, 5);
  const minVal = 0;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y };
  });

  // Construct SVG Path (smooth curve using cubic bezier)
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    pathD += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  // Create area path for gradient
  const areaD = `${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: theme.text }]}>Journaling Momentum</ThemedText>
        <View style={[styles.badge, { borderColor: theme.border }]}>
          <ThemedText style={styles.badgeText}>10D</ThemedText>
        </View>
      </View>

      <View 
        style={styles.chartContainer}
        onPointerMove={(e) => {
          const x = (e.nativeEvent as any).locationX || (e.nativeEvent as any).x;
          const index = Math.round((x / chartWidth) * (data.length - 1));
          setActiveIndex(Math.max(0, Math.min(data.length - 1, index)));
        }}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.text} stopOpacity="0.2" />
              <Stop offset="1" stopColor={theme.text} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          
          {/* Zero Line */}
          <Line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke={theme.text} strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 4" />
          
          {/* Area */}
          <Path d={areaD} fill="url(#gradient)" />
          
          {/* Line */}
          <Path d={pathD} fill="none" stroke={theme.text} strokeWidth="2" />
          
          {/* Active / Current Dot */}
          {activeIndex !== null ? (
            <Circle cx={points[activeIndex].x} cy={points[activeIndex].y} r="4" fill={theme.text} />
          ) : (
            <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={theme.text} />
          )}
        </Svg>
        
        {/* Interactive Tooltip (Active Index Card) */}
        {activeIndex !== null && (
          <View style={[
            styles.tooltip, 
            { 
              top: points[activeIndex].y - 50, 
              // Prevent tooltip from overflowing the right edge
              left: Math.min(points[activeIndex].x, chartWidth - 120),
              backgroundColor: theme.background, 
              borderColor: theme.border 
            }
          ]}>
            <ThemedText style={styles.tooltipTitle}>Activity Index</ThemedText>
            <View style={styles.tooltipRow}>
              <View style={[styles.dot, { backgroundColor: theme.text }]} />
              <ThemedText style={styles.tooltipLabel}>Score</ThemedText>
              <ThemedText style={[styles.tooltipValue, { color: theme.text }]}>{data[activeIndex].toFixed(2)}</ThemedText>
            </View>
          </View>
        )}
      </View>

      <View style={styles.xLabels}>
        <ThemedText style={styles.xLabel}>10d ago</ThemedText>
        <ThemedText style={styles.xLabel}>Today</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#0F0F0F',
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    color: '#E0E0E0',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 2,
  },
  badgeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#878787',
  },
  chartContainer: {
    position: 'relative',
    height: 120,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 8,
    borderRadius: 4,
    width: 120,
  },
  tooltipTitle: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#878787',
    marginBottom: 6,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 6,
  },
  tooltipLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#878787',
    flex: 1,
  },
  tooltipValue: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  xLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#878787',
  }
});
