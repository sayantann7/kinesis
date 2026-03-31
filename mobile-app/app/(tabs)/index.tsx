import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Database, Lightbulb, Target, FileText, ListChecks, ChevronRight, Settings as SettingsIcon, TerminalSquare } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const tagStyles: Record<string, { view: string, text: string }> = {
  COMPLAINT: { view: 'bg-red-50 border-red-200', text: 'text-red-600' },
  PRAISE: { view: 'bg-green-50 border-green-200', text: 'text-green-600' },
  FEATURE_REQUEST: { view: 'bg-blue-50 border-blue-200', text: 'text-[#002FA7]' },
  QUESTION: { view: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
  OTHER: { view: 'bg-gray-50 border-gray-200', text: 'text-[#71717A]' }
};

const InsightTypeTag = ({ type }: { type: string }) => {
  const style = tagStyles[type] || tagStyles.OTHER;
  return (
    <View className={`px-1.5 py-0.5 border rounded-sm ${style.view}`}>
      <Text className={`text-[10px] font-mono ${style.text}`}>{type}</Text>
    </View>
  );
};

const StatCard = ({ label, value, icon: Icon, colorHex }: any) => (
  <View className="w-[48%] border border-[#E4E4E7] bg-white p-4 mb-3 shadow-sm rounded-sm">
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-[10px] font-mono uppercase text-[#A1A1AA] tracking-widest">{label}</Text>
      <Icon size={16} color={colorHex || "#A1A1AA"} />
    </View>
    <Text className="text-3xl font-bold text-[#171717] tracking-tight">{value}</Text>
  </View>
);

export default function DashboardScreen() {
  const { API } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/dashboard/stats`, { withCredentials: true });
        setStats(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [API]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] justify-center items-center">
        <ActivityIndicator size="large" color="#002FA7" />
      </SafeAreaView>
    );
  }

  const s = stats || {};
  const recentInsights = s.recent_insights || [];

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <View>
          <Text className="text-3xl font-bold tracking-tight text-[#171717]">Command Center</Text>
          <Text className="text-xs font-mono text-[#A1A1AA] mt-1 tracking-wide">Product discovery overview</Text>
        </View>
        <View className="flex-row gap-x-3">
          <TouchableOpacity onPress={() => router.push('/cursor')} className="p-2 bg-white border border-[#E4E4E7] rounded-full shadow-sm">
            <TerminalSquare size={20} color="#171717" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} className="p-2 bg-white border border-[#E4E4E7] rounded-full shadow-sm">
            <SettingsIcon size={20} color="#171717" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>   
        <View className="flex-row flex-wrap justify-between">
          <StatCard label="Knowledge Base" value={s.sources || 0} icon={Database} colorHex="#002FA7" />
          <StatCard label="Items" value={s.source_items || 0} icon={Database} colorHex="#71717A" />
          <StatCard label="Key Findings" value={s.insights || 0} icon={Lightbulb} colorHex="#f59e0b" />
          <StatCard label="Project Ideas" value={s.opportunities || 0} icon={Target} colorHex="#16a34a" />
          <StatCard label="Product Briefs" value={s.briefs || 0} icon={FileText} colorHex="#002FA7" />
          <StatCard label="Developer Tasks" value={s.tasks || 0} icon={ListChecks} colorHex="#71717A" />
        </View>

        <View className="border border-[#E4E4E7] bg-white mt-4 shadow-sm mb-8 relative">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#E4E4E7]">
            <Text className="text-sm font-bold text-[#171717]">Recent Findings</Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-xs font-mono text-[#002FA7] mr-1">View all</Text>
              <ChevronRight size={12} color="#002FA7" />
            </TouchableOpacity>
          </View>

          <View className="divide-y divide-[#E4E4E7]">
            {recentInsights.length === 0 ? (
              <View className="p-8 items-center">
                <Lightbulb size={32} color="#E4E4E7" className="mb-2" />
                <Text className="text-xs font-mono text-[#A1A1AA] text-center">No findings yet. Add feedback data and process them.</Text>
              </View>
            ) : (
              recentInsights.map((ins: any, idx: number) => {
                const sentiment = ins.sentiment || 0;
                const sentimentColor = sentiment > 0 ? 'text-green-600' : sentiment < 0 ? 'text-red-500' : 'text-[#A1A1AA]';
                const isLast = idx === recentInsights.length - 1;
                return (
                  <View key={ins.insight_id || idx} className={`px-4 py-3 flex-row items-start ${!isLast ? 'border-b border-[#E4E4E7]' : ''}`}>
                    <InsightTypeTag type={ins.type} />
                    <View className="flex-1 mx-3">
                      <Text className="text-xs font-mono text-[#171717]" numberOfLines={1}>{ins.summary}</Text>
                      {ins.quote ? (
                        <Text className="text-[10px] font-mono text-[#A1A1AA] mt-1 italic" numberOfLines={1}>"{ins.quote}"</Text>
                      ) : null}
                    </View>
                    <Text className={`text-[10px] font-mono ${sentimentColor}`}>
                      {sentiment > 0 ? '+' : ''}{sentiment.toFixed(1)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
