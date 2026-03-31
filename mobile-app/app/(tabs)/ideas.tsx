import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { Target, ArrowUp, MessageSquare, Plus, X, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import axios from 'axios';

const STATUS_OPTIONS = [
  { id: 'OPEN', label: 'Open', color: '#22c55e' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b' },
  { id: 'COMPLETED', label: 'Completed', color: '#002FA7' },
  { id: 'DISCARDED', label: 'Discarded', color: '#9ca3af' },
];

export default function IdeasScreen() {
  const { API } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImpact, setNewImpact] = useState('5');
  const [creating, setCreating] = useState(false);
  
  // Status update state
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleCreateIdea = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    setCreating(true);
    try {
      await axios.post(`${API}/opportunities`, {
        title: newTitle,
        description: newDesc,
        impact_score: parseInt(newImpact) || 5
      });
      setModalVisible(false);
      setNewTitle('');
      setNewDesc('');
      setNewImpact('5');
      fetchOpportunities();
    } catch (err) {
      console.error('Failed to create idea:', err);
      Alert.alert('Error', 'Failed to create idea');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedOpportunity) return;
    
    setUpdatingStatus(true);
    try {
      await axios.put(`${API}/opportunities/${selectedOpportunity.opportunity_id}`, {
        status: newStatus
      });
      // Update locally for immediate feedback
      setOpportunities(prev => prev.map(op => 
        op.opportunity_id === selectedOpportunity.opportunity_id 
          ? { ...op, status: newStatus } 
          : op
      ));
      setStatusModalVisible(false);
      setSelectedOpportunity(null);
    } catch (err) {
      console.error('Failed to update status:', err);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openStatusModal = (opportunity: any, e: any) => {
    // Prevent navigation when clicking status
    e.stopPropagation();
    setSelectedOpportunity(opportunity);
    setStatusModalVisible(true);
  };

  const fetchOpportunities = async () => {
    try {
      const response = await axios.get(`${API}/opportunities`);
      console.log("IDEAS:", JSON.stringify(response.data)); setOpportunities(Array.isArray(response.data) ? response.data : (response.data?.opportunities || []));
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
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}><View className="flex-1 px-4">
      <View className="flex-row justify-between items-center mb-6 mt-4">
        <View className="flex-row items-center">
            <Target size={24} color="#171717" />
            <Text className="font-heading text-2xl font-bold tracking-tight text-[#171717] ml-2">
            Project Ideas
            </Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="bg-black w-10 h-10 rounded-full items-center justify-center shadow-md"
        >
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-xl p-5 w-full shadow-lg">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-black">New Idea</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold mb-1 text-gray-700">Title</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="E.g., Implement dark mode"
              className="border border-gray-300 rounded-lg p-3 mb-4 text-black bg-gray-50"
            />

            <Text className="text-sm font-semibold mb-1 text-gray-700">Description</Text>
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="What is this idea about?"
              multiline
              numberOfLines={3}
              className="border border-gray-300 rounded-lg p-3 mb-4 text-black bg-gray-50 h-24"
              textAlignVertical="top"
            />

            <Text className="text-sm font-semibold mb-1 text-gray-700">Impact Score (1-10)</Text>
            <TextInput
              value={newImpact}
              onChangeText={setNewImpact}
              keyboardType="numeric"
              placeholder="5"
              className="border border-gray-300 rounded-lg p-3 mb-6 text-black bg-gray-50"
            />

            <TouchableOpacity
              onPress={handleCreateIdea}
              disabled={creating}
              className={`py-3 rounded-lg items-center ${creating ? 'bg-gray-400' : 'bg-black'}`}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text className="text-white font-bold text-base">Create Idea</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {groupedOpportunities.map((group) => {
          

          return (
            <View key={group.id} className="mb-8">
              <View className={`border-t-2 ${group.borderClass} pt-2 mb-4 flex-row justify-between items-center`}>
                <Text className="text-sm uppercase tracking-wider font-mono" style={{ color: group.color }}>
                  {group.label} ({group.items.length})
                </Text>
              </View>

              {group.items.map((item) => (
                <TouchableOpacity
                  key={item.opportunity_id}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/opp-detail', params: { id: item.opportunity_id } })}
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

                  <View className="flex-row justify-between items-center mt-auto pt-2">
                    {/* Status badge - tappable */}
                    <TouchableOpacity 
                      onPress={(e) => openStatusModal(item, e)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                        backgroundColor: STATUS_OPTIONS.find(s => s.id === item.status)?.color + '15' || '#F4F4F5',
                        borderWidth: 1,
                        borderColor: STATUS_OPTIONS.find(s => s.id === item.status)?.color || '#E4E4E7',
                      }}
                    >
                      <Text style={{ 
                        fontSize: 10, 
                        fontFamily: 'monospace', 
                        color: STATUS_OPTIONS.find(s => s.id === item.status)?.color || '#71717A' 
                      }}>
                        {STATUS_OPTIONS.find(s => s.id === item.status)?.label || item.status}
                      </Text>
                      <ChevronDown size={12} color={STATUS_OPTIONS.find(s => s.id === item.status)?.color || '#71717A'} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                    
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

      {/* Status Update Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={{ backgroundColor: 'white', borderRadius: 8, width: '80%', padding: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#171717', marginBottom: 12 }}>
              Update Status
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#A1A1AA', marginBottom: 16 }} numberOfLines={1}>
              {selectedOpportunity?.title}
            </Text>
            
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status.id}
                onPress={() => handleStatusUpdate(status.id)}
                disabled={updatingStatus}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderWidth: 1,
                  borderColor: selectedOpportunity?.status === status.id ? status.color : '#E4E4E7',
                  backgroundColor: selectedOpportunity?.status === status.id ? status.color + '15' : 'white',
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <View style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: 6, 
                  backgroundColor: status.color, 
                  marginRight: 10 
                }} />
                <Text style={{ 
                  fontSize: 13, 
                  fontFamily: 'monospace', 
                  color: selectedOpportunity?.status === status.id ? status.color : '#171717',
                  flex: 1
                }}>
                  {status.label}
                </Text>
                {selectedOpportunity?.status === status.id && (
                  <Text style={{ fontSize: 10, fontFamily: 'monospace', color: status.color }}>Current</Text>
                )}
              </TouchableOpacity>
            ))}
            
            {updatingStatus && (
              <ActivityIndicator size="small" color="#002FA7" style={{ marginTop: 8 }} />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
    </SafeAreaView>
  );
}
