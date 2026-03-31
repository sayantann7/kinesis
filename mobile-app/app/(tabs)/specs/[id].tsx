import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function SpecDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { API } = useAuth();
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpec();
  }, [id, API]);

  const fetchSpec = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/specs/${id}`);
      setSpec(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  if (!spec) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <Text>Spec not found</Text>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'black', borderRadius: 4 }}
        >
          <Text style={{ color: 'white' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E4E4E7', padding: 16, backgroundColor: 'white' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <ArrowLeft size={24} color="#171717" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#171717' }} numberOfLines={1}>
            Spec for: {spec.opportunity_title || 'Untitled'}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#A1A1AA' }}>
            Status: {spec.status}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 16, color: '#374151', lineHeight: 24 }}>
          {spec.content || 'Generating content...'}
        </Text>
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}