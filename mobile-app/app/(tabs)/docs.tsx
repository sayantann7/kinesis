import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../src/contexts/AuthContext';

// Separate components to avoid navigation context issues with NativeWind
function BriefItem({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E4E4E7',
        borderRadius: 12,
      }}
    >
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text 
          style={{ fontSize: 18, fontWeight: '600', color: '#171717', marginBottom: 4 }}
          numberOfLines={1}
        >
          {item.opportunity_title || 'Untitled Brief'}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#52525B', marginBottom: 8 }}>
          Version {item.version}
        </Text>
        <Text style={{ fontSize: 12, color: '#71717A' }}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date'}
        </Text>
      </View>
      <ChevronRight size={20} color="#A1A1AA" />
    </TouchableOpacity>
  );
}

function SpecItem({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E4E4E7',
        borderRadius: 12,
      }}
    >
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text 
          style={{ fontSize: 18, fontWeight: '600', color: '#171717', marginBottom: 4 }}
          numberOfLines={1}
        >
          {item.opportunity_title || 'Untitled Spec'}
        </Text>
        <View style={{ 
          backgroundColor: '#EFF6FF', 
          borderWidth: 1, 
          borderColor: '#BFDBFE', 
          alignSelf: 'flex-start', 
          paddingHorizontal: 8, 
          paddingVertical: 2, 
          borderRadius: 2, 
          marginBottom: 8 
        }}>
          <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#002FA7' }}>
            {item.status || 'Pending'}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: '#71717A' }}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date'}
        </Text>
      </View>
      <ChevronRight size={20} color="#A1A1AA" />
    </TouchableOpacity>
  );
}

export default function DocsScreen() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [specs, setSpecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'briefs' | 'specs'>('briefs');
  const router = useRouter();
  const { API } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Briefs
        const oppsRes = await axios.get(`${API}/opportunities`);
        const allBriefs = [];
        for (const opp of oppsRes.data) {
          const oppDetail = await axios.get(`${API}/opportunities/${opp.opportunity_id}`);
          for (const brief of (oppDetail.data.briefs || [])) {
            allBriefs.push({ ...brief, opportunity_title: opp.title });
          }
        }
        allBriefs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBriefs(allBriefs);

        // Fetch Specs
        const specsRes = await axios.get(`${API}/specs`);
        setSpecs(specsRes.data || []);
      } catch (error) {
        console.error('Error fetching docs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (API) fetchData();
  }, [API]);

  const handleBriefPress = useCallback((briefId: string) => {
    router.push(('/briefs/' + briefId) as any);
  }, [router]);

  const handleSpecPress = useCallback((briefId: string) => {
    router.push(('/specs/' + briefId) as any);
  }, [router]);

  const renderBriefItem = useCallback(({ item }: { item: any }) => (
    <BriefItem item={item} onPress={() => handleBriefPress(item.brief_id)} />
  ), [handleBriefPress]);

  const renderSpecItem = useCallback(({ item }: { item: any }) => (
    <SpecItem item={item} onPress={() => handleSpecPress(item.brief_id)} />
  ), [handleSpecPress]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E4E4E7', backgroundColor: '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <FileText size={24} color="#171717" style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#171717' }}>
            Documentation
          </Text>
        </View>
        
        {/* Toggle Tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F4F4F5', borderRadius: 8, padding: 4 }}>
          <TouchableOpacity 
            onPress={() => setActiveTab('briefs')}
            style={[
              { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6 },
              activeTab === 'briefs' && { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
            ]}
          >
            <Text style={[
              { fontFamily: 'monospace', fontSize: 14 },
              activeTab === 'briefs' ? { color: '#000', fontWeight: 'bold' } : { color: '#71717A' }
            ]}>Briefs</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('specs')}
            style={[
              { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6 },
              activeTab === 'specs' && { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
            ]}
          >
            <Text style={[
              { fontFamily: 'monospace', fontSize: 14 },
              activeTab === 'specs' ? { color: '#000', fontWeight: 'bold' } : { color: '#71717A' }
            ]}>Specs (PRDs)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
          <ActivityIndicator size="large" color="#171717" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'briefs' ? briefs : specs}
          keyExtractor={(item, index) => item.brief_id ? item.brief_id.toString() : (item.spec_id ? item.spec_id.toString() : index.toString())}
          renderItem={activeTab === 'briefs' ? renderBriefItem : renderSpecItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#A1A1AA', fontFamily: 'monospace' }}>No {activeTab} found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
