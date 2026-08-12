import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Pattern, Path, Line, Text as SvgText, G } from 'react-native-svg';
import type { Composition } from '@/types/journal';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

interface VolumeChartProps {
  compositions: Composition[];
}

export function VolumeChart({ compositions }: VolumeChartProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // Screen padding (16*2) + Container padding (16*2) + Borders (1*2) = 66
  const chartWidth = width - 66; 
  const chartHeight = 150;
  
  // Aggregate data by month for the last 5 months
  const data = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];
    
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        label: months[d.getMonth()],
        text: 0,
        audio: 0,
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }

    compositions.forEach(c => {
      const d = new Date(c.createdAt);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const bucket = result.find(b => b.month === m && b.year === y);
      if (bucket) {
        if (c.type === 'text') bucket.text++;
        if (c.type === 'audio') bucket.audio++;
      }
    });

    return result;
  }, [compositions]);

  const maxVal = Math.max(...data.map(d => Math.max(d.text, d.audio)), 5);
  const barWidth = 8;
  const groupSpacing = chartWidth / data.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: theme.text }]}>Text/Audio Volume</ThemedText>
        <View style={[styles.badge, { borderColor: theme.border }]}>
          <ThemedText style={styles.badgeText}>6M</ThemedText>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <ThemedText style={styles.statLabel}>Total Entries</ThemedText>
          <ThemedText style={[styles.statValue, { color: theme.text }]}>{compositions.length}</ThemedText>
        </View>
        <View style={styles.statCol}>
          <ThemedText style={styles.statLabel}>Text Ratio</ThemedText>
          <ThemedText style={[styles.statValue, { color: theme.text }]}>
            {compositions.length > 0 
              ? Math.round((compositions.filter(c => c.type === 'text').length / compositions.length) * 100) 
              : 0}%
          </ThemedText>
        </View>
        <View style={styles.statCol}>
          <ThemedText style={styles.statLabel}>Net Audio</ThemedText>
          <ThemedText style={[styles.statValue, { color: '#00FF66' }]}>
            +{compositions.filter(c => c.type === 'audio').length}
          </ThemedText>
        </View>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        <Pattern id="stripes" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <Path d="M -1,2 l 6,0" stroke={theme.text} strokeWidth="1.5" />
        </Pattern>

        {/* Y Axis Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = chartHeight - 20 - (chartHeight - 40) * ratio;
          const val = Math.round(maxVal * ratio);
          return (
            <G key={`grid-${i}`}>
              <Line x1="0" y1={y} x2={chartWidth - 25} y2={y} stroke={theme.text} strokeOpacity="0.1" strokeWidth="1" />
              <SvgText x={chartWidth} y={y + 4} fill="#878787" fontSize="9" fontFamily="JetBrainsMono-Regular" textAnchor="end">
                {val}
              </SvgText>
            </G>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const xCenter = (i + 0.5) * (chartWidth - 30) / data.length;
          
          const textHeight = (d.text / maxVal) * (chartHeight - 40);
          const audioHeight = (d.audio / maxVal) * (chartHeight - 40);

          return (
            <G key={`bar-${i}`}>
              {/* Text Bar (Striped) */}
              <Rect 
                x={xCenter - barWidth - 2} 
                y={chartHeight - 20 - textHeight} 
                width={barWidth} 
                height={textHeight} 
                fill="url(#stripes)" 
              />
              
              {/* Audio Bar (Solid) */}
              <Rect 
                x={xCenter + 2} 
                y={chartHeight - 20 - audioHeight} 
                width={barWidth} 
                height={audioHeight} 
                fill={theme.text} 
              />

              {/* X Axis Label */}
              <SvgText x={xCenter} y={chartHeight} fill="#878787" fontSize="9" fontFamily="JetBrainsMono-Regular" textAnchor="middle">
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#878787',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  }
});
