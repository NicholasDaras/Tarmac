import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@tarmac/onboarding_complete';

const SLIDES = [
  {
    id: '1',
    icon: 'car-sport-outline' as const,
    title: 'Record Your Drive',
    body: 'Tap Start Drive and Tarmac tracks your route in the background — even with the screen locked. Just drive.',
  },
  {
    id: '2',
    icon: 'people-outline' as const,
    title: 'Share with the Community',
    body: 'Add photos, rate the road, and drop points of interest. Let fellow enthusiasts discover your favourite routes.',
  },
  {
    id: '3',
    icon: 'map-outline' as const,
    title: 'Discover Great Roads',
    body: 'Browse drives from your local car scene. Filter by tags, rating, and road type to find your next adventure.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)/feed');
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.iconCircle}>
        <Ionicons name={item.icon} size={72} color="#000" />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideBody}>{item.body}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip */}
      <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        style={styles.slideList}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.cta} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.ctaText}>
          {activeIndex === SLIDES.length - 1 ? "Let's Go" : 'Next'}
        </Text>
        <Ionicons
          name={activeIndex === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
          size={20}
          color="#fff"
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      <View style={{ height: 16 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipText: { fontSize: 15, color: '#999' },

  slideList: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideBody: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dotActive: {
    backgroundColor: '#000',
    width: 24,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 18,
    marginHorizontal: 24,
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
