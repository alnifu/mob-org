import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { TextInput, Button, Text, Surface, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';

export const ProfileSetupScreen = ({ route, navigation }: any) => {
  const { userInfo } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
  });
  const [profilePicture, setProfilePicture] = useState<string | null>(userInfo?.picture || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Check if we have a valid user session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) {
          // If no session, go back to login
          navigation.replace('Login');
        }
      } catch (err: any) {
        console.error('Error checking session:', err);
        navigation.replace('Login');
      }
    };

    checkSession();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera roll permissions to select a profile picture');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picker');
        return;
      }

      const image = result.assets[0];
      if (!image.uri) {
        throw new Error('No image URI found');
      }

      setProfilePicture(image.uri);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    try {
      setUploading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      const arrayBuffer = await fetch(uri).then((res) => res.arrayBuffer());
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const path = `${user.id}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(path, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrlData } = await supabase.storage
        .from('profile-pictures')
        .createSignedUrl(path, 3600);

      return signedUrlData?.signedUrl || null;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.firstName || !formData.lastName) {
        setError('First name and last name are required');
        return;
      }

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      let profilePictureUrl = profilePicture;

      // If a new image was selected, upload it
      if (profilePicture && profilePicture.startsWith('file://')) {
        try {
          profilePictureUrl = await uploadProfilePicture(profilePicture);
        } catch (error) {
          console.error('Error uploading profile picture:', error);
          Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
          return;
        }
      }

      // Insert the user profile into the members table
      const { error: insertError } = await supabase
        .from('members')
        .insert([
          {
            id: user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            bio: formData.bio,
            organization_ids: [],
            profile_picture_url: profilePictureUrl,
          },
        ]);

      if (insertError) throw insertError;

      // Navigate to main app
      navigation.replace('MainTabs');
    } catch (err: any) {
      console.error('Error setting up profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      <Surface style={styles.surface}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Tell us more about yourself</Text>

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <View style={styles.profilePictureContainer}>
          <Image
            source={{ uri: profilePicture || 'https://via.placeholder.com/150' }}
            style={styles.profilePicture}
          />
          <Button
            mode="outlined"
            onPress={pickImage}
            style={styles.changePictureButton}
            loading={uploading}
            disabled={uploading}
          >
            Change Picture
          </Button>
        </View>

        <TextInput
          label="First Name"
          value={formData.firstName}
          onChangeText={(text) => setFormData({ ...formData, firstName: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Last Name"
          value={formData.lastName}
          onChangeText={(text) => setFormData({ ...formData, lastName: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Bio (Optional)"
          value={formData.bio}
          onChangeText={(text) => setFormData({ ...formData, bio: text })}
          style={styles.input}
          mode="outlined"
          multiline
          numberOfLines={4}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || uploading}
          style={styles.button}
        >
          Complete Profile
        </Button>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surface: {
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: theme.spacing.md,
  },
  changePictureButton: {
    marginTop: theme.spacing.sm,
  },
  input: {
    marginBottom: theme.spacing.md,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
}); 