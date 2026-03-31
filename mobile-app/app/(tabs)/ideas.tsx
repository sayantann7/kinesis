import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Target, ArrowUp, MessageSquare } from 'lucide-react-native';
import apiClient from '../../src/api/apiClient';

export default function IdeasScreen() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOpportunities = async () => {
    try {
      const response = await apiClient.get('/opportunities');
      setOpportunities(response.data.opportunities || []);
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOpportunities();
  };

  const statusColumns = [
    { id: 'OPEN', label: 'Open', color: '#22c55e', borderClass: 'border-t-green-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b', borderClass: 'border-t-amber-500' },
    { id: 'COMPLETED', label: 'Completed', color: '#002FA7', borderClass: 'border-t-[#002FA7]' },
    { id: 'DISCARDED', label: 'Discarded', color: '#9ca3af', borderClass: 'border-t-gray-400' },
  ];

  const groupedOpportunities = statusColumns.map((col) => ({
    ...col,
    items: opportunities.filter((op) => op.status === col.id),
  }));

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#002FA7" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAFA] pt-12 px-4">
      <View className="flex-row items-center mb-6">
        <Target size={24} color="#171717" />
        <Text className="font-heading text-2xl font-bold tracking-tight text-[#171717] ml-2">
          Project Ideas
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {groupedOpportunities.map((group) => {
          if (group.items.length === 0) return null;

          return (
            <View key={group.id} className="mb-8">
              <View className={`border-t-2 ${group.borderClass} pt-2 mb-4 flex-row justify-between items-center`}>
                <Text className="text-sm uppercase tracking-wider font-mono" style={{ color: group.color }}>
                  {group.label} ({group.items.length})
                </Text>
              </View>

              {group.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  className="bg-white border border-[#E4E4E7] rounded-lg p-4 mb-3"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-base text-[#171717] font-semibold flex-1 mr-2 font-heading" numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View className="flex-row items-center bg-[#F4F4F5] px-2 py-1 rounded">
                      <ArrowUp size={14} color="#002FA7" strokeWidth={3} />
                      <Text className="text-[#002FA7] text-xs ml-1 font-mono-bold">
                        {item.impact_score || 0}
                      </Text>
                    </View>
                  </View>

                  {item.description ? (
                    <Text className="text-sm text-[#A1A1AA] mb-4 font-mono" numberOfLines={3}>
                      {item.description}
                    </Text>
                  ) : null}

                  <View className="flex-row justify-end items-center mt-auto pt-2">
                    <View className="flex-row items-center border border-[#E4E4E7] px-2 py-1 rounded-full">
                      <MessageSquare size={12} color="#A1A1AA" />
                      <Text className="text-xs text-[#A1A1AA] ml-1 font-mono">
                        {item.insight_ids ? item.insight_ids.length : 0}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}