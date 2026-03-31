import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle, Clock, Circle, AlertCircle } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../../../src/contexts/AuthContext';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStyle = () => {
    switch (status) {
      case 'DRAFT':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
      case 'FINAL':
      case 'COMPLETED':
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
      case 'IN_PROGRESS':
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#002FA7' };
      default:
        return { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' };
    }
  };
  const style = getStyle();
  
  return (
    <View style={{ backgroundColor: style.bg, borderWidth: 1, borderColor: style.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
      <Text style={{ fontSize: 10, fontFamily: 'monospace', color: style.text }}>{status}</Text>
    </View>
  );
}

// Task status icon
function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'DONE':
      return <CheckCircle size={16} color="#16A34A" />;
    case 'IN_PROGRESS':
      return <Clock size={16} color="#002FA7" />;
    case 'BLOCKED':
      return <AlertCircle size={16} color="#DC2626" />;
    default:
      return <Circle size={16} color="#A1A1AA" />;
  }
}

// Collapsible section
function SpecSection({ 
  title, 
  items, 
  renderItem,
  defaultExpanded = true 
}: { 
  title: string; 
  items: any[]; 
  renderItem: (item: any, idx: number) => React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  if (!items || items.length === 0) return null;
  
  return (
    <View style={{ marginBottom: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 8, overflow: 'hidden' }}>
      <TouchableOpacity 
        onPress={() => setExpanded(!expanded)}
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingHorizontal: 12, 
          paddingVertical: 10, 
          backgroundColor: '#FAFAFA',
          borderBottomWidth: expanded ? 1 : 0,
          borderBottomColor: '#E4E4E7'
        }}
      >
        <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1 }}>
          {title} ({items.length})
        </Text>
        {expanded ? <ChevronUp size={16} color="#A1A1AA" /> : <ChevronDown size={16} color="#A1A1AA" />}
      </TouchableOpacity>
      
      {expanded && items.map((item, idx) => (
        <View key={idx} style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: idx < items.length - 1 ? 1 : 0, borderBottomColor: '#E4E4E7' }}>
          {renderItem(item, idx)}
        </View>
      ))}
    </View>
  );
}

// Progress bar component
function ProgressBar({ done, total }: { done: number; total: number }) {
  const percentage = total > 0 ? (done / total) * 100 : 0;
  
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#71717A' }}>Task Progress</Text>
        <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#71717A' }}>{done}/{total}</Text>
      </View>
      <View style={{ height: 4, backgroundColor: '#E4E4E7', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: '#16A34A', borderRadius: 2 }} />
      </View>
    </View>
  );
}

export default function SpecDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { API } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const fetchSpec = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/specs/${id}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [API, id]);

  useEffect(() => {
    fetchSpec();
  }, [fetchSpec]);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setUpdatingTask(taskId);
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
      // Refresh spec data
      fetchSpec();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update task status');
    } finally {
      setUpdatingTask(null);
    }
  };

  const cycleTaskStatus = (task: any) => {
    const statuses = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
    const currentIdx = statuses.indexOf(task.status);
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    updateTaskStatus(task.task_id, nextStatus);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#002FA7" />
      </View>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#A1A1AA' }}>Spec not found</Text>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#171717', borderRadius: 4 }}
          >
            <Text style={{ color: 'white', fontFamily: 'monospace' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const brief = data.brief || {};
  const spec = brief.spec || {};
  const tasks = data.tasks || spec.tasks || [];
  const doneTasks = tasks.filter((t: any) => t.status === 'DONE').length;

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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717' }} numberOfLines={1}>
            {data.opportunity_title || brief.opportunity_title || 'Spec Details'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <StatusBadge status={data.status || brief.status || 'DRAFT'} />
            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', marginLeft: 8 }}>
              v{brief.version || 1}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress */}
      {tasks.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E4E4E7' }}>
          <ProgressBar done={doneTasks} total={tasks.length} />
        </View>
      )}

      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
        {/* Problem Statement */}
        {(brief.content?.problem_statement || spec.problem_statement) && (
          <View style={{ marginBottom: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 8, padding: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Problem Statement
            </Text>
            <Text style={{ fontSize: 14, color: '#171717', lineHeight: 20 }}>
              {brief.content?.problem_statement || spec.problem_statement}
            </Text>
          </View>
        )}

        {/* User Stories */}
        <SpecSection 
          title="User Stories" 
          items={spec.user_stories || []}
          renderItem={(item) => (
            <>
              <Text style={{ fontSize: 13, fontFamily: 'monospace', color: '#171717', fontWeight: '600' }}>{item.title}</Text>
              {(item.acceptance_criteria || []).map((ac: any, i: number) => (
                <Text key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: '#71717A', marginTop: 4 }}>
                  • {typeof ac === 'object' ? JSON.stringify(ac) : ac}
                </Text>
              ))}
            </>
          )}
        />

        {/* API Contracts */}
        <SpecSection 
          title="API Contracts" 
          items={spec.api_contracts || []}
          renderItem={(item) => (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, marginRight: 8 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#002FA7' }}>{item.method}</Text>
                </View>
                <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#171717' }}>{item.path}</Text>
              </View>
              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', marginTop: 4 }}>{item.description}</Text>
            </>
          )}
        />

        {/* Tasks (Interactive) */}
        {tasks.length > 0 && (
          <View style={{ marginBottom: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 8, overflow: 'hidden' }}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              paddingHorizontal: 12, 
              paddingVertical: 10, 
              backgroundColor: '#FAFAFA',
              borderBottomWidth: 1,
              borderBottomColor: '#E4E4E7'
            }}>
              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1 }}>
                Tasks ({tasks.length})
              </Text>
              <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#71717A' }}>
                Tap to change status
              </Text>
            </View>
            
            {tasks.map((task: any, idx: number) => (
              <TouchableOpacity 
                key={task.task_id || idx} 
                onPress={() => cycleTaskStatus(task)}
                disabled={updatingTask === task.task_id}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'flex-start',
                  paddingHorizontal: 12, 
                  paddingVertical: 10, 
                  borderBottomWidth: idx < tasks.length - 1 ? 1 : 0, 
                  borderBottomColor: '#E4E4E7',
                  opacity: updatingTask === task.task_id ? 0.5 : 1
                }}
              >
                <View style={{ marginRight: 10, marginTop: 2 }}>
                  {updatingTask === task.task_id ? (
                    <ActivityIndicator size="small" color="#002FA7" />
                  ) : (
                    <TaskStatusIcon status={task.status} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <View style={{ 
                      backgroundColor: task.priority === 'HIGH' ? '#FEF2F2' : task.priority === 'MEDIUM' ? '#FFFBEB' : '#F4F4F5',
                      borderWidth: 1,
                      borderColor: task.priority === 'HIGH' ? '#FECACA' : task.priority === 'MEDIUM' ? '#FDE68A' : '#E4E4E7',
                      paddingHorizontal: 4, 
                      paddingVertical: 1, 
                      borderRadius: 2, 
                      marginRight: 8 
                    }}>
                      <Text style={{ 
                        fontSize: 9, 
                        fontFamily: 'monospace', 
                        color: task.priority === 'HIGH' ? '#DC2626' : task.priority === 'MEDIUM' ? '#D97706' : '#71717A'
                      }}>{task.priority}</Text>
                    </View>
                    <Text style={{ 
                      fontSize: 12, 
                      fontFamily: 'monospace', 
                      color: task.status === 'DONE' ? '#71717A' : '#171717', 
                      flex: 1,
                      textDecorationLine: task.status === 'DONE' ? 'line-through' : 'none'
                    }}>{task.title}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', marginTop: 4 }}>{task.description}</Text>
                  <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#71717A', marginTop: 4 }}>
                    Status: {task.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Database Changes */}
        <SpecSection 
          title="Database Changes" 
          items={spec.database_migrations || []}
          defaultExpanded={false}
          renderItem={(item) => (
            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#71717A' }}>
              {typeof item === 'object' ? JSON.stringify(item, null, 2) : item}
            </Text>
          )}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}