import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Database, Plus, RefreshCw, Trash2, FileText, Cpu, CheckCircle2, Clock } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import API from '../../src/api/apiClient';

export default function SourcesScreen() {
  const { user } = useAuth();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      const res = await API.get('/sources');
      setSources(res.data);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSources();
    }
  }, [user, fetchSources]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSources();
  };

  const handleProcess = async (id) => {
    setProcessingId(id);
    try {
      await API.post(`/sources/${id}/process`);
      Alert.alert('Success', 'Source processing started');
      fetchSources();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to process source');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Source",
      "Are you sure you want to delete this source?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/sources/${id}`);
              fetchSources();
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Failed to delete source');
            }
          }
        }
      ]
    );
  };

  const handleCreateSource = () => {
    Alert.alert('Create Source', 'This feature is coming to mobile soon. Please use the web dashboard to upload files.');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={14} className="text-green-600 mr-1" />;
      case 'processing': return <RefreshCw size={14} className="text-blue-600 mr-1" />;
      default: return <Clock size={14} className="text-gray-600 mr-1" />;
    }
  };

  const renderSourceItem = ({ item }) => (
    <View className="bg-white p-4 rounded-xl border border-[#E4E4E7] mb-3 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 pr-2">
          <FileText size={18} color="#52525B" className="mr-2" />
          <Text className="text-[16px] font-semibold text-gray-900" numberOfLines={1}>{item.name}</Text>
        </View>
        <View className={`flex-row items-center px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
          {getStatusIcon(item.status)}
          <Text className={`text-xs font-medium ${getStatusColor(item.status).split(' ')[0]}`}>
            {item.status || 'pending'}
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <Text className="text-xs text-gray-500">
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        
        <View className="flex-row items-center space-x-2 gap-2">
          <TouchableOpacity 
            onPress={() => handleDelete(item.id)}
            className="p-2 bg-gray-50 rounded-lg border border-gray-200"
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleProcess(item.id)}
            disabled={processingId === item.id || item.status === 'processing'}
            className={`flex-row items-center px-3 py-2 rounded-lg ${
              processingId === item.id || item.status === 'processing' 
                ? 'bg-gray-100' 
                : 'bg-black'
            }`}
          >
            {processingId === item.id ? (
              <ActivityIndicator size="small" color="#52525B" className="mr-1" />
            ) : (
              <Cpu size={16} color={processingId === item.id || item.status === 'processing' ? "#52525B" : "#FFFFFF"} className="mr-1" />
            )}
            <Text className={`text-sm font-medium ${
              processingId === item.id || item.status === 'processing' 
                ? 'text-gray-500' 
                : 'text-white'
            }`}>
              Process
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="flex-1 p-5">
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <Database size={28} color="#000" className="mr-3" />
            <Text className="text-3xl font-bold text-black tracking-tight">Knowledge Base</Text>
          </View>
          <TouchableOpacity 
            onPress={handleCreateSource}
            className="bg-black w-10 h-10 rounded-full items-center justify-center shadow-md"
          >
            <Plus size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text className="text-gray-500 mb-6 text-base">
          Manage your source documents, meeting transcripts, and reference materials.
        </Text>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <FlatList
            data={sources}
            keyExtractor={item => item.id.toString()}
            renderItem={renderSourceItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={() => (
              <View className="flex-1 items-center justify-center py-20 px-4">
                <Database size={48} color="#D4D4D8" className="mb-4" />
                <Text className="text-lg font-semibold text-gray-700 mb-2 text-center">No sources found</Text>
                <Text className="text-gray-500 text-center mb-6">
                  Add documents, records, or transcripts to start building your knowledge base.
                </Text>
                <TouchableOpacity 
                  onPress={handleCreateSource}
                  className="bg-black px-6 py-3 rounded-xl flex-row items-center"
                >
                  <Plus size={20} color="#FFF" className="mr-2" />
                  <Text className="text-white font-medium text-base">Add Data Source</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
