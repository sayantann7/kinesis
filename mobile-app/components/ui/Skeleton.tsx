import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 4, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E4E4E7',
          opacity,
        },
        style,
      ]}
    />
  );
}

// Skeleton variants for common use cases
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={100} height={12} />
        <Skeleton width={60} height={12} />
      </View>
      <Skeleton width="90%" height={14} style={{ marginTop: 12 }} />
      <Skeleton width="70%" height={14} style={{ marginTop: 8 }} />
      <View style={styles.cardFooter}>
        <Skeleton width={80} height={10} />
        <Skeleton width={40} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

export function SkeletonInsight({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={80} height={16} borderRadius={2} />
        <Skeleton width={50} height={12} />
      </View>
      <Skeleton width="100%" height={12} style={{ marginTop: 10 }} />
      <Skeleton width="85%" height={12} style={{ marginTop: 6 }} />
      <View style={styles.cardFooter}>
        <Skeleton width={60} height={14} />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Skeleton width={40} height={14} borderRadius={2} />
          <Skeleton width={40} height={14} borderRadius={2} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonOpportunity({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width="70%" height={16} />
        <Skeleton width={40} height={20} borderRadius={4} />
      </View>
      <Skeleton width="90%" height={12} style={{ marginTop: 12 }} />
      <Skeleton width="60%" height={12} style={{ marginTop: 6 }} />
      <View style={styles.cardFooter}>
        <Skeleton width={60} height={20} borderRadius={4} />
        <Skeleton width={40} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

export function SkeletonBrief({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={120} height={14} />
        <Skeleton width={50} height={16} borderRadius={2} />
      </View>
      <Skeleton width="100%" height={60} style={{ marginTop: 12 }} borderRadius={6} />
      <View style={styles.cardFooter}>
        <Skeleton width={80} height={12} />
        <Skeleton width={100} height={28} borderRadius={4} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3, ItemComponent = SkeletonCard }: { count?: number; ItemComponent?: React.ComponentType<any> }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <ItemComponent key={i} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

export function SkeletonStats() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.statCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Skeleton width={60} height={10} />
            <Skeleton width={16} height={16} borderRadius={8} />
          </View>
          <Skeleton width={50} height={28} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
  },
});
