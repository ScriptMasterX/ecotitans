import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

type TabBarIconProps = {
  color: string;
  size: number;
};

export default function ScanScreen() {
  return (
    <View>
      <Text>Scan</Text>
    </View>
  );
}

ScanScreen.options = {
  tabBarIcon: ({ color, size }: TabBarIconProps) => (
    <Ionicons name="camera-outline" color={color} size={size} />
  ),
};
