import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Avatar, Chip, ActivityIndicator, Divider, SegmentedButtons } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { format, isAfter, isBefore, isSameDay } from 'date-fns';

type Event = {
  id: string;
  title: string;
  description: string;
  image_urls: string[];
  created_at: string;
  event_date: string;
  location: string;
  is_members_only: boolean;
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

type EventCategory = 'upcoming' | 'ongoing' | 'past';

export const EventsScreen = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [category, setCategory] = useState<EventCategory>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          organization:organizations(name, logo_url),
          officer:officers(first_name, last_name, profile_picture_url)
        `)
        .not('event_date', 'is', null)
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      
      setEvents(data || []);
      filterEventsByCategory(data || [], category);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEventsByCategory(events, category);
  }, [category, events]);

  const filterEventsByCategory = (eventsList: Event[], selectedCategory: EventCategory) => {
    const now = new Date();
    
    const filtered = eventsList.filter(event => {
      const eventDate = new Date(event.event_date);
      
      switch (selectedCategory) {
        case 'upcoming':
          return isAfter(eventDate, now);
        case 'ongoing':
          return isSameDay(eventDate, now);
        case 'past':
          return isBefore(eventDate, now);
        default:
          return true;
      }
    });
    
    setFilteredEvents(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Title
        title={item.title}
        subtitle={format(new Date(item.event_date), 'MMM dd, yyyy h:mm a')}
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
        <Text variant="bodyMedium">{item.description}</Text>
        
        <View style={styles.eventDetails}>
          <Chip icon="calendar" style={styles.chip}>
            {format(new Date(item.event_date), 'MMM dd, yyyy h:mm a')}
          </Chip>
          
          {item.location && (
            <Chip icon="map-marker" style={styles.chip}>
              {item.location}
            </Chip>
          )}
        </View>
        
        <View style={styles.eventFooter}>
          <Text variant="bodySmall">
            Organized by {item.organization.name}
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
      <SegmentedButtons
        value={category}
        onValueChange={value => setCategory(value as EventCategory)}
        buttons={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'ongoing', label: 'On-Going' },
          { value: 'past', label: 'Past' },
        ]}
        style={styles.segmentedButtons}
      />
      
      {filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge">No {category} events found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEvent}
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
  segmentedButtons: {
    margin: theme.spacing.md,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  chip: {
    marginRight: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  eventFooter: {
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