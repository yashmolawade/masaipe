import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./Chat.css";

const MESSAGES_PER_PAGE = 50;
const TYPING_TIMEOUT = 2000;

const ChatSection = ({ onUnreadCountChange }) => {
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMessageListOpen, setIsMessageListOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-open chat for mentors
  useEffect(() => {
    if (userData?.role === "mentor") {
      setIsMessageListOpen(true);
    }
  }, [userData?.role]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch available chat partners
  useEffect(() => {
    if (!currentUser || !userData) {
      return;
    }

    const fetchPartners = async () => {
      try {
        setLoading(true);

        const usersRef = collection(db, "users");
        let partnersQuery;

        if (userData.role === "admin") {
          // Admin can chat with all mentors
          partnersQuery = query(
            usersRef,
            where("role", "==", "mentor"),
            orderBy("email")
          );
        } else {
          // Mentors can only chat with admins
          partnersQuery = query(
            usersRef,
            where("role", "==", "admin"),
            orderBy("email")
          );
        }

        const querySnapshot = await getDocs(partnersQuery);

        const partners = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          partners.push({
            id: doc.id,
            email: data.email,
            role: data.role,
            name: data.name || "",
          });
        });

        if (userData.role === "admin") {
          // Show all mentors in dropdown
          setAvailablePartners(partners);
        } else {
          // For mentors, auto-select the first admin
          setAvailablePartners(partners);
          if (partners.length > 0) {
            setSelectedPartnerId(partners[0].id);
            setChatPartner(partners[0]);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching partners:", error);
        setError("Failed to load chat partners: " + error.message);
        setLoading(false);
      }
    };

    fetchPartners();
  }, [currentUser, userData]);

  // Handle chat initialization
  useEffect(() => {
    if (!currentUser || !selectedPartnerId) {
      setLoading(false);
      return;
    }

    const findOrCreateChat = async () => {
      try {
        const chatsQuery = query(
          collection(db, "chats"),
          where("participants", "array-contains", currentUser.uid)
        );

        const chatsSnapshot = await getDocs(chatsQuery);
        let existingChat = null;

        chatsSnapshot.forEach((doc) => {
          const chatData = doc.data();
          if (chatData.participants.includes(selectedPartnerId)) {
            existingChat = { id: doc.id, ...chatData };
          }
        });

        if (existingChat) {
          setChatId(existingChat.id);
          const partner = availablePartners.find(
            (p) => p.id === selectedPartnerId
          );
          setChatPartner(partner);
        } else {
          const newChatRef = await addDoc(collection(db, "chats"), {
            participants: [currentUser.uid, selectedPartnerId],
            createdAt: Date.now(),
          });

          setChatId(newChatRef.id);
          const partner = availablePartners.find(
            (p) => p.id === selectedPartnerId
          );
          setChatPartner(partner);
        }
      } catch (error) {
        console.error("Error with chat:", error);
        setError("Failed to initialize chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    findOrCreateChat();
  }, [currentUser, selectedPartnerId, availablePartners]);

  // Listen for messages and typing status
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "desc"),
      limit(MESSAGES_PER_PAGE)
    );

    const typingRef = doc(db, "chats", chatId);

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .reverse();

      setMessages(messagesData);

      // Calculate unread count and handle notifications
      const unreadMessages = messagesData.filter(
        (msg) => !msg.read && msg.senderId !== currentUser?.uid
      );
      const newUnreadCount = unreadMessages.length;
      setUnreadCount(newUnreadCount);

      // Update unread count in parent component
      if (onUnreadCountChange) {
        onUnreadCountChange(newUnreadCount);
      }

      // Show browser notification for new messages when chat is not open
      if (!isMessageListOpen && unreadMessages.length > 0) {
        const latestUnread = unreadMessages[unreadMessages.length - 1];
        if (latestUnread && Notification.permission === "granted") {
          const senderName = latestUnread.senderName.split("@")[0]; // Get name part of email
          new Notification(`New Message from ${senderName}`, {
            body: latestUnread.text,
            icon: "/logo.png", // Add your app logo path
            badge: "/logo.png", // Add your app logo path
            tag: "chat-notification", // Prevents multiple notifications
            renotify: true, // Shows each new message
          });
        }
      }
    });

    const unsubscribeTyping = onSnapshot(typingRef, (doc) => {
      const data = doc.data();
      if (data?.typing && data.typing !== currentUser?.uid) {
        setPartnerTyping(true);
      } else {
        setPartnerTyping(false);
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [chatId, currentUser, isMessageListOpen, onUnreadCountChange]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Handle typing indicator
  const handleTyping = async () => {
    if (!chatId || !currentUser) return;

    try {
      const typingRef = doc(db, "chats", chatId);
      await updateDoc(typingRef, { typing: currentUser.uid });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(async () => {
        await updateDoc(typingRef, { typing: null });
      }, TYPING_TIMEOUT);
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  // Mark messages as read
  useEffect(() => {
    if (!isMessageListOpen || !chatId || !currentUser) return;

    const markMessagesAsRead = async () => {
      const unreadMessages = messages.filter(
        (msg) => !msg.read && msg.senderId !== currentUser.uid
      );

      for (const message of unreadMessages) {
        try {
          await updateDoc(doc(db, "messages", message.id), { read: true });
        } catch (error) {
          console.error("Error marking message as read:", error);
        }
      }
    };

    markMessagesAsRead();
  }, [isMessageListOpen, messages, chatId, currentUser]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isMessageListOpen) {
      scrollToBottom();
    }
  }, [messages, isMessageListOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!currentUser || !chatId || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);

    const sendMessageWithRetry = async (retryCount = 0) => {
      try {
        const messageDoc = await addDoc(collection(db, "messages"), {
          chatId,
          senderId: currentUser.uid,
          senderName: currentUser.email,
          text: messageText,
          createdAt: Date.now(),
          read: false,
          delivered: false,
        });

        // Mark as delivered
        await updateDoc(doc(db, "messages", messageDoc.id), {
          delivered: true,
        });

        setSendingMessage(false);
        setRetryCount(0);
      } catch (error) {
        console.error("Error sending message:", error);
        if (retryCount < 3) {
          setRetryCount(retryCount + 1);
          setTimeout(() => sendMessageWithRetry(retryCount + 1), 1000);
        } else {
          setError("Failed to send message. Please try again.");
          setSendingMessage(false);
          setRetryCount(0);
        }
      }
    };

    sendMessageWithRetry();
  };

  const toggleMessageList = () => {
    setIsMessageListOpen(!isMessageListOpen);
    setError(null);
  };

  if (loading) {
    return <div className="chat-loading">Loading chat...</div>;
  }

  return (
    <div className="chat-section">
      {error && <div className="chat-error">{error}</div>}
      <div className="chat-header">
        {userData?.role === "admin" && (
          <div className="partner-selector">
            <select
              style={{ backgroundColor: "black", color: "white" }}
              value={selectedPartnerId || ""}
              onChange={(e) => {
                const partnerId = e.target.value;
                setSelectedPartnerId(partnerId);
                const partner = availablePartners.find(
                  (p) => p.id === partnerId
                );
                setChatPartner(partner);
              }}
            >
              <option
                style={{ backgroundColor: "black", color: "white" }}
                value=""
              >
                Select a mentor to chat with
              </option>
              {availablePartners.map((partner) => (
                <option
                  style={{ backgroundColor: "black", color: "white" }}
                  key={partner.id}
                  value={partner.id}
                >
                  {partner.name
                    ? `${partner.name} (${partner.email})`
                    : partner.email}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="chat-header-content" onClick={toggleMessageList}>
          <h3>
            {chatPartner
              ? `Chat with ${
                  userData?.role === "admin"
                    ? chatPartner.name
                      ? `${chatPartner.name} (${chatPartner.email})`
                      : chatPartner.email
                    : "Admin"
                }`
              : userData?.role === "admin"
              ? "Select a mentor to start chatting"
              : "Chat with Admin"}
          </h3>
          <p>Send messages about payouts, sessions, and other inquiries</p>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
      </div>

      {isMessageListOpen && (
        <div className="messages-container">
          {!selectedPartnerId && userData?.role === "admin" ? (
            <div className="empty-chat">
              <div className="empty-chat-icon">👥</div>
              <p>Please select a mentor to start chatting</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-chat-icon">💬</div>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${
                    message.senderId === currentUser?.uid ? "sent" : "received"
                  }`}
                >
                  <div className="message-content">
                    <p>{message.text}</p>
                    <span className="message-time">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {message.senderId === currentUser?.uid && (
                        <span
                          className={`message-status ${
                            message.read
                              ? "read"
                              : message.delivered
                              ? "delivered"
                              : "pending"
                          }`}
                        >
                          {message.read ? "✓✓" : message.delivered ? "✓" : "·"}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
              {partnerTyping && (
                <div className="typing-indicator">
                  <span>typing</span>
                  <span className="dots">...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}

      {isMessageListOpen && (
        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder={
              !selectedPartnerId && userData?.role === "admin"
                ? "Select a mentor to start messaging"
                : sendingMessage
                ? "Sending..."
                : "Type your message..."
            }
            disabled={
              (!selectedPartnerId && userData?.role === "admin") ||
              sendingMessage
            }
            required
          />
          <button
            type="submit"
            disabled={
              (!selectedPartnerId && userData?.role === "admin") ||
              sendingMessage ||
              !newMessage.trim()
            }
            className={sendingMessage ? "sending" : ""}
          >
            {sendingMessage ? "Sending..." : "Send"}
          </button>
        </form>
      )}
    </div>
  );
};

export default ChatSection;
