import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Activity, ArrowLeft } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../src/contexts/AuthContext';

export default function CursorActivityScreen() {
  const router = useRouter();
  const { API } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/activity?limit=25`);
      setActivities(res.data?.activities || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="mb-3 p-4 bg-white border border-[#E4E4E7] rounded-xl shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-mono text-[#002FA7] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
          {item.action || 'ACTIVITY'}
        </Text>
        <Text className="text-[10px] font-mono text-[#A1A1AA]">
          {item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown Time'}
        </Text>
      </View>
      <Text className="text-sm text-[#171717]">{item.details ? JSON.stringify(item.details) : 'No specific details provided.'}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      <View className="flex-row items-center border-b border-[#E4E4E7] p-4 bg-white shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color="#171717" />
        </TouchableOpacity>
        <Activity size={20} color="#171717" style={{ marginRight: 8 }} />
        <Text className="text-xl font-heading font-bold text-[#171717]">Cursor Activity</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
          <ActivityIndicator size="large" color="#171717" />
        </View>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderItem}
          keyExtractor={(item, idx) => item.activity_id ? item.activity_id.toString() : idx.toString()}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Activity size={48} color="#D4D4D8" style={{ marginBottom: 16 }} />
              <Text className="text-[#71717A] text-center font-mono">No IDE activity recorded yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}