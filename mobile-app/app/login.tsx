import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Database, ArrowRight } from 'lucide-react-native';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const dummyUser = { email: 'test@example.com', token: 'dummy' };
      login(dummyUser);
      router.replace('/(tabs)');
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA] justify-center items-center">
      <View className="bg-white w-11/12 max-w-sm p-6 border border-[#E4E4E7] shadow-sm rounded-lg">
        {/* Top Header */}
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

        {/* Divider */}
        <View className="border-t border-[#E4E4E7] my-6 pt-6 flex-col">
          <Text className="font-heading font-bold text-2xl text-[#171717] mb-2">
            Sign in
          </Text>
          <Text className="font-mono text-sm text-[#71717A] mb-6">
            Transform customer feedback into executable specs for coding agents.
          </Text>

          {/* Continue with Google button */}
          <TouchableOpacity
            onPress={handleLogin}
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

        {/* Bottom Text */}
        <Text className="text-[10px] font-mono text-[#A1A1AA] text-center mt-6 pt-4 border-t border-[#E4E4E7]">
          From raw feedback to executable specs
        </Text>
      </View>
    </View>
  );
}
