import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Button, Text, Surface, TextInput, Divider } from 'react-native-paper';
// import * as Google from 'expo-auth-session/providers/google';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';

export const LoginScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Temporarily disabled Google authentication
  /*
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    expoClientId: 'YOUR_EXPO_CLIENT_ID',
  });

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await promptAsync();
      
      if (result?.type === 'success') {
        const { authentication } = result;
        
        // Get user info from Google
        const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${authentication?.accessToken}` },
        });
        const userInfo = await response.json();
        
        // Check if email is from DLSU
        if (!userInfo.email.endsWith('@dlsl.edu.ph')) {
          setError('Only DLSU email addresses are allowed');
          return;
        }

        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: authentication?.idToken || '',
        });

        if (error) throw error;

        // Check if user exists in members table
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', data.user?.id)
          .single();

        if (memberError && memberError.code === 'PGRST116') {
          // User doesn't exist, navigate to profile setup
          navigation.replace('ProfileSetup', { userInfo });
        } else {
          // User exists, navigate to home
          navigation.replace('MainTabs');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  */

  const handleEmailSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate email format
      if (!email.endsWith('@dlsl.edu.ph')) {
        setError('Only DLSU email addresses are allowed');
        return;
      }

      if (isSignUp) {
        // Sign up with email and password
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'mob-org://',
            data: {
              email_confirmed: true
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          // Check if user exists in members table
          const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (memberError && memberError.code === 'PGRST116') {
            // User doesn't exist, navigate to profile setup
            navigation.replace('ProfileSetup', { 
              email: data.user.email,
              picture: null
            });
          } else {
            // User exists, navigate to home
            navigation.replace('MainTabs');
          }
        }
      } else {
        // Sign in with email and password
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Navigate to home
        navigation.replace('MainTabs');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Surface style={styles.surface}>
          <Image
            source={require('../../assets/dlsu-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>DLSL Organizations</Text>
          <Text style={styles.subtitle}>{isSignUp ? 'Sign Up' : 'Sign In'} with your DLSL email</Text>
          
          {error && (
            <Text style={styles.error}>{error}</Text>
          )}
          
          <TextInput
            label="DLSL Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            mode="outlined"
            secureTextEntry
          />
          
          <Button
            mode="contained"
            onPress={handleEmailSignIn}
            loading={loading}
            disabled={loading || !email || !password}
            style={styles.button}
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
          
          <Button
            mode="text"
            onPress={() => setIsSignUp(!isSignUp)}
            style={styles.switchButton}
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up'}
          </Button>
          
          {/* Temporarily disabled Google Sign In
          <Divider style={styles.divider} />
          
          <Text style={styles.orText}>OR</Text>
          
          <Button
            mode="outlined"
            onPress={handleGoogleSignIn}
            loading={loading}
            disabled={loading}
            style={styles.googleButton}
            icon="google"
          >
            Sign in with Google
          </Button>
          */}
        </Surface>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  surface: {
    padding: theme.spacing.xl,
    borderRadius: 12,
    elevation: 4,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
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
  input: {
    marginBottom: theme.spacing.md,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  switchButton: {
    marginTop: theme.spacing.sm,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  divider: {
    marginVertical: theme.spacing.lg,
  },
  orText: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  googleButton: {
    marginTop: theme.spacing.sm,
  },
}); 