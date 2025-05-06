import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Dimensions, ScrollView, Image } from 'react-native';
import { Text, Searchbar, Card, Avatar, Chip, ActivityIndicator, Divider, IconButton } from 'react-native-paper';
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
  isLiked?: boolean;
};

const PostCarousel = ({ imageUrls }: { imageUrls: string[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / containerWidth);
    setActiveIndex(index);
  };

  return (
    <View 
      style={styles.carouselContainer}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {imageUrls.map((imageUrl, index) => (
          <View key={index} style={[styles.imageContainer, { width: containerWidth }]}>
            <Image source={{ uri: imageUrl }} style={styles.image} />
          </View>
        ))}
      </ScrollView>
      {imageUrls.length > 1 && (
        <View style={styles.pagination}>
          {imageUrls.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                activeIndex === index && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
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
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          organization:organizations(name, logo_url),
          officer:officers(first_name, last_name, profile_picture_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // If user is logged in, check which posts are liked
      let postsWithLikeStatus = data || [];
      
      if (user) {
        const { data: likes, error: likesError } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);
          
        if (!likesError && likes) {
          const likedPostIds = new Set(likes.map(like => like.post_id));
          
          postsWithLikeStatus = postsWithLikeStatus.map(post => ({
            ...post,
            isLiked: likedPostIds.has(post.id)
          }));
        }
      }
      
      setPosts(postsWithLikeStatus);
      setFilteredPosts(postsWithLikeStatus);
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

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Handle not logged in case
        console.log('Please log in to like posts');
        return;
      }

      // Optimistically update UI
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: currentlyLiked ? post.likes - 1 : post.likes + 1,
            isLiked: !currentlyLiked
          };
        }
        return post;
      });
      
      setPosts(updatedPosts);
      setFilteredPosts(
        searchQuery.trim() === '' 
          ? updatedPosts
          : updatedPosts.filter(post => 
              post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              post.content.toLowerCase().includes(searchQuery.toLowerCase())
            )
      );

      if (currentlyLiked) {
        // Remove like
        const { error: deleteError } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      } else {
        // Add like
        const { error: insertError } = await supabase
          .from('post_likes')
          .insert([
            { post_id: postId, user_id: user.id }
          ]);

        if (insertError) throw insertError;
      }

      // Update post like count
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      const newLikeCount = currentlyLiked ? (post?.likes || 1) - 1 : (post?.likes || 0) + 1;
      
      const { error: updateError } = await supabase
        .from('posts')
        .update({ likes: newLikeCount })
        .eq('id', postId);

      if (updateError) throw updateError;

    } catch (error) {
      console.error('Error updating like:', error);
      // Revert optimistic update on error
      fetchPosts();
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Title
        title={item.organization.name}
        subtitle={format(new Date(item.created_at), 'MMM dd, yyyy h:mm a')}
        left={(props) => (
          <Avatar.Image
            {...props}
            source={{ uri: item.organization.logo_url || 'https://via.placeholder.com/50' }}
          />
        )}
      />
      {item.image_urls && item.image_urls.length > 0 && (
        <PostCarousel imageUrls={item.image_urls} />
      )}
      <Card.Content>
        <Text style={{ fontWeight: 'bold',  paddingTop: 10, paddingBottom: 10, fontSize: 18 }}>{item.title}</Text>
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
            Posted by {item.officer.first_name} {item.officer.last_name}
          </Text>
          <View style={styles.likeContainer}>
            <Text variant="bodySmall" style={styles.likeCount}>
              {item.likes} {item.likes === 1 ? 'like' : 'likes'}
            </Text>
            <IconButton
              icon={item.isLiked ? "heart" : "heart-outline"}
              iconColor={item.isLiked ? theme.colors.error : theme.colors.primary}
              size={20}
              onPress={() => handleLike(item.id, !!item.isLiked)}
            />
          </View>
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
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    marginRight: -theme.spacing.sm,
  },
  divider: {
    marginVertical: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    width: '100%',
    height: '100%',
  },
  imageContainer: {
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pagination: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: 'white',
  },
});