/** A gallery page with a stamp placed on the memory, large and slightly turned, postmark and all. */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { StampView, STAMP_ASPECT } from '@/components/stamps/stamp-view';

interface StampSlideProps {
  imageUri: string;
  place: string;
  stampedAt: number;
  width: number;
  height: number;
}

export function StampSlide({ imageUri, place, stampedAt, width, height }: StampSlideProps) {
  const size = Math.min(width * 0.72, (height * 0.62) / STAMP_ASPECT);
  return (
    <View style={[styles.page, { width, height }]}>
      <View style={{ transform: [{ rotate: '-3deg' }] }}>
        <StampView imageUri={imageUri} place={place} createdAt={stampedAt} width={size} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', justifyContent: 'center' },
});
