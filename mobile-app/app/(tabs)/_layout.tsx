import { Tabs, Redirect } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { LayoutDashboard, Database, Lightbulb, Target, FileText } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#171717',
        tabBarInactiveTintColor: '#A1A1AA',
        tabBarStyle: { backgroundColor: '#FFFFFF' },
        tabBarLabelStyle: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10 },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => <LayoutDashboard size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Data',
          tabBarIcon: ({ color }) => <Database size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="triage"
        options={{
          title: 'Findings',
          tabBarIcon: ({ color }) => <Lightbulb size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ideas"
        options={{
          title: 'Ideas',
          tabBarIcon: ({ color }) => <Target size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="docs"
        options={{
          title: 'Briefs',
          tabBarIcon: ({ color }) => <FileText size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
