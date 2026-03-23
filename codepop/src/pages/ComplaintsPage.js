import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import NavBar from '../components/NavBar';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { getBaseURL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';

// Quick reply options
const QUICK_REPLIES = [
  'Report an issue with my order',
  'Track my delivery',
  'Request a refund',
];

const ComplaintsPage = () => {
  const { colors } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [messages, setMessages] = useState([
    { text: "Hi! I'm tonic. How can I help you?", isBot: true },
  ]);
  const [refund_phase, setRefundPhase] = useState('none');
  const [wrong_drink_phase, setWrongDrinkPhase] = useState('none');
  const [order_num, setOrderNum] = useState('none');
  const [drink_nums, setDrinkNums] = useState('none');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const scrollViewRef = useRef();
  const lastUserMessageRef = useRef('');
  const controllerRef = useRef(null);

  // Animated values for typing indicator
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Typing indicator animation
  useEffect(() => {
    if (loading) {
      const animateDot = (anim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ])
        );
      };

      const anim1 = animateDot(dot1Anim, 0);
      const anim2 = animateDot(dot2Anim, 100);
      const anim3 = animateDot(dot3Anim, 200);

      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
        dot1Anim.setValue(0);
        dot2Anim.setValue(0);
        dot3Anim.setValue(0);
      };
    }
  }, [loading]);

  const complaintAI = async (messageOverride = null) => {
    const userRequest = messageOverride || searchText;
    if (userRequest.trim() === '') return;

    lastUserMessageRef.current = userRequest;

    // Add user message
    setMessages((prevMessages) => [
      ...prevMessages,
      { text: userRequest, isBot: false },
    ]);

    setSearchText('');
    setLoading(true);

    // Create AbortController for timeout
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(`${getBaseURL()}/backend/chatbot/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userRequest,
          refund_phase: refund_phase,
          wrong_drink_phase: wrong_drink_phase,
          order_num: order_num,
          drink_nums: drink_nums,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const botResponse = data.responses;
        const response_refund_phase = data.refund_phase;
        const response_wrong_drink_phase = data.wrong_drink_phase;
        setOrderNum(data.order_num);
        setDrinkNums(data.drink_nums);

        // Update state
        if (
          response_refund_phase === 'none' &&
          response_wrong_drink_phase === 'none'
        ) {
          setRefundPhase(null);
          setWrongDrinkPhase(null);
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: botResponse, isBot: true },
          ]);
        } else if (response_wrong_drink_phase === '4') {
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: botResponse, isBot: true },
          ]);

          const orderResponse = await fetch(
            `${getBaseURL()}/backend/orders/${order_num}/`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (orderResponse.ok) {
            const drinksForPost = [];
            const orderData = await orderResponse.json();
            const drinkPromises = orderData.Drinks.map((drink) =>
              getDrinkData(drink)
            );
            const resolvedDrinks = await Promise.all(drinkPromises);
            drinksForPost.push(...resolvedDrinks);

            console.log('Backend complaints:', JSON.stringify(drinksForPost));

            await AsyncStorage.setItem(
              'purchasedDrinks',
              JSON.stringify(drinksForPost)
            );
            await AsyncStorage.setItem('orderNum', order_num.toString());
          }

          setTimeout(() => {
            navigation.navigate('PostCheckout');
          }, 2000);
        } else {
          setRefundPhase(response_refund_phase);
          setWrongDrinkPhase(response_wrong_drink_phase);
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: botResponse, isBot: true },
          ]);
        }
      } else {
        throw new Error('Failed to fetch response from chatbot');
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            text: "I'm having trouble connecting right now. Please try again or contact support.",
            isBot: true,
            isError: true,
          },
        ]);
      } else {
        console.error('Error in chatbot response:', error);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            text: "I'm having trouble understanding right now. Please try again or contact support.",
            isBot: true,
            isError: true,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getDrinkData = async (drinkID) => {
    try {
      const drinkData = await fetch(`${getBaseURL()}/backend/drinks/${drinkID}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!drinkData.ok) {
        console.error(`Error fetching drink data: ${drinkData.status}`);
        return null;
      }

      return await drinkData.json();
    } catch (error) {
      console.error('Error getting drink:', error);
      return null;
    }
  };

  const handleRetry = () => {
    complaintAI(lastUserMessageRef.current);
  };

  const makeStyles = (colors) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    chatContainer: {
      flex: 1,
    },
    chatContentContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    messageBubbleRow: {
      flexDirection: 'row',
      marginBottom: 12,
      alignItems: 'flex-end',
    },
    botRow: {
      justifyContent: 'flex-start',
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    messageBubble: {
      maxWidth: '75%',
      padding: 12,
      borderRadius: 12,
    },
    botBubble: {
      backgroundColor: colors.surface2,
    },
    userBubble: {
      backgroundColor: colors.primary,
    },
    errorBubble: {
      backgroundColor: '#FEE2E2',
    },
    botAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 8,
      backgroundColor: colors.border,
    },
    botAvatarPlaceholder: {
      width: 40,
      height: 40,
      marginLeft: 8,
    },
    messageText: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 21,
    },
    botMessageText: {
      color: colors.textPrimary,
    },
    typingContainer: {
      flexDirection: 'row',
      marginBottom: 12,
      alignItems: 'center',
    },
    typingBubble: {
      backgroundColor: colors.surface2,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    typingDot: {
      fontSize: 18,
      color: colors.textMuted,
    },
    retryButton: {
      marginTop: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    quickRepliesContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quickRepliesLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
      fontWeight: '600',
    },
    quickReplyButton: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      marginBottom: 8,
    },
    quickReplyText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    searchInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      maxHeight: 100,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.primary,
      marginLeft: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.emptyIcon,
    },
    navBarSpace: {
      height: 80,
    },
  });

  const styles = makeStyles(colors);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, loading]);

  // Render typing indicator
  const TypingIndicator = () => (
    <View style={styles.typingContainer}>
      <Image
        source={require('../../assets/tonic.png')}
        style={styles.botAvatar}
      />
      <View style={styles.typingBubble}>
        <Animated.Text
          style={[
            styles.typingDot,
            { opacity: dot1Anim },
          ]}
        >
          •
        </Animated.Text>
        <Animated.Text
          style={[
            styles.typingDot,
            { opacity: dot2Anim, marginLeft: 4 },
          ]}
        >
          •
        </Animated.Text>
        <Animated.Text
          style={[
            styles.typingDot,
            { opacity: dot3Anim, marginLeft: 4 },
          ]}
        >
          •
        </Animated.Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.chatContainer}
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContentContainer}
      >
        {/* Messages */}
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubbleRow,
              message.isBot ? styles.botRow : styles.userRow,
            ]}
          >
            {message.isBot && (
              <Image
                source={require('../../assets/tonic.png')}
                style={styles.botAvatar}
              />
            )}
            <View
              style={[
                styles.messageBubble,
                message.isBot
                  ? message.isError
                    ? styles.errorBubble
                    : styles.botBubble
                  : styles.userBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isBot && styles.botMessageText,
                ]}
              >
                {message.text}
              </Text>

              {/* Error message with retry button */}
              {message.isError && (
                <TouchableOpacity
                  onPress={handleRetry}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
            {!message.isBot && <View style={styles.botAvatarPlaceholder} />}
          </View>
        ))}

        {/* Typing indicator */}
        {loading && <TypingIndicator />}

        {/* Quick reply buttons - only show when messages.length === 1 */}
        {messages.length === 1 && !loading && (
          <View style={styles.quickRepliesContainer}>
            <Text style={styles.quickRepliesLabel}>Quick replies:</Text>
            {QUICK_REPLIES.map((reply, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => complaintAI(reply)}
                style={styles.quickReplyButton}
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Describe your issue..."
          placeholderTextColor={colors.secondaryText}
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          multiline
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => complaintAI()}
          style={[
            styles.sendButton,
            (searchText.trim() === '' || loading) &&
              styles.sendButtonDisabled,
          ]}
          disabled={searchText.trim() === '' || loading}
        >
          <Icon
            name="send"
            size={20}
            color={searchText.trim() === '' || loading ? colors.textMuted : '#fff'}
          />
        </TouchableOpacity>
      </View>

      {/* NavBar spacing */}
      <View style={styles.navBarSpace} />
      <NavBar />
    </View>
  );
};

export default ComplaintsPage;
