import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import axios from 'axios';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, API } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Dummy behavior for local dev testing: 
      // Replace with your actual authentication endpoint if needed.
      // const response = await axios.post(`${API}/auth/token`, { username: email, password }, {
      //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      // });
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const dummyUser = { email, token: 'dummy_token_123' };
      login(dummyUser);
      router.replace('/(tabs)');
      
    } catch (err) {
      setError('Invalid credentials or network error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full max-w-sm">
          <Text className="text-4xl font-bold text-black mb-8 tracking-tight font-[JetBrainsMono_400Regular]">
            Sign in to Kinesis
          </Text>

          {error ? (
            <Text className="text-red-500 mb-4">{error}</Text>
          ) : null}

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-black focus:border-black focus:ring-1 focus:ring-black transition-colors"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-1.5 mt-4">Password</Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-black focus:border-black focus:ring-1 focus:ring-black transition-colors"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              className={`w-full bg-black rounded-lg py-4 items-center justify-center ${isLoading ? 'opacity-80' : ''}`}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-base font-[JetBrainsMono_400Regular]">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
