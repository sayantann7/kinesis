import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import axios from 'axios';
import { Lightbulb, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';

const InsightTypeTag = ({ type }: { type?: string }) => {
  const bgClasses: Record<string, string> = {
    COMPLAINT: 'bg-red-50 border-red-200',
    PRAISE: 'bg-green-50 border-green-200',
    FEATURE_REQUEST: 'bg-blue-50 border-blue-200',
    QUESTION: 'bg-amber-50 border-amber-200',
    OTHER: 'bg-gray-50 border-gray-200'
  };
  
  const textClasses: Record<string, string> = {
    COMPLAINT: 'text-red-600',
    PRAISE: 'text-green-600',
    FEATURE_REQUEST: 'text-[#002FA7]',
    QUESTION: 'text-amber-600',
    OTHER: 'text-[#71717A]'
  };

  const typeStr = type || 'OTHER';
  return (
    <View className={`border rounded-sm px-1.5 py-0.5 flex-row items-center self-start ${bgClasses[typeStr] || bgClasses.OTHER}`}>
      <Text className={`text-[10px] font-mono font-medium tracking-wide ${textClasses[typeStr] || textClasses.OTHER}`}>
        {typeStr.replace('_', ' ')}
      </Text>
    </View>
  );
};

const SentimentIcon = ({ value }: { value: number }) => {
  if (value > 0.2) return <TrendingUp size={12} color="#16a34a" />;
  if (value < -0.2) return <TrendingDown size={12} color="#ef4444" />;
  return <Minus size={12} color="#A1A1AA" />;
};

export default function TriageScreen() {
  const { API } = useAuth();
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/insights`);
      setInsights(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInsights();
  }, [fetchInsights]);

  const renderItem = ({ item }: { item: any }) => {
    const sentimentLabel = item.sentiment > 0.2 ? 'Positive' : item.sentiment < -0.2 ? 'Negative' : 'Neutral';
    const sentimentColor = item.sentiment > 0.2 ? 'text-green-600' : item.sentiment < -0.2 ? 'text-red-500' : 'text-[#A1A1AA]';
    
    // Format date if needed, fallback to generic strings if formatting fails
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';

    return (
      <View className="bg-[#FFFFFF] border border-[#E4E4E7] shadow-sm mb-3 p-4 rounded-md">
        <View className="flex-row justify-between items-start mb-2">
          <InsightTypeTag type={item.type} />
          <Text className="text-[10px] font-mono text-[#A1A1AA]">{dateStr}</Text>
        </View>

        <Text className="text-xs font-mono text-[#171717] mb-2 leading-tight">
          {item.summary}
        </Text>

        {item.quote && (
          <Text className="text-[10px] font-mono text-[#A1A1AA] italic mb-3">
            "{item.quote}"
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center gap-1">
            <SentimentIcon value={item.sentiment} />
            <Text className={`text-[10px] font-mono ml-1 ${sentimentColor}`}>
              {sentimentLabel}
            </Text>
          </View>

          {item.tags && item.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1">
              {item.tags.slice(0, 2).map((tag: string, idx: number) => (
                <View key={idx} className="bg-[#F4F4F5] px-1 py-0.5 rounded-sm">
                  <Text className="text-[9px] font-mono text-[#71717A]">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 py-6 border-b border-[#E4E4E7] bg-white">
        <View className="flex-row items-center gap-2 mb-1">
          <Lightbulb size={24} color="#000" />
          <Text className="font-heading text-2xl font-bold tracking-tight text-[#171717]">
            Insights & Findings
          </Text>
        </View>
        <Text className="text-xs font-mono text-[#A1A1AA] ml-8">
          {insights.length} insights extracted
        </Text>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#002FA7" />
        </View>
      ) : (
        <FlatList
          data={insights}
          keyExtractor={(item, index) => item.insight_id?.toString() || index.toString()}
          renderItem={renderItem}
          contentContainerClassName="p-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="border border-[#E4E4E7] bg-white p-12 mt-4 items-center shadow-sm rounded-md">
              <Lightbulb size={40} color="#E4E4E7" className="mb-3" />
              <Text className="text-sm font-mono text-[#A1A1AA]">No insights yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
