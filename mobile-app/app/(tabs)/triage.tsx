import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { Lightbulb, TrendingUp, TrendingDown, Minus, Filter, X, Sparkles, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { SkeletonList, SkeletonInsight } from '../../components/ui';

const INSIGHT_TYPES = ['ALL', 'COMPLAINT', 'PRAISE', 'FEATURE_REQUEST', 'QUESTION', 'OTHER'];

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

// Filter chip component
function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: active ? '#002FA7' : '#E4E4E7',
        backgroundColor: active ? '#EFF6FF' : 'white',
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ 
        fontSize: 11, 
        fontFamily: 'monospace', 
        color: active ? '#002FA7' : '#71717A' 
      }}>
        {label.replace('_', ' ')}
      </Text>
    </TouchableOpacity>
  );
}

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
  
  // Filtering state
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Clustering state
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [clusterPrompt, setClusterPrompt] = useState('');
  const [clustering, setClustering] = useState(false);

  // Extract unique tags from insights
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    insights.forEach(i => {
      (i.tags || []).forEach((t: string) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [insights]);

  // Filter insights
  const filteredInsights = useMemo(() => {
    return insights.filter(i => {
      if (selectedType !== 'ALL' && i.type !== selectedType) return false;
      if (selectedTag && !(i.tags || []).includes(selectedTag)) return false;
      return true;
    });
  }, [insights, selectedType, selectedTag]);

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

  const handleCluster = async () => {
    if (!clusterPrompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt for clustering');
      return;
    }
    
    setClustering(true);
    try {
      await axios.post(`${API}/insights/cluster`, { prompt: clusterPrompt });
      setShowClusterModal(false);
      setClusterPrompt('');
      // Refresh to show any new opportunities created
      Alert.alert('Success', 'Insights clustered into opportunities. Check the Ideas tab.');
      fetchInsights();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to cluster insights');
    } finally {
      setClustering(false);
    }
  };

  const clearFilters = () => {
    setSelectedType('ALL');
    setSelectedTag(null);
  };

  const hasActiveFilters = selectedType !== 'ALL' || selectedTag !== null;

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
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-4 border-b border-[#E4E4E7] bg-white">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center gap-2">
            <Lightbulb size={24} color="#000" />
            <Text className="font-heading text-2xl font-bold tracking-tight text-[#171717]">
              Insights & Findings
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={{
                padding: 8,
                borderRadius: 4,
                backgroundColor: hasActiveFilters ? '#EFF6FF' : 'transparent',
                borderWidth: 1,
                borderColor: hasActiveFilters ? '#002FA7' : '#E4E4E7',
                marginRight: 8,
              }}
            >
              <Filter size={18} color={hasActiveFilters ? '#002FA7' : '#71717A'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowClusterModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 8,
                paddingHorizontal: 12,
                borderRadius: 4,
                backgroundColor: '#171717',
              }}
            >
              <Sparkles size={14} color="white" />
              <Text style={{ color: 'white', fontSize: 11, fontFamily: 'monospace', marginLeft: 6 }}>Cluster</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-xs font-mono text-[#A1A1AA] ml-8">
          {filteredInsights.length} of {insights.length} insights
        </Text>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E4E4E7', paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1 }}>
              Type
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#002FA7' }}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {INSIGHT_TYPES.map(type => (
              <FilterChip 
                key={type} 
                label={type} 
                active={selectedType === type} 
                onPress={() => setSelectedType(type)} 
              />
            ))}
          </View>
          
          {allTags.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 8 }}>
                Tags
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <FilterChip 
                  label="All Tags" 
                  active={selectedTag === null} 
                  onPress={() => setSelectedTag(null)} 
                />
                {allTags.slice(0, 8).map(tag => (
                  <FilterChip 
                    key={tag} 
                    label={tag} 
                    active={selectedTag === tag} 
                    onPress={() => setSelectedTag(tag)} 
                  />
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#002FA7" />
        </View>
      ) : (
        <FlatList
          data={filteredInsights}
          keyExtractor={(item, index) => item.insight_id?.toString() || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="border border-[#E4E4E7] bg-white p-12 mt-4 items-center shadow-sm rounded-md">
              <Lightbulb size={40} color="#E4E4E7" className="mb-3" />
              <Text className="text-sm font-mono text-[#A1A1AA]">
                {hasActiveFilters ? 'No insights match filters' : 'No insights yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* Cluster Modal */}
      <Modal
        visible={showClusterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClusterModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 8, width: '90%', maxWidth: 400, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717' }}>Group Related Ideas</Text>
              <TouchableOpacity onPress={() => setShowClusterModal(false)}>
                <X size={20} color="#71717A" />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717A', marginBottom: 12 }}>
              Describe how you want to cluster these insights into opportunities:
            </Text>
            
            <TextInput
              value={clusterPrompt}
              onChangeText={setClusterPrompt}
              placeholder="e.g., Group by user workflow, Group by feature area..."
              placeholderTextColor="#A1A1AA"
              multiline
              style={{
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 4,
                padding: 12,
                minHeight: 80,
                fontSize: 13,
                fontFamily: 'monospace',
                color: '#171717',
                marginBottom: 16,
              }}
            />
            
            <TouchableOpacity
              onPress={handleCluster}
              disabled={clustering}
              style={{
                backgroundColor: clustering ? '#A1A1AA' : '#171717',
                padding: 12,
                borderRadius: 4,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {clustering ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={{ color: 'white', fontFamily: 'monospace', marginLeft: 8 }}>Clustering...</Text>
                </>
              ) : (
                <>
                  <Sparkles size={16} color="white" />
                  <Text style={{ color: 'white', fontFamily: 'monospace', marginLeft: 8 }}>Cluster Insights</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
