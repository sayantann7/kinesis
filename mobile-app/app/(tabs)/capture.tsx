import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database, Plus, RefreshCw, Trash2, FileText, Cpu, CheckCircle, Clock } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';

export default function SourcesScreen() {
  const { user, API } = useAuth();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sources`);
      console.log("SOURCES:", JSON.stringify(res.data)); setSources(Array.isArray(res.data) ? res.data : (res.data?.sources || []));
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

  const handleProcess = async (id: string | number) => {
    setProcessingId(id);
    try {
      await axios.post(`${API}/sources/${id}/process`);
      Alert.alert('Success', 'Source processing started');
      fetchSources();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to process source');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = (id: string | number) => {
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
              await axios.delete(`${API}/sources/${id}`);
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

  const handleCreateSource = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setLoading(true);
      const file = result.assets[0];

      // 1. Create a generic source for this upload
      const sourceRes = await axios.post(`${API}/sources`, { 
        name: file.name, 
        type: "UPLOAD" 
      });
      const sourceId = sourceRes.data.source_id;

      // 2. Upload file to /upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);

      const uploadRes = await axios.post(`${API}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const isAudio = uploadRes.data.is_audio;
      const transcript = uploadRes.data.transcript;
      
      let text = '';
      if (isAudio) {
        text = transcript || `[Audio file: ${file.name}]`;
      } else {
        if (file.mimeType?.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          try {
            text = await (await fetch(file.uri)).text();
          } catch (e) {
            text = `[Error reading text file: ${file.name}]`;
          }
        } else {
          text = `[Uploaded file: ${file.name}]`;
        }
      }

      // 3. Add to source items
      await axios.post(`${API}/sources/${sourceId}/items`, { 
        title: file.name, 
        raw_text: text, 
        transcript: isAudio ? transcript : text, 
        metadata: { 
          filename: file.name, 
          content_type: file.mimeType, 
          size: file.size, 
          file_id: uploadRes.data.file_id, 
          is_audio: isAudio 
        } 
      });
      
      if (isAudio && transcript) {
        Alert.alert('Success', `Audio transcribed successfully!`);
      } else {
        Alert.alert('Success', 'File uploaded successfully!');
      }

      fetchSources();
    } catch (err) {
      console.error('File upload err:', err);
      Alert.alert('Error', 'Failed to upload file');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={14} className="text-green-600 mr-1" />;
      case 'processing': return <RefreshCw size={14} className="text-blue-600 mr-1" />;
      default: return <Clock size={14} className="text-gray-600 mr-1" />;
    }
  };

  const renderSourceItem = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-xl border border-[#E4E4E7] mb-3 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 pr-2">
          <FileText size={18} color="#52525B" className="mr-2" />
          <Text className="text-[16px] font-semibold text-gray-900" numberOfLines={1}>{item.name || "Untitled Source"}</Text>
        </View>
        <View className={`flex-row items-center px-2 py-1 rounded-full ${getStatusColor(item.status || "pending")}`}>
          {getStatusIcon(item.status || "pending")}
          <Text className={`text-xs font-medium ${getStatusColor(item.status || "pending").split(' ')[0]}`}>
            {item.status || 'pending'}
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <Text className="text-xs text-gray-500">
          {(item.created_at ? new Date(item.created_at).toLocaleDateString() : "Unknown Date")}
        </Text>
        
        <View className="flex-row items-center space-x-2 gap-2">
          <TouchableOpacity 
            onPress={() => handleDelete(item.source_id)}
            className="p-2 bg-gray-50 rounded-lg border border-gray-200"
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleProcess(item.source_id)}
            disabled={processingId === item.source_id || item.status === 'processing'}
            className={`flex-row items-center px-3 py-2 rounded-lg ${
              processingId === item.source_id || item.status === 'processing' 
                ? 'bg-gray-100' 
                : 'bg-black'
            }`}
          >
            {processingId === item.source_id ? (
              <ActivityIndicator size="small" color="#52525B" className="mr-1" />
            ) : (
              <Cpu size={16} color={processingId === item.source_id || item.status === 'processing' ? "#52525B" : "#FFFFFF"} className="mr-1" />
            )}
            <Text className={`text-sm font-medium ${
              processingId === item.source_id || item.status === 'processing' 
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
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      <View className="flex-1 p-5">
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <Database size={28} color="#000" className="mr-3" />
            <Text className="text-3xl font-bold text-black tracking-tight">Feedback & Data</Text>
          </View>
          <TouchableOpacity
            onPress={handleCreateSource}
            className="bg-black w-10 h-10 rounded-full items-center justify-center shadow-md"
          >
            <Plus size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text className="text-gray-500 mb-6 text-base">
          Upload your project documentation, meeting transcripts, and Slack messages
        </Text>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <FlatList
            data={sources}
            keyExtractor={(item) => (item.source_id ? item.source_id.toString() : Math.random().toString())}
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
