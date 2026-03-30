import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, ChevronRight } from 'lucide-react-native';
import axios from 'axios';

const API = 'http://localhost:8000';

export default function DocsScreen() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBriefs = async () => {
      try {
        const oppsRes = await axios.get(`${API}/opportunities`);
        const allBriefs = [];
        for (const opp of oppsRes.data) {
          const oppDetail = await axios.get(`${API}/opportunities/${opp.opportunity_id}`);
          for (const brief of (oppDetail.data.briefs || [])) {
            allBriefs.push({ ...brief, opportunity_title: opp.title });
          }
        }
        // Sort by newest first just in case
        allBriefs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBriefs(allBriefs);
      } catch (error) {
        console.error('Error fetching briefs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefs();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity className="flex-row items-center justify-between p-4 mb-3 bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl">
      <View className="flex-1 mr-4">
        <Text className="text-lg font-heading text-[#171717] font-semibold mb-1" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-sm font-mono text-[#52525B] mb-2" numberOfLines={1}>
          {item.opportunity_title}
        </Text>
        <Text className="text-xs text-[#71717A]">
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date'}
        </Text>
      </View>
      <ChevronRight size={20} color="#A1A1AA" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      <View className="flex-row items-center px-6 py-4 border-b border-[#E4E4E7] bg-[#FFFFFF]">
        <FileText size={24} color="#171717" className="mr-3" />
        <Text className="text-2xl font-heading font-bold text-[#171717]">
          Product Briefs
        </Text>
      </View>
      
      {loading ? (
        <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
          <ActivityIndicator size="large" color="#171717" />
        </View>
      ) : (
        <FlatList
          data={briefs}
          keyExtractor={(item, index) => item.brief_id ? item.brief_id.toString() : index.toString()}
          renderItem={renderItem}
          contentContainerClassName="p-4"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-10 items-center justify-center">
              <Text className="text-[#A1A1AA] font-mono">No briefs found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

