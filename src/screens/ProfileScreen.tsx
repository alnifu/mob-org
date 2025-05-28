import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import {
  Text, Avatar, Button, Card, Divider, List,
  ActivityIndicator, TextInput, Portal, Modal
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';


type Member = {
  id: string;
  first_name: string;
  last_name: string;
  bio: string;
  profile_picture_url: string;
  created_at: string;
  updated_at: string;
  organization_ids: string[];
};

export const ProfileScreen = ({ navigation }: any) => {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    bio: '',
  });
  const [userEmail, setUserEmail] = useState<string>('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Change password state
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setMember(data);
      setProfilePicture(data.profile_picture_url);
      setEditForm({
        firstName: data.first_name,
        lastName: data.last_name,
        bio: data.bio || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .download(path);
      if (error) throw error;

      const fr = new FileReader();
      fr.readAsDataURL(data);
      fr.onload = () => {
        setProfilePicture(fr.result as string);
      };
    } catch (error) {
      const { data } = await supabase.storage
        .from('profile-pictures')
        .createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        setProfilePicture(data.signedUrl);
      }
    }
  };

  useEffect(() => {
    if (member?.profile_picture_url) {
      downloadImage(member.profile_picture_url);
    }
  }, [member?.profile_picture_url]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera roll permissions to select a profile picture');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const image = result.assets[0];
      if (!image.uri) throw new Error('No image URI found');
      await uploadProfilePicture(image.uri);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    try {
      if (!member) throw new Error('No member found');
      setUploading(true);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));      
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const path = `${member.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(path, byteArray.buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: signedUrlData } = await supabase.storage
        .from('profile-pictures')
        .createSignedUrl(path, 3600);

      const { error: updateError } = await supabase
        .from('members')
        .update({
          id: member.id,
          profile_picture_url: path,
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id);

      if (updateError) throw updateError;
      if (signedUrlData?.signedUrl) setProfilePicture(signedUrlData.signedUrl);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const handleEdit = async () => {
    try {
      if (!member) return;
      const { error } = await supabase
        .from('members')
        .update({
          first_name: editForm.firstName,
          last_name: editForm.lastName,
          bio: editForm.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (error) throw error;
      await fetchUserProfile();
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      Alert.alert('Success', 'Password changed successfully.');
      setChangePasswordVisible(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: handleSignOut, style: 'destructive' },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profilePictureContainer}>
          <Image
            source={{ uri: profilePicture || 'https://via.placeholder.com/100' }}
            style={styles.profilePicture}
          />
          <Button
            mode="outlined"
            onPress={pickImage}
            style={styles.changePictureButton}
            textColor="white"
            loading={uploading}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Change Picture'}
          </Button>
        </View>
        <Text style={styles.name}>{member?.first_name} {member?.last_name}</Text>
        <Text style={styles.email}>{userEmail}</Text>
      </View>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text variant="bodyMedium">{member?.bio || 'No bio provided'}</Text>
          <Divider style={styles.divider} />
          <List.Section>
            <List.Item
              title="Account Created"
              description={format(new Date(member?.created_at || ''), 'MMMM dd, yyyy')}
              left={props => <List.Icon {...props} icon="calendar" />}
            />
            <List.Item
              title="Last Updated"
              description={format(new Date(member?.updated_at || ''), 'MMMM dd, yyyy')}
              left={props => <List.Icon {...props} icon="update" />}
            />
            <List.Item
              title="Organizations"
              description={member?.organization_ids?.length
                ? `${member.organization_ids.length} organizations`
                : 'No organizations'}
              left={props => <List.Icon {...props} icon="account-group" />}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={() => setEditing(true)} style={styles.editButton} icon="pencil">
          Edit Profile
        </Button>
        <Button mode="contained" onPress={confirmSignOut} loading={signingOut} disabled={signingOut}
          style={styles.signOutButton} icon="logout">
          Sign Out
        </Button>
      </View>

      <View style={{ marginHorizontal: theme.spacing.md }}>
        <Button mode="outlined" icon="key" onPress={() => setChangePasswordVisible(true)}>
          Change Password
        </Button>
      </View>

      {/* Edit Profile Modal */}
      <Portal>
        <Modal visible={editing} onDismiss={() => setEditing(false)} contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TextInput label="First Name" value={editForm.firstName} onChangeText={(text) => setEditForm({ ...editForm, firstName: text })} style={styles.input} mode="outlined" />
          <TextInput label="Last Name" value={editForm.lastName} onChangeText={(text) => setEditForm({ ...editForm, lastName: text })} style={styles.input} mode="outlined" />
          <TextInput label="Bio" value={editForm.bio} onChangeText={(text) => setEditForm({ ...editForm, bio: text })} style={styles.input} mode="outlined" multiline numberOfLines={4} />
          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => setEditing(false)} style={styles.modalButton}>Cancel</Button>
            <Button mode="contained" onPress={handleEdit} style={styles.modalButton}>Save Changes</Button>
          </View>
        </Modal>

        {/* Change Password Modal */}
        <Modal visible={changePasswordVisible} onDismiss={() => setChangePasswordVisible(false)} contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>Change Password</Text>
          <TextInput label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry mode="outlined" style={styles.input} />
          <TextInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry mode="outlined" style={styles.input} />
          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => setChangePasswordVisible(false)} style={styles.modalButton}>Cancel</Button>
            <Button mode="contained" onPress={handleChangePassword} loading={changingPassword} disabled={changingPassword} style={styles.modalButton}>Change</Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.primary },
  profilePictureContainer: { alignItems: 'center', marginBottom: theme.spacing.md },
  profilePicture: { width: 200, height: 200, borderRadius: 100, marginBottom: theme.spacing.sm },
  changePictureButton: { marginTop: theme.spacing.sm, borderColor: 'white' },
  name: { fontSize: 24, fontWeight: 'bold', color: 'white', marginTop: theme.spacing.md },
  email: { fontSize: 16, color: 'white', marginTop: theme.spacing.xs },
  card: { margin: theme.spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: theme.spacing.sm, color: theme.colors.primary },
  divider: { marginVertical: theme.spacing.md },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', margin: theme.spacing.md },
  editButton: { flex: 1, marginRight: theme.spacing.sm },
  signOutButton: { flex: 1, marginLeft: theme.spacing.sm, backgroundColor: theme.colors.secondary },
  modalContainer: { backgroundColor: 'white', padding: theme.spacing.xl, margin: theme.spacing.lg, borderRadius: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: theme.spacing.lg, color: theme.colors.primary },
  input: { marginBottom: theme.spacing.md },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.md },
  modalButton: { marginLeft: theme.spacing.sm },
});
