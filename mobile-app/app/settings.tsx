import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, Hash, ArrowLeft, LogOut, Code, Users, Copy, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';
import { useAuth } from '../src/contexts/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { API, logout, currentWorkspace } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ghStatus, setGhStatus] = useState<any>({});
  const [slackStatus, setSlackStatus] = useState<any>({});
  const [mcpKey, setMcpKey] = useState<any>({});
  const [showMcpKey, setShowMcpKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [ghRes, slRes, mcpRes] = await Promise.all([
        axios.get(`${API}/github/status`).catch(() => ({ data: {} })),
        axios.get(`${API}/slack/status`).catch(() => ({ data: {} })),
        axios.get(`${API}/mcp/key`).catch(() => ({ data: {} }))
      ]);
      setGhStatus({ connected: ghRes.data.connected, workspace: ghRes.data.workspace });
      setSlackStatus({ connected: slRes.data.connected, workspace: slRes.data.workspace });
      setMcpKey(mcpRes.data);
    } catch (e) {
      console.error('Error fetching settings', e);
    } finally {
      setLoading(false);
    }
  };

  const generateMcp = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API}/mcp/generate-key`);
      setMcpKey(res.data);
      fetchSettings();
    } catch (e) {
      Alert.alert('Error', 'Failed to generate key');
    } finally {
      setLoading(false);
    }
  };

  const revokeMcpKey = async () => {
    Alert.alert(
      'Revoke Key',
      'Are you sure you want to revoke this API key? Cursor integration will stop working.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await axios.delete(`${API}/mcp/revoke-key`);
              setMcpKey({});
              fetchSettings();
            } catch (e) {
              Alert.alert('Error', 'Failed to revoke key');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const copyMcpKey = async () => {
    if (mcpKey?.key) {
      await Clipboard.setStringAsync(mcpKey.key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#171717" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      <View className="flex-row items-center border-b border-[#E4E4E7] p-4 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color="#171717" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#171717]">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        
        {/* Workspace Section */}
        <Text className="text-sm font-bold tracking-widest text-[#A1A1AA] uppercase mb-4">Workspace</Text>
        
        <TouchableOpacity 
          onPress={() => router.push('/workspace')}
          className="bg-white rounded-xl border border-[#E4E4E7] p-4 mb-6 shadow-sm flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <Users size={20} color="#171717" style={{ marginRight: 8 }} />
            <View>
              <Text className="text-base font-bold text-[#171717]">{currentWorkspace?.name || 'Workspace'}</Text>
              <Text className="text-xs text-[#71717A] font-mono">Manage team & settings</Text>
            </View>
          </View>
          <ArrowLeft size={16} color="#A1A1AA" style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        
        {/* Integrations Section */}
        <Text className="text-sm font-bold tracking-widest text-[#A1A1AA] uppercase mb-4">Integrations</Text>
        
        <View className="bg-white rounded-xl border border-[#E4E4E7] p-4 mb-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
                <Code size={20} color="#171717" style={{ marginRight: 8 }} />
              <Text className="text-base font-bold text-[#171717]">GitHub</Text>
            </View>
            {ghStatus.connected ? (
              <View className="px-2 py-1 bg-green-50 border border-green-200 rounded">
                <Text className="text-xs text-green-700 font-mono">Connected</Text>
              </View>
            ) : (
              <View className="px-2 py-1 bg-gray-100 border border-gray-200 rounded">
                <Text className="text-xs text-gray-500 font-mono">Not Connected</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-[#71717A] mb-3">
            To connect or manage GitHub, please visit the web dashboard.
          </Text>
        </View>

        <View className="bg-white rounded-xl border border-[#E4E4E7] p-4 mb-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
                <Hash size={20} color="#171717" style={{ marginRight: 8 }} />
              <Text className="text-base font-bold text-[#171717]">Slack</Text>
            </View>
            {slackStatus.connected ? (
              <View className="px-2 py-1 bg-green-50 border border-green-200 rounded">
                <Text className="text-xs text-green-700 font-mono">Connected</Text>
              </View>
            ) : (
              <View className="px-2 py-1 bg-gray-100 border border-gray-200 rounded">
                <Text className="text-xs text-gray-500 font-mono">Not Connected</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-[#71717A] mb-3">
            To connect or manage Slack, please visit the web dashboard.
          </Text>
        </View>

        {/* MCP Section */}
        <Text className="text-sm font-bold tracking-widest text-[#A1A1AA] uppercase mb-4 mt-2">Local Development (MCP)</Text>
        
        <View className="bg-white rounded-xl border border-[#E4E4E7] p-4 mb-8 shadow-sm">
          <Text className="text-sm font-bold text-[#171717] mb-2">MCP API Key</Text>
          {mcpKey?.has_key || mcpKey?.key ? (
            <>
              <Text className="text-xs text-[#71717A] mb-3">Use this key to connect Cursor IDE with Kinesis.</Text>
              
              {/* Key display */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: '#F4F4F5', 
                borderRadius: 6, 
                padding: 10,
                marginBottom: 12 
              }}>
                <Text style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#171717' }}>
                  {showMcpKey ? (mcpKey.key || '••••••••••••••••') : '••••••••••••••••'}
                </Text>
                <TouchableOpacity onPress={() => setShowMcpKey(!showMcpKey)} style={{ marginRight: 8 }}>
                  {showMcpKey ? <EyeOff size={18} color="#71717A" /> : <Eye size={18} color="#71717A" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={copyMcpKey}>
                  {copiedKey ? (
                    <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#16A34A' }}>Copied!</Text>
                  ) : (
                    <Copy size={18} color="#71717A" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  onPress={generateMcp} 
                  style={{ 
                    flex: 1, 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#171717', 
                    paddingVertical: 10, 
                    borderRadius: 6 
                  }}
                >
                  <RefreshCw size={14} color="white" />
                  <Text style={{ color: 'white', fontSize: 12, fontFamily: 'monospace', marginLeft: 6 }}>Regenerate</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={revokeMcpKey} 
                  style={{ 
                    flex: 1, 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#FEF2F2', 
                    borderWidth: 1,
                    borderColor: '#FECACA',
                    paddingVertical: 10, 
                    borderRadius: 6 
                  }}
                >
                  <Trash2 size={14} color="#DC2626" />
                  <Text style={{ color: '#DC2626', fontSize: 12, fontFamily: 'monospace', marginLeft: 6 }}>Revoke</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text className="text-xs text-[#71717A] mb-4">No API key active. Generate one to sync tasks with Cursor IDE.</Text>
              <TouchableOpacity 
                onPress={generateMcp} 
                className="bg-black self-start px-4 py-2 rounded-lg"
              >
                <Text className="text-white text-sm font-medium">Generate API Key</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity 
          onPress={() => logout()}
          className="flex-row items-center justify-center p-4 bg-red-50 rounded-xl border border-red-200"
        >
            <LogOut size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text className="text-red-600 font-bold text-base">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}