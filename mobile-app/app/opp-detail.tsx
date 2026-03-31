import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, Lightbulb, FileText, Plus, ChevronRight, TrendingDown, Minus } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../src/contexts/AuthContext';

// Type badge component
function TypeBadge({ type }: { type: string }) {
  const getTypeStyle = () => {
    switch (type) {
      case 'COMPLAINT':
        return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' };
      case 'PRAISE':
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
      case 'FEATURE_REQUEST':
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#002FA7' };
      case 'QUESTION':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
      default:
        return { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' };
    }
  };

  const style = getTypeStyle();
  const displayText = type?.replace(/_/g, ' ') || 'OTHER';

  return (
    <View style={{ 
      backgroundColor: style.bg, 
      borderWidth: 1, 
      borderColor: style.border, 
      paddingHorizontal: 6, 
      paddingVertical: 2, 
      borderRadius: 2 
    }}>
      <Text style={{ fontSize: 10, fontFamily: 'monospace', color: style.text }}>
        {displayText}
      </Text>
    </View>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusStyle = () => {
    switch (status) {
      case 'OPEN':
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
      case 'IN_PROGRESS':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
      case 'COMPLETED':
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#002FA7' };
      case 'DISCARDED':
        return { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' };
      default:
        return { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' };
    }
  };

  const style = getStatusStyle();

  return (
    <View style={{ 
      backgroundColor: style.bg, 
      borderWidth: 1, 
      borderColor: style.border, 
      paddingHorizontal: 6, 
      paddingVertical: 2, 
      borderRadius: 2 
    }}>
      <Text style={{ fontSize: 10, fontFamily: 'monospace', color: style.text }}>
        {status}
      </Text>
    </View>
  );
}

// Sentiment indicator
function SentimentIndicator({ sentiment }: { sentiment: number }) {
  const isPositive = sentiment > 0.2;
  const isNegative = sentiment < -0.2;
  const color = isPositive ? '#16A34A' : isNegative ? '#DC2626' : '#A1A1AA';
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Icon size={12} color={color} />
      <Text style={{ fontSize: 10, fontFamily: 'monospace', color, marginLeft: 4 }}>
        {sentiment?.toFixed(1) || '0.0'}
      </Text>
    </View>
  );
}

// Insight item component
function InsightItem({ insight }: { insight: any }) {
  return (
    <View style={{ 
      paddingHorizontal: 16, 
      paddingVertical: 12, 
      borderBottomWidth: 1, 
      borderBottomColor: '#E4E4E7' 
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <TypeBadge type={insight.type} />
        <View style={{ marginLeft: 8 }}>
          <SentimentIndicator sentiment={insight.sentiment} />
        </View>
      </View>
      <Text style={{ fontSize: 13, fontFamily: 'monospace', color: '#171717', lineHeight: 18 }}>
        {insight.summary}
      </Text>
      {insight.quote && (
        <Text style={{ 
          fontSize: 11, 
          fontFamily: 'monospace', 
          fontStyle: 'italic', 
          color: '#A1A1AA', 
          marginTop: 4 
        }}>
          "{insight.quote}"
        </Text>
      )}
    </View>
  );
}

// Brief item component
function BriefItemRow({ brief, onPress }: { brief: any; onPress: () => void }) {
  const getStatusStyle = () => {
    switch (brief.status) {
      case 'DRAFT':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
      case 'FINAL':
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
      default:
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#002FA7' };
    }
  };

  const style = getStatusStyle();

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: '#E4E4E7' 
      }}
    >
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontFamily: 'monospace', color: '#171717' }}>
            v{brief.version}
          </Text>
          <View style={{ 
            backgroundColor: style.bg, 
            borderWidth: 1, 
            borderColor: style.border, 
            paddingHorizontal: 6, 
            paddingVertical: 2, 
            borderRadius: 2,
            marginLeft: 8
          }}>
            <Text style={{ fontSize: 10, fontFamily: 'monospace', color: style.text }}>
              {brief.status}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', marginTop: 4 }}>
          Created {new Date(brief.created_at).toLocaleDateString()}
        </Text>
      </View>
      <ChevronRight size={16} color="#A1A1AA" />
    </TouchableOpacity>
  );
}

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { API } = useAuth();
  const [opp, setOpp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchOpportunity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/opportunities/${id}`);
      setOpp(res.data);
    } catch (e) {
      console.error('Failed to fetch opportunity:', e);
    } finally {
      setLoading(false);
    }
  }, [API, id]);

  useEffect(() => {
    fetchOpportunity();
  }, [fetchOpportunity]);

  const generateBrief = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/opportunities/${id}/briefs`, {});
      Alert.alert('Success', 'Brief generated successfully!');
      // Navigate to the brief - use the briefs route in tabs
      router.push(`/briefs/${res.data.brief_id}` as any);
    } catch (e) {
      console.error('Failed to generate brief:', e);
      Alert.alert('Error', 'Failed to generate brief');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#002FA7" />
      </View>
    );
  }

  if (!opp) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#A1A1AA' }}>
            Opportunity not found
          </Text>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={{ 
              marginTop: 16, 
              paddingHorizontal: 16, 
              paddingVertical: 8, 
              backgroundColor: '#171717', 
              borderRadius: 4 
            }}
          >
            <Text style={{ color: 'white', fontFamily: 'monospace' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const insights = opp.insights || [];
  const briefs = opp.briefs || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        backgroundColor: 'white', 
        borderBottomWidth: 1, 
        borderBottomColor: '#E4E4E7' 
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <ArrowLeft size={24} color="#171717" />
        </TouchableOpacity>
        <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#A1A1AA' }}>
          Back to Ideas
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Opportunity Header Card */}
        <View style={{ 
          margin: 16, 
          padding: 16, 
          backgroundColor: 'white', 
          borderWidth: 1, 
          borderColor: '#E4E4E7', 
          borderRadius: 8 
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#171717', marginRight: 8 }}>
                  {opp.title}
                </Text>
                <StatusBadge status={opp.status} />
              </View>
              {opp.description && (
                <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#71717A', lineHeight: 20 }}>
                  {opp.description}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'center' }}>
              <TrendingUp size={20} color="#002FA7" />
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#002FA7', marginTop: 4 }}>
                {opp.impact_score?.toFixed(1) || '0.0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Linked Insights Section */}
        <View style={{ 
          marginHorizontal: 16, 
          marginBottom: 16, 
          backgroundColor: 'white', 
          borderWidth: 1, 
          borderColor: '#E4E4E7', 
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            paddingHorizontal: 16, 
            paddingVertical: 12, 
            borderBottomWidth: 1, 
            borderBottomColor: '#E4E4E7',
            backgroundColor: '#FAFAFA'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Lightbulb size={16} color="#F59E0B" />
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#171717', marginLeft: 8 }}>
                Linked Insights
              </Text>
            </View>
            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA' }}>
              {insights.length}
            </Text>
          </View>
          
          {insights.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#A1A1AA' }}>
                No linked insights
              </Text>
            </View>
          ) : (
            insights.map((ins: any, idx: number) => (
              <InsightItem key={ins.insight_id || idx} insight={ins} />
            ))
          )}
        </View>

        {/* Feature Briefs Section */}
        <View style={{ 
          marginHorizontal: 16, 
          marginBottom: 24, 
          backgroundColor: 'white', 
          borderWidth: 1, 
          borderColor: '#E4E4E7', 
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            paddingHorizontal: 16, 
            paddingVertical: 12, 
            borderBottomWidth: 1, 
            borderBottomColor: '#E4E4E7',
            backgroundColor: '#FAFAFA'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FileText size={16} color="#002FA7" />
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#171717', marginLeft: 8 }}>
                Feature Briefs
              </Text>
            </View>
            <TouchableOpacity 
              onPress={generateBrief}
              disabled={generating}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                backgroundColor: generating ? '#A1A1AA' : '#002FA7',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 4
              }}
            >
              {generating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Plus size={14} color="white" />
                  <Text style={{ fontSize: 11, fontFamily: 'monospace', color: 'white', marginLeft: 4 }}>
                    Generate Brief
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {briefs.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#A1A1AA', textAlign: 'center' }}>
                No briefs yet.{'\n'}Generate one with AI.
              </Text>
            </View>
          ) : (
            briefs.map((brief: any, idx: number) => (
              <BriefItemRow 
                key={brief.brief_id || idx} 
                brief={brief} 
                onPress={() => router.push(`/briefs/${brief.brief_id}` as any)}
              />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
