import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useTheme } from '../../theme';

function HeaderAddButton({ href, label }: { href: '/add-spool' | '/new-print'; label: string }) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(href)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ marginRight: 16 }}
    >
      <Ionicons name="add" size={28} color={colors.accent} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

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
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="layers-outline"
              size={size}
              color={focused ? colors.accent : colors.textSecondary}
            />
          ),
          headerRight: () => <HeaderAddButton href="/add-spool" label="Añadir bobinas" />,
        }}
      />
      <Tabs.Screen
        name="prints"
        options={{
          title: 'Impresiones',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="cube-outline"
              size={size}
              color={focused ? colors.accent : colors.textSecondary}
            />
          ),
          headerRight: () => <HeaderAddButton href="/new-print" label="Registrar impresión" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={focused ? colors.accent : colors.textSecondary}
            />
          ),
        }}
      />
    </Tabs>
  );
}
