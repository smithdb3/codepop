import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState, useContext } from 'react';
import { Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Carousel from 'react-native-reanimated-carousel';
import { getBaseURL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TabNavigationContext from '../context/TabNavigationContext';

const { width: windowWidth } = Dimensions.get('window');
const CARD_HEIGHT = 290;
const CARD_HEIGHT_EXPANDED = 360;
const CARD_HEIGHT_FULL = 470;

const SeasonalCarousel = ({ readOnly = false }) => {
    const navigation = useNavigation();
    
    const tabNav = useContext(TabNavigationContext);

    const [containerWidth, setContainerWidth] = useState(windowWidth);
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSizePicker, setShowSizePicker] = useState(false);
    const [selectedSizes, setSelectedSizes] = useState({});
    const [addingId, setAddingId] = useState(null);
    const [successId, setSuccessId] = useState(null);

    const getCardHeight = () => {
        if (isExpanded && showSizePicker) return CARD_HEIGHT_FULL;
        if (isExpanded || showSizePicker) return CARD_HEIGHT_EXPANDED;
        return CARD_HEIGHT;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${getBaseURL()}/backend/seasonal-drinks/`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!response.ok) {
                    setData([]);
                    return;
                }
                const drinks = await response.json();
                if (!Array.isArray(drinks)) {
                    setData([]);
                    return;
                }
                const parsedDrinks = drinks.map((drink) => ({
                    id:          drink.id,
                    name:        drink.name,
                    description: drink.description,
                    imageUrl:    drink.image_url,
                    price:       drink.price,
                    soda:        drink.soda,
                    syrups:      drink.syrups || [],
                    addIns:      drink.add_ins || [],
                }));
                setData(parsedDrinks);
            } catch {
                setData([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddToCart = async (item, size) => {
        if (readOnly) {
            Alert.alert(
                'Sign in required',
                'Please sign in to add drinks to your cart.',
                [
                    { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
            return;
        }

        setAddingId(item.id);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const cartList = await AsyncStorage.getItem('checkoutList');
            const currentList = cartList ? JSON.parse(cartList) : [];

            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Token ${token}`;
            }

            const response = await fetch(`${getBaseURL()}/backend/drinks/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    Name: item.name,
                    SodaUsed: [item.soda],
                    SyrupsUsed: item.syrups,
                    AddIns: item.addIns,
                    Price: item.price,
                    Size: size,
                    Ice: 'regular',
                    User_Created: true,
                }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const created = await response.json();
            const updatedList = [...currentList, created.DrinkID];
            await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));

            setShowSizePicker(false);
            setSuccessId(item.id);
            setTimeout(() => setSuccessId(null), 2000);
        } catch (error) {
            console.log('SeasonalCarousel add-to-cart error:', error);
            Alert.alert('Could not add to cart', 'Please try again.');
        } finally {
            setAddingId(null);
        }
    };

    const renderItem = ({ item }) => {
        const showSize = showSizePicker;
        const selectedSize = selectedSizes[item.id];
        const isAdding = addingId === item.id;
        const justAdded = successId === item.id;

        return (
            <View style={styles.card}>
                {/* Image */}
                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.image} />
                ) : (
                    <Image source={require('../../assets/temp-carousel-drink.png')} style={styles.image} />
                )}

                {/* Name + Price row */}
                <View style={styles.headerRow}>
                    <Text style={styles.drinkName}>{item.name}</Text>
                    <Text style={styles.drinkPrice}>${item.price.toFixed(2)}</Text>
                </View>

                {/* Description */}
                <Text style={styles.drinkDescription} numberOfLines={2}>
                    {item.description}
                </Text>

                {/* Expanded ingredients */}
                {isExpanded && (
                    <View style={styles.ingredientsBlock}>
                        <Text style={styles.ingredientLabel}>
                            Base: <Text style={styles.ingredientValue}>{item.soda}</Text>
                        </Text>
                        {item.syrups.length > 0 && (
                            <Text style={styles.ingredientLabel}>
                                Syrups: <Text style={styles.ingredientValue}>{item.syrups.join(', ')}</Text>
                            </Text>
                        )}
                        {item.addIns.length > 0 && (
                            <Text style={styles.ingredientLabel}>
                                Add-ins: <Text style={styles.ingredientValue}>{item.addIns.join(', ')}</Text>
                            </Text>
                        )}
                    </View>
                )}

                {/* Action row */}
                {!showSize ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.detailsButton}
                            onPress={() => setIsExpanded(prev => !prev)}
                        >
                            <Text style={styles.detailsButtonText}>{isExpanded ? 'Hide' : 'Details'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.addButton, justAdded && styles.addButtonSuccess]}
                            onPress={() => {
                                if (readOnly) {
                                    Alert.alert('Sign in required', 'Please sign in to add drinks to your cart.',
                                        [{ text: 'Sign In', onPress: () => navigation.navigate('Auth') },
                                         { text: 'Cancel', style: 'cancel' }]);
                                    return;
                                }
                                setShowSizePicker(true);
                            }}
                        >
                            <Text style={styles.addButtonText}>{justAdded ? 'Added!' : 'Add to Cart'}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* Size picker mode */
                    <View>
                        <Text style={styles.sizeLabel}>Choose a size:</Text>
                        <View style={styles.sizeRow}>
                            {['16oz', '24oz', '32oz'].map(size => (
                                <TouchableOpacity
                                    key={size}
                                    style={[styles.sizeOption, selectedSize === size && styles.sizeOptionSelected]}
                                    onPress={() => setSelectedSizes(prev => ({ ...prev, [item.id]: size }))}
                                >
                                    <Text style={[styles.sizeOptionText, selectedSize === size && styles.sizeOptionSelectedText]}>
                                        {size}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.sizeConfirmRow}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowSizePicker(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, (!selectedSize || isAdding) && styles.confirmButtonDisabled]}
                                onPress={() => selectedSize && handleAddToCart(item, selectedSize)}
                                disabled={!selectedSize || isAdding}
                            >
                                <Text style={styles.confirmButtonText}>
                                    {isAdding ? 'Adding...' : 'Confirm'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.wrapper, { height: getCardHeight() }]} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
            {isLoading ? (
                <Text style={styles.emptyText}>Loading seasonal drinks...</Text>
            ) : data.length === 0 ? (
                <Text style={styles.emptyText}>No seasonal drinks available.</Text>
            ) : (
                <Carousel
                    width={containerWidth}
                    height={getCardHeight()}
                    autoPlay={true}
                    autoPlayInterval={4000}
                    scrollAnimationDuration={800}
                    data={data}
                    renderItem={renderItem}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        margin: 10,
        shadowColor: '#FF2E63',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    image: {
        width: '100%',
        height: 110,
        borderRadius: 8,
        resizeMode: 'cover',
        marginBottom: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    drinkName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A2E',
        flex: 1,
        marginRight: 8,
    },
    drinkPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FF2E63',
    },
    drinkDescription: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 10,
        lineHeight: 17,
    },
    ingredientsBlock: {
        backgroundColor: '#F0FDFC',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#08D9D6',
    },
    ingredientLabel: {
        fontSize: 12,
        color: '#374151',
        marginBottom: 3,
        fontWeight: '600',
    },
    ingredientValue: {
        fontWeight: '400',
        color: '#6B7280',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    detailsButton: {
        flex: 0.4,
        borderWidth: 1,
        borderColor: '#08D9D6',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    detailsButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#08D9D6',
    },
    addButton: {
        flex: 0.6,
        backgroundColor: '#FF2E63',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    addButtonSuccess: {
        backgroundColor: '#10B981',
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    sizeLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 6,
        textAlign: 'center',
    },
    sizeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    sizeOption: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    sizeOptionSelected: {
        borderColor: '#FF2E63',
        backgroundColor: '#FFF0F3',
    },
    sizeOptionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    sizeOptionSelectedText: {
        color: '#FF2E63',
    },
    sizeConfirmRow: {
        flexDirection: 'row',
        gap: 8,
    },
    cancelButton: {
        flex: 0.4,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    confirmButton: {
        flex: 0.6,
        backgroundColor: '#FF2E63',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: '#F9A8B4',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 14,
    },
});

export default SeasonalCarousel;
