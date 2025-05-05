import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Avatar, ActivityIndicator, Divider, Button } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';

type Organization = {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  contact_email: string;
  status: string;
};

export const OrganizationsScreen = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUserOrganizations = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user found');
      }
      
      setUserId(user.id);
      
      // Get user's organizations
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('organization_ids')
        .eq('id', user.id)
        .single();
      
      if (memberError) throw memberError;
      
      if (memberData && memberData.organization_ids && memberData.organization_ids.length > 0) {
        // Fetch organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', memberData.organization_ids);
        
        if (orgError) throw orgError;
        
        setOrganizations(orgData || []);
      } else {
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserOrganizations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserOrganizations();
    setRefreshing(false);
  };

  const renderOrganization = ({ item }: { item: Organization }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Title
        title={item.name}
        subtitle={item.status}
        left={(props) => (
          <Avatar.Image
            {...props}
            source={{ uri: item.logo_url || 'https://via.placeholder.com/50' }}
          />
        )}
      />
      <Card.Content>
        <Text variant="bodyMedium">{item.description}</Text>
        
        <View style={styles.contactInfo}>
          <Text variant="bodySmall">Contact: {item.contact_email}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Organizations</Text>
      
      {organizations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge">You are not affiliated with any organizations yet</Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Organizations are added by officers through the desktop dashboard
          </Text>
        </View>
      ) : (
        <FlatList
          data={organizations}
          renderItem={renderOrganization}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
        />
      )}
    </View>
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
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    margin: theme.spacing.md,
    color: theme.colors.primary,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  contactInfo: {
    marginTop: theme.spacing.md,
  },
  divider: {
    marginVertical: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: theme.spacing.md,
    color: theme.colors.text,
  },
}); 