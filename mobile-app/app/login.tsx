import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Database, ArrowRight, X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [showWebview, setShowWebview] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const { login, API } = useAuth();
  const router = useRouter();

  const handleGoogleLoginInit = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/auth/google`);
      if (response.data && response.data.auth_url) {
        setAuthUrl(response.data.auth_url);
        setShowWebview(true);
      }
    } catch (error) {
      console.error('Failed to get Google Auth URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;

    if (url.includes('/dashboard?session=')) {
      setShowWebview(false);
      setIsLoading(true);

      const sessionToken = url.split('session=')[1].split('&')[0];

      const success = await login(sessionToken);
      if (success) {
        router.replace('/(tabs)');
      } else {
        setIsLoading(false);
      }
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA] justify-center items-center">
      <View className="bg-white w-11/12 max-w-sm p-6 border border-[#E4E4E7] shadow-sm rounded-lg">
        <View className="flex-row items-center">
          <View className="bg-[#002FA7] w-10 h-10 items-center justify-center rounded">
            <Database color="#FFF" size={20} />
          </View>
          <View className="ml-3">
            <Text className="font-heading font-bold text-xl text-[#171717]">Kinesis</Text>
            <Text className="text-[10px] font-mono tracking-widest text-[#71717A] uppercase">
              AI PRODUCT DISCOVERY
            </Text>
          </View>
        </View>

        <View className="border-t border-[#E4E4E7] my-6 pt-6 flex-col">
          <Text className="font-heading font-bold text-2xl text-[#171717] mb-2">
            Sign in
          </Text>
          <Text className="font-mono text-sm text-[#71717A] mb-6">
            Transform customer feedback into executable specs for coding agents.
          </Text>

          <TouchableOpacity
            onPress={handleGoogleLoginInit}
            disabled={isLoading}
            activeOpacity={0.8}
            className={`bg-[#171717] rounded-md py-3 flex-row items-center justify-center ${isLoading ? 'opacity-80' : ''}`}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View className="flex-row items-center w-full justify-center px-4 relative">
                <Text className="text-white font-medium text-base text-center"> 
                  Continue with Google
                </Text>
                <View className="absolute right-4">
                  <ArrowRight color="#FFF" size={16} />
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-[10px] font-mono text-[#A1A1AA] text-center mt-6 pt-4 border-t border-[#E4E4E7]">
          From raw feedback to executable specs
        </Text>
      </View>

      <Modal visible={showWebview} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#E4E4E7' }}>
            <Text style={{ fontWeight: 'bold' }}>Sign In</Text>
            <TouchableOpacity onPress={() => setShowWebview(false)}>
              <X size={24} color="#171717" />
            </TouchableOpacity>
          </View>
          {authUrl ? (
            <WebView
              style={{ flex: 1, width: '100%', height: '100%' }}
              source={{ uri: authUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              startInLoadingState={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              userAgent={Platform.OS === 'android' ? 'Chrome/18.0.1025.133 Mobile Safari/535.19' : 'AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1'}
              renderLoading={() => (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
                  <ActivityIndicator size="large" color="#171717" />
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
