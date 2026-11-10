/**
 * MemoryGallery — a memory opened as a gallery: swipe sideways through its
 * words, photos, videos, GIFs, songs, stamps and doodles, one per page. Only the page in
 * view plays. Reports the page index so the screen can act on it.
 */

import React from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { AudioSlide } from '@/components/memory-gallery/audio-slide';
import { DoodleSlide } from '@/components/memory-gallery/doodle-slide';
import { StampSlide } from '@/components/memory-gallery/stamp-slide';
import { PhotoSlide } from '@/components/memory-gallery/photo-slide';
import type { GallerySlide } from '@/components/memory-gallery/slides';
import { TextSlide } from '@/components/memory-gallery/text-slide';
import { VideoSlide } from '@/components/memory-gallery/video-slide';

interface MemoryGalleryProps {
  slides: GallerySlide[];
  width: number;
  height: number;
  index: number;
  /** Whether the screen is in front; nothing plays behind another screen. */
  focused: boolean;
  onIndexChange: (index: number) => void;
}

export function MemoryGallery({ slides, width, height, index, focused, onIndexChange }: MemoryGalleryProps) {
  // The page that settled after a swipe.
  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) onIndexChange(Math.max(0, Math.min(next, slides.length - 1)));
  };

  return (
    <FlatList
      data={slides}
      keyExtractor={(slide) => slide.id}
      horizontal
      pagingEnabled
      bounces={false}
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={onSettle}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      renderItem={({ item, index: i }) => {
        if (item.type === 'text') {
          return <TextSlide text={item.text} width={width} fontFamily={item.fontFamily} fontSize={item.fontSize} textColor={item.textColor} />;
        }
        const active = focused && i === index;
        if (item.type === 'doodle') return <DoodleSlide layer={item.layer} width={width} height={height} active={active} />;
        if (item.type === 'stamp') return <StampSlide imageUri={item.imageUri} place={item.place} stampedAt={item.stampedAt} width={width} height={height} />;
        switch (item.media.type) {
          case 'video':
            return <VideoSlide media={item.media} width={width} height={height} active={active} />;
          case 'audio':
            return <AudioSlide media={item.media} width={width} height={height} active={active} />;
          default:
            return <PhotoSlide media={item.media} width={width} height={height} />;
        }
      }}
    />
  );
}
