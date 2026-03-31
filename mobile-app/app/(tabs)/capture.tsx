import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database, Plus, RefreshCw, Trash2, FileText, Cpu, CheckCircle, Clock, Type, X } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';

export default function SourcesScreen() {
  const { user, API } = useAuth();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Text modal state
  const [showTextModal, setShowTextModal] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [addingText, setAddingText] = useState(false);
  
  // Add menu state  
  const [showAddMenu, setShowAddMenu] = useState(false);

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

  const handleAddText = async () => {
    if (!textTitle.trim() || !textContent.trim()) {
      Alert.alert('Error', 'Please enter both title and content');
      return;
    }
    
    setAddingText(true);
    try {
      // Create a text source
      const sourceRes = await axios.post(`${API}/sources`, {
        name: textTitle,
        type: 'TEXT'
      });
      const sourceId = sourceRes.data.source_id;
      
      // Add text content as item
      await axios.post(`${API}/sources/${sourceId}/items`, {
        title: textTitle,
        raw_text: textContent,
        transcript: textContent,
        metadata: { type: 'manual_text', created_at: new Date().toISOString() }
      });
      
      Alert.alert('Success', 'Text content added successfully!');
      setShowTextModal(false);
      setTextTitle('');
      setTextContent('');
      fetchSources();
    } catch (err) {
      console.error('Failed to add text:', err);
      Alert.alert('Error', 'Failed to add text content');
    } finally {
      setAddingText(false);
    }
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
            onPress={() => setShowAddMenu(true)}
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
                  onPress={() => setShowAddMenu(true)}
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

      {/* Add Menu Modal */}
      <Modal visible={showAddMenu} transparent animationType="fade">
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowAddMenu(false)}
        >
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#171717', marginBottom: 16 }}>Add Source</Text>
            
            <TouchableOpacity 
              onPress={() => { setShowAddMenu(false); handleCreateSource(); }}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 16, 
                backgroundColor: '#F4F4F5', 
                borderRadius: 8, 
                marginBottom: 12 
              }}
            >
              <FileText size={24} color="#171717" />
              <View style={{ marginLeft: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#171717' }}>Upload File</Text>
                <Text style={{ fontSize: 12, color: '#71717A' }}>Documents, audio, transcripts</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => { setShowAddMenu(false); setShowTextModal(true); }}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 16, 
                backgroundColor: '#F4F4F5', 
                borderRadius: 8 
              }}
            >
              <Type size={24} color="#171717" />
              <View style={{ marginLeft: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#171717' }}>Add Text</Text>
                <Text style={{ fontSize: 12, color: '#71717A' }}>Paste or type feedback content</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setShowAddMenu(false)}
              style={{ marginTop: 16, alignItems: 'center', padding: 12 }}
            >
              <Text style={{ fontSize: 14, color: '#71717A' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Text Input Modal */}
      <Modal visible={showTextModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 12, width: '90%', maxHeight: '80%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#171717' }}>Add Text Content</Text>
              <TouchableOpacity onPress={() => setShowTextModal(false)}>
                <X size={24} color="#71717A" />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717A', marginBottom: 8 }}>Title</Text>
            <TextInput
              value={textTitle}
              onChangeText={setTextTitle}
              placeholder="E.g., Customer feedback from call"
              placeholderTextColor="#A1A1AA"
              style={{
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 6,
                padding: 12,
                fontSize: 14,
                color: '#171717',
                marginBottom: 16,
              }}
            />
            
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717A', marginBottom: 8 }}>Content</Text>
            <TextInput
              value={textContent}
              onChangeText={setTextContent}
              placeholder="Paste or type the feedback content here..."
              placeholderTextColor="#A1A1AA"
              multiline
              style={{
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 6,
                padding: 12,
                fontSize: 14,
                color: '#171717',
                minHeight: 150,
                maxHeight: 300,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
            />
            
            <TouchableOpacity
              onPress={handleAddText}
              disabled={addingText}
              style={{
                backgroundColor: addingText ? '#A1A1AA' : '#171717',
                padding: 14,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              {addingText ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Add Content</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
