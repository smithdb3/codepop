import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import StarRating from './StarRating';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseURL } from '../../ip_address';
import Gif from './Gif';
import ingredientMeta from './Ingredients';
import { useTheme } from '../theme';

const RatingCarosel = ({ purchasedDrinks }) => {
    const navigation = useNavigation();
    const { colors } = useTheme();

    const [itemWidth, setItemWidth] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auth state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);

    // Rating and favorites tracking
    const [ratedDrinks, setRatedDrinks] = useState({});
    const [favoritedDrinks, setFavoritedDrinks] = useState(new Set());
    const [loadingFavorite, setLoadingFavorite] = useState(null);

    // Load auth state on mount
    useEffect(() => {
        (async () => {
            try {
                const storedToken = await AsyncStorage.getItem('userToken');
                const storedUserId = await AsyncStorage.getItem('userId');
                if (storedToken && storedUserId) {
                    setIsLoggedIn(true);
                    setToken(storedToken);
                    setUserId(storedUserId);
                }
            } catch (error) {
                console.error('Error loading auth state:', error);
            }
        })();
    }, []);

    // Page indicator tracking
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }, []);

    // Drink visualization layers
    const getLayers = (soda, syrups, addins) => {
        const layers = [];
        const totalItems = soda.length + syrups.length + addins.length;
        if (totalItems === 0) return layers;
        const addLayer = (name) => {
            if (!name) return;
            const meta = ingredientMeta[name.toLowerCase()];
            if (meta?.color) {
                layers.push({ color: meta.color, height: 100 / totalItems });
            }
        };
        soda.forEach(addLayer);
        syrups.forEach(addLayer);
        addins.forEach(addLayer);
        return layers;
    };

    const handleRatingSelected = (newRating, drinkIndex) => {
        setRatedDrinks((prev) => ({ ...prev, [drinkIndex]: newRating }));
    };

    const handleAddToFavorites = async (drink, drinkIndex) => {
        if (!isLoggedIn) {
            Alert.alert(
                'Sign In Required',
                'Please sign in to save drinks to your favorites.',
                [{ text: 'OK' }]
            );
            return;
        }

        setLoadingFavorite(drinkIndex);
        try {
            const response = await fetch(
                `${getBaseURL()}/backend/users/${userId}/favorites/${drink.DrinkID}/`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Token ${token}`,
                    },
                    body: JSON.stringify({ action: 'add' }),
                }
            );
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response:', errorData);
                throw new Error(`Failed to add to favorites. Status: ${response.status}`);
            }
            setFavoritedDrinks((prev) => new Set([...prev, drinkIndex]));
        } catch (error) {
            console.error('Error adding to favorites:', error);
            Alert.alert('Error', 'Failed to add drink to favorites. Please try again.');
        } finally {
            setLoadingFavorite(null);
        }
    };

    const renderItem = ({ item: drink, index: drinkIndex }) => {
        const layers = getLayers(drink.SodaUsed, drink.SyrupsUsed, drink.AddIns);
        const isRated = ratedDrinks[drinkIndex] !== undefined;
        const isFavorited = favoritedDrinks.has(drinkIndex);
        const isLoadingThisFav = loadingFavorite === drinkIndex;

        const drinkName = drink.Name || (drink.SodaUsed?.[0] ?? 'Custom Drink');

        // Build ingredient subtitle: Soda · Syrup1, Syrup2 · AddIn1
        const subtitleParts = [
            ...(drink.SodaUsed?.length ? [drink.SodaUsed.join(', ')] : []),
            ...(drink.SyrupsUsed?.length ? [drink.SyrupsUsed.join(', ')] : []),
            ...(drink.AddIns?.length ? [drink.AddIns.join(', ')] : []),
        ];
        const subtitle = subtitleParts.join(' · ');

        return (
            <View style={[styles.carouselItem, { width: itemWidth, backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Pink accent top border */}
                <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />

                <View style={styles.cardContent}>
                    {/* Drink name */}
                    <Text style={[styles.drinkName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {drinkName}
                    </Text>

                    {/* Ingredient subtitle */}
                    {subtitle.length > 0 && (
                        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
                            {subtitle}
                        </Text>
                    )}

                    {/* Centered Gif */}
                    <View style={styles.gifContainer}>
                        <Gif layers={layers} height={100} width={55} />
                    </View>

                    {/* Add to Favorites button */}
                    <TouchableOpacity
                        onPress={() => handleAddToFavorites(drink, drinkIndex)}
                        disabled={isFavorited || isLoadingThisFav}
                        style={[
                            styles.favButton,
                            {
                                backgroundColor: isFavorited ? colors.border : colors.primary,
                                opacity: isFavorited || isLoadingThisFav ? 0.6 : 1,
                            },
                        ]}
                    >
                        <Icon
                            name={isFavorited ? 'heart' : 'heart-outline'}
                            size={18}
                            color={colors.surface}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.favButtonText, { color: colors.surface }]}>
                            {isFavorited ? 'Saved!' : 'Add to Favorites'}
                        </Text>
                    </TouchableOpacity>

                    {/* Star rating */}
                    <View style={styles.ratingContainer}>
                        {!isRated && (
                            <Text style={[styles.ratePrompt, { color: colors.textMuted }]}>
                                How was your drink?
                            </Text>
                        )}
                        <StarRating
                            onRatingSelected={(newRating) => handleRatingSelected(newRating, drinkIndex)}
                            disabled={isRated}
                            initialRating={isRated ? ratedDrinks[drinkIndex] : 0}
                        />
                        {isRated && (
                            <Text style={[styles.thankYouText, { color: colors.textMuted }]}>
                                Thank you for your feedback!
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View>
            <FlatList
                data={purchasedDrinks}
                renderItem={renderItem}
                keyExtractor={(_, idx) => idx.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onLayout={(e) => setItemWidth(e.nativeEvent.layout.width)}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />

            {/* Page indicator dots */}
            {purchasedDrinks.length > 1 && (
                <View style={styles.dotsContainer}>
                    {purchasedDrinks.map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: idx === currentIndex ? colors.primary : colors.border,
                                    width: idx === currentIndex ? 16 : 6,
                                },
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    carouselItem: {
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    accentBar: {
        height: 4,
        width: '100%',
    },
    cardContent: {
        padding: 12,
        alignItems: 'center',
    },
    drinkName: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 10,
    },
    gifContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    favButton: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        alignSelf: 'stretch',
        marginBottom: 12,
    },
    favButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    ratingContainer: {
        alignItems: 'center',
    },
    ratePrompt: {
        fontSize: 12,
        marginBottom: 6,
    },
    thankYouText: {
        fontSize: 12,
        marginTop: 6,
        fontStyle: 'italic',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        gap: 6,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
});

export default RatingCarosel;
