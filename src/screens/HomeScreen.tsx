import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Searchbar, Card, Avatar, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { format } from 'date-fns';

type Post = {
  id: string;
  title: string;
  content: string;
  image_urls: string[];
  created_at: string;
  event_date: string | null;
  location: string | null;
  is_members_only: boolean;
  likes: number;
  organization_ids: string[];
  posted_by: string;
  organization: {
    name: string;
    logo_url: string;
  };
  officer: {
    first_name: string;
    last_name: string;
    profile_picture_url: string;
  };
};

export const HomeScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          organization:organizations(name, logo_url),
          officer:officers(first_name, last_name, profile_picture_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPosts(data || []);
      setFilteredPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Title
        title={item.title}
        subtitle={format(new Date(item.created_at), 'MMM dd, yyyy h:mm a')}
        left={(props) => (
          <Avatar.Image
            {...props}
            source={{ uri: item.organization.logo_url || 'https://via.placeholder.com/50' }}
          />
        )}
      />
      {item.image_urls && item.image_urls.length > 0 && (
        <Card.Cover source={{ uri: item.image_urls[0] }} />
      )}
      <Card.Content>
        <Text variant="bodyMedium">{item.content}</Text>
        
        <View style={styles.postDetails}>
          {item.event_date && (
            <Chip icon="calendar" style={styles.chip}>
              {format(new Date(item.event_date), 'MMM dd, yyyy')}
            </Chip>
          )}
          
          {item.location && (
            <Chip icon="map-marker" style={styles.chip}>
              {item.location}
            </Chip>
          )}
          
          {item.is_members_only && (
            <Chip icon="lock" style={styles.chip}>
              Members Only
            </Chip>
          )}
        </View>
        
        <View style={styles.postFooter}>
          <Text variant="bodySmall">
            Posted by {item.officer.first_name} {item.officer.last_name} in {item.organization.name}
          </Text>
          <Text variant="bodySmall">
            {item.likes} {item.likes === 1 ? 'like' : 'likes'}
          </Text>
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
      <Searchbar
        placeholder="Search posts..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {filteredPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge">No posts found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
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
  searchBar: {
    margin: theme.spacing.md,
    elevation: 2,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  postDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  chip: {
    marginRight: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  divider: {
    marginVertical: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 