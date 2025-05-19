import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaComments, FaTimes, FaPaperPlane, FaEllipsisV } from "react-icons/fa";
import { database } from "../firebase/config"; // Import Firebase database
import { ref, get, set, push } from "firebase/database"; // Firebase Realtime Database functions
import "./ChatAssistant.css";

const ChatAssistant = () => {
  const getInitialState = () => {
    const savedState = localStorage.getItem("chatAssistantState");
    if (savedState) {
      return JSON.parse(savedState);
    }
    return {
      step: 0,
      name: "",
      email: "",
      messages: [
        {
          sender: "bot",
          text: "Hello! I'm here to assist you. May I have your name, please?",
        },
      ],
      showAssistanceButtons: false,
    };
  };

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(getInitialState().step);
  const [name, setName] = useState(getInitialState().name);
  const [email, setEmail] = useState(getInitialState().email);
  const [messages, setMessages] = useState(getInitialState().messages);
  const [userInput, setUserInput] = useState("");
  const [showAssistanceButtons, setShowAssistanceButtons] = useState(
    getInitialState().showAssistanceButtons
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const state = { step, name, email, messages, showAssistanceButtons };
    localStorage.setItem("chatAssistantState", JSON.stringify(state));
    scrollToBottom();
  }, [step, name, email, messages, showAssistanceButtons]);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setShowTooltip(true), 4000);
      return () => clearTimeout(timer);
    } else {
      setShowTooltip(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let hideTimer;
    if (showTooltip) {
      hideTimer = setTimeout(() => setShowTooltip(false), 3000);
    }
    return () => clearTimeout(hideTimer);
  }, [showTooltip]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (menuOpen) setMenuOpen(false);
  };

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: userInput }]);

    if (step === 0) {
      if (userInput.trim() === "") {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Please enter a valid name." },
        ]);
        return;
      }
      setName(userInput);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `Nice to meet you, ${userInput}! Can I have your email, please?`,
        },
      ]);
      setStep(1);
    } else if (step === 1) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userInput)) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Please enter a valid email address." },
        ]);
        return;
      }
      setEmail(userInput);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `
            Thank you! How can I assist you today? Please choose an option:
            <ul>
              <li>1. Help with Login/Signup</li>
              <li>2. About Us</li>
              <li>3. Contact Us</li>
            </ul>
          `,
        },
      ]);
      setStep(2);
    } else if (step === 2) {
      const choice = userInput.trim();
      if (choice === "1") {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: 'I can help with login or signup! You can:<br>- <a href="/login">Login here</a><br>- <a href="/register">Sign up here</a><br>Would you like more assistance?',
          },
        ]);
        setShowAssistanceButtons(false);
      } else if (choice === "2") {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: 'MasaiPE is a payout automation system designed for EdTech platforms. Learn more in the <a href="#about">About section</a>. Anything else I can help with?',
          },
        ]);
        setShowAssistanceButtons(false);
      } else if (choice === "3") {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: 'You can reach us at <a href="mailto:support@masaipe.com">support@masaipe.com</a>. Check the <a href="#contact">Contact section</a> for more details. Need further assistance?',
          },
        ]);
        setShowAssistanceButtons(true);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `
              Please choose a valid option (1, 2, or 3):
              <ul>
                <li>1. Help with Login/Signup</li>
                <li>2. About Us</li>
                <li>3. Contact Us</li>
              </ul>
            `,
          },
        ]);
        setShowAssistanceButtons(false);
      }
    }

    setUserInput("");
  };

  const handleAssistanceResponse = async (needsMore) => {
    if (needsMore) {
      try {
        // Check for duplicates in Firebase
        const queriesRef = ref(database, "pendingQueries");
        const snapshot = await get(queriesRef);
        let emailExists = false;

        if (snapshot.exists()) {
          const queries = snapshot.val();
          emailExists = Object.values(queries).some(
            (query) => query.email === email
          );
        }

        if (!emailExists) {
          // Save to Firebase if email doesn't exist
          const newQueryRef = push(queriesRef);
          await set(newQueryRef, {
            name: name,
            email: email,
            status: "Not Contacted",
            timestamp: Date.now(),
          });
        }

        setMessages((prev) => [
          ...prev,
          { sender: "user", text: "Yes" },
          {
            sender: "bot",
            text: `Our representative will reach out to you shortly via your email (${email}).`,
          },
        ]);
      } catch (error) {
        console.error("Error saving to Firebase:", error);
        setMessages((prev) => [
          ...prev,
          { sender: "user", text: "Yes" },
          {
            sender: "bot",
            text: "Sorry, there was an issue saving your request. Please try again later.",
          },
        ]);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: "No" },
        {
          sender: "bot",
          text: "Okay, feel free to reach out if you need more help!",
        },
      ]);
    }
    setShowAssistanceButtons(false);
  };

  const handleEndChat = () => {
    setIsOpen(false);
    setMenuOpen(false);
  };

  const handleRestartChat = () => {
    localStorage.removeItem("chatAssistantState");
    setStep(0);
    setName("");
    setEmail("");
    setMessages([
      {
        sender: "bot",
        text: "Hello! I'm here to assist you. May I have your name, please?",
      },
    ]);
    setShowAssistanceButtons(false);
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="chat-assistant">
      <div style={{ position: "relative", display: "inline-block" }}>
        {showTooltip && !isOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "80px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#222",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "16px",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 1001,
              opacity: 0.95,
            }}
          >
            Need help?
          </div>
        )}
        <button className="chat-toggle" onClick={handleToggle}>
          {isOpen ? <FaTimes /> : <FaComments />}
        </button>
      </div>
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <button className="menu-toggle" onClick={toggleMenu}>
              <FaEllipsisV />
            </button>
            {menuOpen && (
              <div className="chat-menu">
                <button onClick={handleEndChat} className="menu-item">
                  End Chat
                </button>
                <button onClick={handleRestartChat} className="menu-item">
                  Restart Chat
                </button>
              </div>
            )}
          </div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chat-message ${
                  message.sender === "bot" ? "bot-message" : "user-message"
                }`}
                dangerouslySetInnerHTML={{ __html: message.text }}
              />
            ))}
            {showAssistanceButtons && (
              <div className="assistance-buttons">
                <button
                  className="assistance-btn yes-btn"
                  onClick={() => handleAssistanceResponse(true)}
                >
                  Yes
                </button>
                <button
                  className="assistance-btn no-btn"
                  onClick={() => handleAssistanceResponse(false)}
                >
                  No
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {!showAssistanceButtons && (
            <form onSubmit={handleSubmit} className="chat-input-form">
              <input
                type="text"
                value={userInput}
                onChange={handleInputChange}
                placeholder={
                  step === 0
                    ? "Enter your name..."
                    : step === 1
                    ? "Enter your email..."
                    : "Enter 1, 2, or 3..."
                }
                className="chat-input"
              />
              <button type="submit" className="chat-submit-btn">
                <FaPaperPlane />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;
