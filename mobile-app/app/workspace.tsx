import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, TextInput, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, Crown, Pencil, Eye, Plus, X, Copy, ChevronDown, UserPlus, Mail, Link, Check, Trash2 } from 'lucide-react-native';
import axios from 'axios';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../src/contexts/AuthContext';

// Role icon component
function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case 'owner':
      return <Crown size={14} color="#D97706" />;
    case 'editor':
      return <Pencil size={14} color="#002FA7" />;
    default:
      return <Eye size={14} color="#71717A" />;
  }
}

// Role badge component
function RoleBadge({ role }: { role: string }) {
  const getStyle = () => {
    switch (role) {
      case 'owner':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
      case 'editor':
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#002FA7' };
      default:
        return { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' };
    }
  };
  const style = getStyle();
  
  return (
    <View style={{ 
      backgroundColor: style.bg, 
      borderWidth: 1, 
      borderColor: style.border, 
      paddingHorizontal: 8, 
      paddingVertical: 2, 
      borderRadius: 4,
      flexDirection: 'row',
      alignItems: 'center'
    }}>
      <RoleIcon role={role} />
      <Text style={{ fontSize: 10, fontFamily: 'monospace', color: style.text, marginLeft: 4, textTransform: 'capitalize' }}>{role}</Text>
    </View>
  );
}

// Member card component
function MemberCard({ 
  member, 
  currentUserRole, 
  onRoleChange, 
  onRemove 
}: { 
  member: any; 
  currentUserRole: string;
  onRoleChange: (memberId: string, newRole: string) => void;
  onRemove: (memberId: string) => void;
}) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const isOwner = currentUserRole === 'owner';
  const canEditMember = isOwner && member.role !== 'owner';

  return (
    <View style={{ 
      backgroundColor: 'white', 
      borderWidth: 1, 
      borderColor: '#E4E4E7', 
      borderRadius: 8, 
      padding: 12,
      marginBottom: 8 
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#171717', fontWeight: '600' }}>
            {member.name || member.email}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', marginTop: 2 }}>
            {member.email}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {canEditMember ? (
            <TouchableOpacity 
              onPress={() => setShowRoleMenu(!showRoleMenu)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <RoleBadge role={member.role} />
              <ChevronDown size={14} color="#71717A" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ) : (
            <RoleBadge role={member.role} />
          )}
        </View>
      </View>
      
      {/* Role dropdown */}
      {showRoleMenu && canEditMember && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E4E4E7' }}>
          <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#A1A1AA', marginBottom: 8 }}>Change role:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['editor', 'viewer'].map(role => (
              <TouchableOpacity 
                key={role}
                onPress={() => {
                  onRoleChange(member.user_id, role);
                  setShowRoleMenu(false);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: member.role === role ? '#002FA7' : '#E4E4E7',
                  backgroundColor: member.role === role ? '#EFF6FF' : 'white',
                }}
              >
                <Text style={{ 
                  fontSize: 11, 
                  fontFamily: 'monospace', 
                  color: member.role === role ? '#002FA7' : '#71717A',
                  textTransform: 'capitalize'
                }}>{role}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              onPress={() => {
                onRemove(member.user_id);
                setShowRoleMenu(false);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: '#FECACA',
                backgroundColor: '#FEF2F2',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Trash2 size={12} color="#DC2626" />
              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#DC2626', marginLeft: 4 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function WorkspaceScreen() {
  const router = useRouter();
  const { API, user, currentWorkspace, workspaces, switchWorkspace, refreshWorkspaces } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  
  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  
  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get current user's role in this workspace
  const currentUserRole = members.find(m => m.email === user?.email)?.role || 'viewer';

  const fetchWorkspaceData = useCallback(async () => {
    if (!currentWorkspace?.workspace_id) return;
    
    try {
      setLoading(true);
      const [membersRes, inviteRes] = await Promise.all([
        axios.get(`${API}/workspaces/${currentWorkspace.workspace_id}/members`),
        axios.get(`${API}/workspaces/${currentWorkspace.workspace_id}/invite-link`).catch(() => ({ data: { link: '' } }))
      ]);
      setMembers(membersRes.data);
      setInviteLink(inviteRes.data.link || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API, currentWorkspace]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/workspaces/${currentWorkspace?.workspace_id}/invite`, {
        email: inviteEmail,
        role: inviteRole
      });
      Alert.alert('Success', 'Invitation sent!');
      setShowInviteModal(false);
      setInviteEmail('');
      fetchWorkspaceData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to send invite');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      Alert.alert('Error', 'Please enter a workspace name');
      return;
    }
    
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/workspaces`, { name: newWorkspaceName });
      await refreshWorkspaces?.();
      await switchWorkspace?.(res.data.workspace_id);
      Alert.alert('Success', 'Workspace created!');
      setShowCreateModal(false);
      setNewWorkspaceName('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create workspace');
    } finally {
      setProcessing(false);
    }
  };

  const handleJoinWorkspace = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }
    
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/workspaces/join`, { code: joinCode });
      await refreshWorkspaces?.();
      await switchWorkspace?.(res.data.workspace_id);
      Alert.alert('Success', 'Joined workspace!');
      setShowJoinModal(false);
      setJoinCode('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to join workspace');
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await axios.put(`${API}/workspaces/${currentWorkspace?.workspace_id}/members/${memberId}/role`, { role: newRole });
      fetchWorkspaceData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the workspace?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API}/workspaces/${currentWorkspace?.workspace_id}/members/${memberId}`);
              fetchWorkspaceData();
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await Clipboard.setStringAsync(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    setShowWorkspacePicker(false);
    await switchWorkspace?.(workspaceId);
    fetchWorkspaceData();
  };

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
          <TouchableOpacity 
            onPress={() => setShowWorkspacePicker(true)}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#171717' }}>
              {currentWorkspace?.name || 'Workspace'}
            </Text>
            <ChevronDown size={18} color="#71717A" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA' }}>
            {members.length} members
          </Text>
        </View>
        
        {currentUserRole === 'owner' && (
          <TouchableOpacity 
            onPress={() => setShowInviteModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: '#171717',
              borderRadius: 4
            }}
          >
            <UserPlus size={14} color="white" />
            <Text style={{ color: 'white', fontFamily: 'monospace', fontSize: 11, marginLeft: 6 }}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#002FA7" />
        </View>
      ) : (
        <ScrollView 
          style={{ flex: 1, padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Quick actions */}
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <TouchableOpacity 
              onPress={() => setShowCreateModal(true)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 8,
                marginRight: 8
              }}
            >
              <Plus size={16} color="#002FA7" />
              <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#002FA7', marginLeft: 6 }}>New Workspace</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowJoinModal(true)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 8
              }}
            >
              <Link size={16} color="#71717A" />
              <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717A', marginLeft: 6 }}>Join Workspace</Text>
            </TouchableOpacity>
          </View>

          {/* Invite link */}
          {inviteLink && currentUserRole === 'owner' && (
            <View style={{ 
              backgroundColor: 'white', 
              borderWidth: 1, 
              borderColor: '#E4E4E7', 
              borderRadius: 8, 
              padding: 12,
              marginBottom: 16 
            }}>
              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 8 }}>
                Invite Link
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text 
                  style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#71717A' }}
                  numberOfLines={1}
                >
                  {inviteLink}
                </Text>
                <TouchableOpacity onPress={handleCopyLink} style={{ marginLeft: 8, padding: 4 }}>
                  {copied ? (
                    <Check size={18} color="#16A34A" />
                  ) : (
                    <Copy size={18} color="#71717A" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Members section */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Team Members
            </Text>
            {members.map((member, idx) => (
              <MemberCard 
                key={member.user_id || idx}
                member={member}
                currentUserRole={currentUserRole}
                onRoleChange={handleRoleChange}
                onRemove={handleRemoveMember}
              />
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Workspace Picker Modal */}
      <Modal visible={showWorkspacePicker} transparent animationType="fade">
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowWorkspacePicker(false)}
        >
          <View style={{ backgroundColor: 'white', borderRadius: 8, width: '85%', maxHeight: '60%', padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717', marginBottom: 16 }}>Switch Workspace</Text>
            <FlatList
              data={workspaces}
              keyExtractor={(item) => item.workspace_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSwitchWorkspace(item.workspace_id)}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E4E4E7',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#171717' }}>{item.name}</Text>
                  {item.workspace_id === currentWorkspace?.workspace_id && (
                    <Check size={16} color="#002FA7" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#A1A1AA', textAlign: 'center', padding: 20 }}>
                  No workspaces
                </Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 8, width: '90%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717' }}>Invite Team Member</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <X size={20} color="#71717A" />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717A', marginBottom: 8 }}>Email</Text>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="colleague@company.com"
              placeholderTextColor="#A1A1AA"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 4,
                padding: 12,
                fontSize: 13,
                fontFamily: 'monospace',
                color: '#171717',
                marginBottom: 16,
              }}
            />
            
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717A', marginBottom: 8 }}>Role</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {['viewer', 'editor'].map(role => (
                <TouchableOpacity 
                  key={role}
                  onPress={() => setInviteRole(role)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: inviteRole === role ? '#002FA7' : '#E4E4E7',
                    backgroundColor: inviteRole === role ? '#EFF6FF' : 'white',
                    marginRight: role === 'viewer' ? 8 : 0,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ 
                    fontSize: 12, 
                    fontFamily: 'monospace', 
                    color: inviteRole === role ? '#002FA7' : '#71717A',
                    textTransform: 'capitalize'
                  }}>{role}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              onPress={handleInvite}
              disabled={processing}
              style={{
                backgroundColor: processing ? '#A1A1AA' : '#171717',
                padding: 12,
                borderRadius: 4,
                alignItems: 'center',
              }}
            >
              {processing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontFamily: 'monospace' }}>Send Invite</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Workspace Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 8, width: '90%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717' }}>Create Workspace</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color="#71717A" />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717A', marginBottom: 8 }}>Workspace Name</Text>
            <TextInput
              value={newWorkspaceName}
              onChangeText={setNewWorkspaceName}
              placeholder="My Workspace"
              placeholderTextColor="#A1A1AA"
              style={{
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 4,
                padding: 12,
                fontSize: 13,
                fontFamily: 'monospace',
                color: '#171717',
                marginBottom: 16,
              }}
            />
            
            <TouchableOpacity
              onPress={handleCreateWorkspace}
              disabled={processing}
              style={{
                backgroundColor: processing ? '#A1A1AA' : '#171717',
                padding: 12,
                borderRadius: 4,
                alignItems: 'center',
              }}
            >
              {processing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontFamily: 'monospace' }}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Join Workspace Modal */}
      <Modal visible={showJoinModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 8, width: '90%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717' }}>Join Workspace</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <X size={20} color="#71717A" />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717A', marginBottom: 8 }}>Invite Code</Text>
            <TextInput
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="paste-invite-code-here"
              placeholderTextColor="#A1A1AA"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 4,
                padding: 12,
                fontSize: 13,
                fontFamily: 'monospace',
                color: '#171717',
                marginBottom: 16,
              }}
            />
            
            <TouchableOpacity
              onPress={handleJoinWorkspace}
              disabled={processing}
              style={{
                backgroundColor: processing ? '#A1A1AA' : '#171717',
                padding: 12,
                borderRadius: 4,
                alignItems: 'center',
              }}
            >
              {processing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontFamily: 'monospace' }}>Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
