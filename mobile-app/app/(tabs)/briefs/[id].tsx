import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function BriefDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { API } = useAuth();
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  useEffect(() => {
    fetchBrief();
  }, [id, API]);

  const fetchBrief = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/briefs/${id}`);
      setBrief(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  if (!brief) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
        <Text>Brief not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-4 py-2 bg-black rounded">
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Convert markdown to pseudo-html just for display, or use a markdown library.
  // Actually, let's just show text for now, or simple markdown renderer
  const markdownText = brief.content || 'No content yet...';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <View className="flex-row items-center border-b border-[#E4E4E7] p-4 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color="#171717" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-[#171717]" numberOfLines={1}>{brief.opportunity_title || 'Brief Detail'}</Text>
          <Text className="text-xs font-mono text-[#A1A1AA]">Version {brief.version} • Status: {brief.status}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Very simple text rendering for MarkDown content */}
        <Text className="text-base text-gray-800" style={{ lineHeight: 24 }}>
          {markdownText}
        </Text>
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}