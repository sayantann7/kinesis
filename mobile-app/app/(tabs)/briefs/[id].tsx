import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Share, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Save, Zap, ChevronDown, ChevronUp, Download, FileText, Share2, Link, X, Copy, Check, Github } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import { useAuth } from '../../../src/contexts/AuthContext';

// Field labels mapping
const FIELD_LABELS: Record<string, string> = {
  problem_statement: 'Problem Statement',
  success_metrics: 'Success Metrics',
  proposed_ui: 'Proposed UI',
  data_model_changes: 'Data Model Changes',
  workflow_impact: 'Workflow Impact',
  edge_cases_and_risks: 'Edge Cases & Risks'
};

// Editable field component
function EditableField({ 
  fieldKey, 
  value, 
  onChange, 
  isArray = false 
}: { 
  fieldKey: string; 
  value: any; 
  onChange: (value: any) => void;
  isArray?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const label = FIELD_LABELS[fieldKey] || fieldKey;
  
  // Convert array to string for display
  const displayValue = isArray 
    ? (Array.isArray(value) ? value.join('\n') : String(value || ''))
    : (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || ''));

  const handleChange = (text: string) => {
    if (isArray) {
      onChange(text.split('\n').filter(Boolean));
    } else {
      onChange(text);
    }
  };

  return (
    <View style={{ 
      marginBottom: 12, 
      backgroundColor: 'white', 
      borderWidth: 1, 
      borderColor: '#E4E4E7', 
      borderRadius: 8,
      overflow: 'hidden'
    }}>
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
          {label}
        </Text>
        {expanded ? <ChevronUp size={16} color="#A1A1AA" /> : <ChevronDown size={16} color="#A1A1AA" />}
      </TouchableOpacity>
      
      {expanded && (
        <TextInput
          value={displayValue}
          onChangeText={handleChange}
          multiline
          placeholder={isArray ? 'One item per line...' : `Enter ${label.toLowerCase()}...`}
          placeholderTextColor="#A1A1AA"
          style={{
            padding: 12,
            fontSize: 14,
            fontFamily: 'monospace',
            color: '#171717',
            minHeight: fieldKey === 'problem_statement' || fieldKey === 'data_model_changes' ? 120 : 80,
            textAlignVertical: 'top'
          }}
        />
      )}
    </View>
  );
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  const getStyle = () => {
    switch (status) {
      case 'DRAFT':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
      case 'FINAL':
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
      default:
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#002FA7' };
    }
  };
  const style = getStyle();
  
  return (
    <View style={{ backgroundColor: style.bg, borderWidth: 1, borderColor: style.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
      <Text style={{ fontSize: 10, fontFamily: 'monospace', color: style.text }}>{status}</Text>
    </View>
  );
}

// Spec section component
function SpecSection({ title, items, renderItem }: { title: string; items: any[]; renderItem: (item: any, idx: number) => React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  
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

export default function BriefDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { API } = useAuth();
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSpec, setGeneratingSpec] = useState(false);
  const [activeSection, setActiveSection] = useState<'edit' | 'spec'>('edit');
  
  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);

  const fetchBrief = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/briefs/${id}`);
      setBrief(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [API, id]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const updateContent = (key: string, value: any) => {
    setBrief((prev: any) => ({
      ...prev,
      content: { ...prev.content, [key]: value }
    }));
  };

  const saveBrief = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/briefs/${id}`, { content: brief.content });
      Alert.alert('Success', 'Brief saved successfully!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save brief');
    } finally {
      setSaving(false);
    }
  };

  const generateSpec = async () => {
    setGeneratingSpec(true);
    try {
      const res = await axios.post(`${API}/briefs/${id}/generate-spec`, {});
      setBrief(res.data);
      setActiveSection('spec');
      Alert.alert('Success', 'Spec generated successfully!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate spec');
    } finally {
      setGeneratingSpec(false);
    }
  };

  // Export as Markdown
  const exportMarkdown = async () => {
    setExporting(true);
    try {
      const res = await axios.post(`${API}/briefs/${id}/export`, { format: 'markdown' });
      const markdown = res.data.content || res.data;
      
      // Copy to clipboard
      await Clipboard.setStringAsync(typeof markdown === 'string' ? markdown : JSON.stringify(markdown, null, 2));
      Alert.alert('Success', 'Markdown copied to clipboard!');
      setShowExportModal(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to export markdown');
    } finally {
      setExporting(false);
    }
  };

  // Export as PDF
  const exportPDF = async () => {
    setExporting(true);
    try {
      const res = await axios.post(`${API}/briefs/${id}/export-pdf`, {}, { responseType: 'blob' });
      
      // Save to device
      const filename = `spec_${id}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(res.data);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64data, { encoding: FileSystem.EncodingType.Base64 });
        
        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Success', `PDF saved to ${filename}`);
        }
        setShowExportModal(false);
      };
    } catch (e) {
      console.error(e);
      // Fallback - just try to share markdown
      Alert.alert('Info', 'PDF export requires the web dashboard. Markdown has been exported instead.');
      exportMarkdown();
    } finally {
      setExporting(false);
    }
  };

  // Generate shareable link
  const generateShareLink = async () => {
    setExporting(true);
    try {
      const res = await axios.post(`${API}/briefs/${id}/share`);
      setShareLink(res.data.link || res.data.url);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate share link');
    } finally {
      setExporting(false);
    }
  };

  // Copy share link
  const copyShareLink = async () => {
    if (shareLink) {
      await Clipboard.setStringAsync(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Fetch GitHub repos
  const fetchGitHubRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await axios.get(`${API}/github/repos`);
      setRepos(res.data || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch repositories. Make sure GitHub is connected.');
    } finally {
      setLoadingRepos(false);
    }
  };

  // Export to GitHub
  const exportToGitHub = async () => {
    if (!selectedRepo) {
      Alert.alert('Error', 'Please select a repository');
      return;
    }
    
    setExporting(true);
    try {
      const res = await axios.post(`${API}/github/export`, {
        brief_id: id,
        repo: selectedRepo
      });
      Alert.alert('Success', `Created ${res.data.issues_created || 1} issue(s) on GitHub!`);
      setShowGitHubModal(false);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.response?.data?.detail || 'Failed to export to GitHub');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#002FA7" />
      </View>
    );
  }

  if (!brief) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#A1A1AA' }}>Brief not found</Text>
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

  const content = brief.content || {};
  const spec = brief.spec;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingHorizontal: 16, 
          paddingVertical: 12, 
          backgroundColor: 'white', 
          borderBottomWidth: 1, 
          borderBottomColor: '#E4E4E7' 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <ArrowLeft size={24} color="#171717" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717' }} numberOfLines={1}>
                Feature Brief v{brief.version}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <StatusBadge status={brief.status} />
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ 
          flexDirection: 'row', 
          paddingHorizontal: 16, 
          paddingVertical: 8, 
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#E4E4E7',
          gap: 8
        }}>
          <TouchableOpacity 
            onPress={saveBrief}
            disabled={saving}
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: '#E4E4E7',
              borderRadius: 4,
              opacity: saving ? 0.5 : 1
            }}
          >
            <Save size={14} color="#171717" />
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#171717', marginLeft: 6 }}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={generateSpec}
            disabled={generatingSpec}
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: generatingSpec ? '#A1A1AA' : '#002FA7',
              borderRadius: 4
            }}
          >
            <Zap size={14} color="white" />
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: 'white', marginLeft: 6 }}>
              {generatingSpec ? 'Generating...' : 'Generate Spec'}
            </Text>
          </TouchableOpacity>
          
          {/* Export button */}
          {brief.spec && (
            <TouchableOpacity 
              onPress={() => setShowExportModal(true)}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 4
              }}
            >
              <Download size={14} color="#171717" />
              <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#171717', marginLeft: 6 }}>Export</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section Tabs */}
        <View style={{ 
          flexDirection: 'row', 
          backgroundColor: '#F4F4F5', 
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 8, 
          padding: 4 
        }}>
          <TouchableOpacity 
            onPress={() => setActiveSection('edit')}
            style={[
              { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
              activeSection === 'edit' && { backgroundColor: 'white' }
            ]}
          >
            <Text style={[
              { fontFamily: 'monospace', fontSize: 12 },
              activeSection === 'edit' ? { color: '#171717', fontWeight: 'bold' } : { color: '#71717A' }
            ]}>Edit Brief</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveSection('spec')}
            style={[
              { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
              activeSection === 'spec' && { backgroundColor: 'white' }
            ]}
          >
            <Text style={[
              { fontFamily: 'monospace', fontSize: 12 },
              activeSection === 'spec' ? { color: '#171717', fontWeight: 'bold' } : { color: '#71717A' }
            ]}>Generated Spec</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
          {activeSection === 'edit' ? (
            <>
              <EditableField 
                fieldKey="problem_statement" 
                value={content.problem_statement} 
                onChange={(v) => updateContent('problem_statement', v)} 
              />
              <EditableField 
                fieldKey="success_metrics" 
                value={content.success_metrics} 
                onChange={(v) => updateContent('success_metrics', v)} 
                isArray 
              />
              <EditableField 
                fieldKey="proposed_ui" 
                value={content.proposed_ui} 
                onChange={(v) => updateContent('proposed_ui', v)} 
              />
              <EditableField 
                fieldKey="data_model_changes" 
                value={content.data_model_changes} 
                onChange={(v) => updateContent('data_model_changes', v)} 
              />
              <EditableField 
                fieldKey="workflow_impact" 
                value={content.workflow_impact} 
                onChange={(v) => updateContent('workflow_impact', v)} 
              />
              <EditableField 
                fieldKey="edge_cases_and_risks" 
                value={content.edge_cases_and_risks} 
                onChange={(v) => updateContent('edge_cases_and_risks', v)} 
                isArray 
              />
            </>
          ) : spec ? (
            <>
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
              
              <SpecSection 
                title="Tasks" 
                items={spec.tasks || []}
                renderItem={(item) => (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ 
                        backgroundColor: item.priority === 'HIGH' ? '#FEF2F2' : item.priority === 'MEDIUM' ? '#FFFBEB' : '#F4F4F5',
                        borderWidth: 1,
                        borderColor: item.priority === 'HIGH' ? '#FECACA' : item.priority === 'MEDIUM' ? '#FDE68A' : '#E4E4E7',
                        paddingHorizontal: 4, 
                        paddingVertical: 1, 
                        borderRadius: 2, 
                        marginRight: 8 
                      }}>
                        <Text style={{ 
                          fontSize: 9, 
                          fontFamily: 'monospace', 
                          color: item.priority === 'HIGH' ? '#DC2626' : item.priority === 'MEDIUM' ? '#D97706' : '#71717A'
                        }}>{item.priority}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#171717', flex: 1 }}>{item.title}</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', marginTop: 4 }}>{item.description}</Text>
                  </>
                )}
              />
              
              {(spec.database_migrations || []).length > 0 && (
                <SpecSection 
                  title="Database Changes" 
                  items={spec.database_migrations || []}
                  renderItem={(item) => (
                    <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#71717A' }}>
                      {typeof item === 'object' ? JSON.stringify(item) : item}
                    </Text>
                  )}
                />
              )}
            </>
          ) : (
            <View style={{ 
              padding: 40, 
              alignItems: 'center', 
              backgroundColor: 'white', 
              borderWidth: 1, 
              borderColor: '#E4E4E7', 
              borderRadius: 8 
            }}>
              <Zap size={40} color="#E4E4E7" />
              <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#A1A1AA', marginTop: 12 }}>
                No spec generated yet
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#A1A1AA', marginTop: 4, textAlign: 'center' }}>
                Fill in the brief details and click "Generate Spec"
              </Text>
            </View>
          )}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 8, width: '90%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717' }}>Export Spec</Text>
              <TouchableOpacity onPress={() => { setShowExportModal(false); setShareLink(''); }}>
                <X size={20} color="#71717A" />
              </TouchableOpacity>
            </View>

            {/* Export options */}
            <TouchableOpacity 
              onPress={exportMarkdown}
              disabled={exporting}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 12, 
                borderWidth: 1, 
                borderColor: '#E4E4E7', 
                borderRadius: 8,
                marginBottom: 8
              }}
            >
              <FileText size={20} color="#171717" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#171717' }}>Copy as Markdown</Text>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA' }}>Copy formatted spec to clipboard</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={exportPDF}
              disabled={exporting}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 12, 
                borderWidth: 1, 
                borderColor: '#E4E4E7', 
                borderRadius: 8,
                marginBottom: 8
              }}
            >
              <Download size={20} color="#171717" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#171717' }}>Export PDF</Text>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA' }}>Download or share as PDF</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => { setShowExportModal(false); setShowGitHubModal(true); fetchGitHubRepos(); }}
              disabled={exporting}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 12, 
                borderWidth: 1, 
                borderColor: '#E4E4E7', 
                borderRadius: 8,
                marginBottom: 8
              }}
            >
              <Github size={20} color="#171717" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#171717' }}>Export to GitHub</Text>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA' }}>Create issues from tasks</Text>
              </View>
            </TouchableOpacity>

            {/* Share Link Section */}
            <View style={{ marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E4E4E7' }}>
              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 8 }}>
                Share Link
              </Text>
              {shareLink ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F5', borderRadius: 6, padding: 10 }}>
                  <Text style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#171717' }} numberOfLines={1}>
                    {shareLink}
                  </Text>
                  <TouchableOpacity onPress={copyShareLink} style={{ marginLeft: 8 }}>
                    {copied ? <Check size={18} color="#16A34A" /> : <Copy size={18} color="#71717A" />}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={generateShareLink}
                  disabled={exporting}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: 12, 
                    backgroundColor: '#171717', 
                    borderRadius: 6
                  }}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Link size={14} color="white" />
                      <Text style={{ color: 'white', fontFamily: 'monospace', fontSize: 12, marginLeft: 6 }}>Generate Share Link</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* GitHub Export Modal */}
      <Modal visible={showGitHubModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 8, width: '90%', padding: 20, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717' }}>Export to GitHub</Text>
              <TouchableOpacity onPress={() => setShowGitHubModal(false)}>
                <X size={20} color="#71717A" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717A', marginBottom: 12 }}>
              Select a repository to create issues:
            </Text>

            {loadingRepos ? (
              <ActivityIndicator size="large" color="#002FA7" style={{ marginVertical: 40 }} />
            ) : repos.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#A1A1AA', textAlign: 'center' }}>
                  No repositories found. Make sure GitHub is connected in Settings.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                {repos.map((repo, idx) => (
                  <TouchableOpacity
                    key={repo.full_name || idx}
                    onPress={() => setSelectedRepo(repo.full_name)}
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderColor: selectedRepo === repo.full_name ? '#002FA7' : '#E4E4E7',
                      backgroundColor: selectedRepo === repo.full_name ? '#EFF6FF' : 'white',
                      borderRadius: 6,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: 'monospace', color: selectedRepo === repo.full_name ? '#002FA7' : '#171717' }}>
                      {repo.full_name}
                    </Text>
                    {selectedRepo === repo.full_name && <Check size={16} color="#002FA7" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={exportToGitHub}
              disabled={exporting || !selectedRepo}
              style={{
                backgroundColor: exporting || !selectedRepo ? '#A1A1AA' : '#171717',
                padding: 12,
                borderRadius: 6,
                alignItems: 'center',
              }}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontFamily: 'monospace' }}>Create Issues</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}