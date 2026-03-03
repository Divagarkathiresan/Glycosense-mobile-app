import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      <MaterialCommunityIcons name="hand-wave-outline" size={28} color="#1B4332" />
    </Animated.Text>
  );
}
