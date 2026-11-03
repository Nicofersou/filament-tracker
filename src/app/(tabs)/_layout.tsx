import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inventario',
          tabBarIcon: ({ color, size }) => (
            // Añadimos 'as string' para calmar a TypeScript con el tipo del color
            <Ionicons name="layers-outline" size={size} color={color as string} />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/add-spool')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Añadir bobinas"
              style={{ marginRight: 16 }}
            >
              <Ionicons name="add" size={28} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="prints"
        options={{
          title: 'Impresiones',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
