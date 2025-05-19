import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaCalculator, FaComments, FaHistory, FaReceipt } from "react-icons/fa";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./LandingPage.css";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import ChatAssistant from "../components/ChatAssistant"; // Import the Chat Assistant
import { AnimatedText } from "../components/animations/AnimatedText";
import Footer from "../components/common/Footer";

const LandingPage = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { currentUser } = useAuth();

  const sectionIds = [
    "hero",
    "carousel",
    "cta",
    "features",
    "benefits",
    "about",
    "contact",
    "footer",
  ];

  const sectionRefs = sectionIds.reduce((acc, id) => {
    acc[id] = useRef();
    return acc;
  }, {});

  const [inView, setInView] = useState({});

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setInView((prev) => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting,
          }));
        });
      },
      { threshold: 0.15 }
    );
    sectionIds.forEach((id) => {
      if (sectionRefs[id].current) {
        observer.observe(sectionRefs[id].current);
      }
    });
    return () => {
      sectionIds.forEach((id) => {
        if (sectionRefs[id].current) {
          observer.unobserve(sectionRefs[id].current);
        }
      });
    };
  }, []);

  const features = [
    {
      icon: <FaCalculator />,
      title: "Automated Payouts",
      description:
        "Effortlessly calculate payouts based on session types, durations, and custom rates.",
    },
    {
      icon: <FaComments />,
      title: "Secure Chat",
      description:
        "Communicate securely with mentors to resolve payout queries and provide support.",
    },
    {
      icon: <FaHistory />,
      title: "Audit Logs",
      description:
        "Maintain transparency with detailed logs of all payout modifications and actions.",
    },
    {
      icon: <FaReceipt />,
      title: "Receipt Generation",
      description:
        "Generate and share structured receipts with mentors instantly.",
    },
  ];

  const carouselItems = [
    {
      image:
        "https://plus.unsplash.com/premium_photo-1661963546072-e8c50e7da1f8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      caption: "Empower Mentors with Seamless Sessions",
    },
    {
      image:
        "https://images.unsplash.com/photo-1613347761493-4060c969cd28?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      caption: "Monitor Payouts with an Intuitive Dashboard",
    },
    {
      image:
        "https://plus.unsplash.com/premium_photo-1679784204551-013181bb687f?q=80&w=1920&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      caption: "Generate Receipts Instantly",
    },
    {
      image:
        "https://images.unsplash.com/photo-1724204401208-6349fc373543?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      caption: "Communicate Securely with Mentors",
    },
  ];

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          arrows: false,
        },
      },
    ],
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="container">
          <div className="logo">
            <Link to={currentUser ? "/dashboard" : "/"}>
              <span className="logo-text">
                masa<span className="gradient-letter">i</span>pe
              </span>
              <span className="registered">®</span>
            </Link>
          </div>
          <nav>
            <ul className="nav-links">
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
              {currentUser && (
                <li>
                  <Link to="/dashboard">Dashboard</Link>
                </li>
              )}
              <li>
                <button onClick={toggleDarkMode} className="theme-toggle">
                  {darkMode ? <MdLightMode /> : <MdDarkMode color="black" />}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="hero"
        ref={sectionRefs.hero}
        className={`hero scroll-animate${inView.hero ? " in-view" : ""}`}
      >
        <div className="hero-content">
          <h1 className="mb-8">
            <AnimatedText
              text="No More Payment Hassles"
              className="text-6xl md:text-7xl lg:text-8xl font-bold leading-tight text-[var(--color-text-primary)]"
              baseDelay={300}
              staggerDelay={40}
              animate={true}
            />
            <div style={{ color: "#ff0000", marginTop: "2rem" }}>
              <AnimatedText
                text="Just Happy Mentors"
                className="text-5xl md:text-6xl lg:text-7xl font-semibold block"
                animate={false}
              />
            </div>
          </h1>
          <div className="max-w-3xl mx-auto mt-16">
            {" "}
            <AnimatedText
              text="A seamless platform connecting mentors with learners, eliminating payment-friction and maximizing meaningful connections."
              className="text-xl md:text-2xl text-[var(--color-text-secondary)]"
              baseDelay={1200}
              staggerDelay={15}
              animate={true}
            />{" "}
          </div>
        </div>
      </section>

      {/* Carousel Section */}
      <section
        className={`carousel scroll-animate${
          inView.carousel ? " in-view" : ""
        }`}
        id="carousel"
        ref={sectionRefs.carousel}
      >
        <div className="container">
          <Slider {...sliderSettings}>
            {carouselItems.map((item, index) => (
              <div key={index} className="carousel-item">
                <img src={item.image} alt={item.caption} />
                <div className="carousel-caption">
                  <p>{item.caption}</p>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </section>

      {/* CTA Section for Login/Signup - Hidden for logged-in users */}
      {!currentUser && (
        <section
          className={`cta scroll-animate${inView.cta ? " in-view" : ""}`}
          id="cta"
          ref={sectionRefs.cta}
        >
          <div className="container">
            <p style={{ fontSize: "20px", marginTop: "5rem" }}>
              Ready to get started?{" "}
              <Link to="/login" style={{ textDecoration: "underline" }}>
                Log in
              </Link>{" "}
              to manage your payouts or{" "}
              <Link to="/register" style={{ textDecoration: "underline" }}>
                Sign Up
              </Link>{" "}
              to join MasaiPe today!
            </p>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section
        id="features"
        ref={sectionRefs.features}
        className={`features scroll-animate${
          inView.features ? " in-view" : ""
        }`}
      >
        <div className="container">
          <h2 style={{ fontSize: "30px" }}>Key Features</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section
        className={`benefits scroll-animate${
          inView.benefits ? " in-view" : ""
        }`}
        id="benefits"
        ref={sectionRefs.benefits}
      >
        <div className="container">
          <h2>Why Choose MasaiPe?</h2>
          <ul>
            <li>Simplify payout management for your EdTech platform.</li>
            <li>Ensure accuracy and transparency in mentor payments.</li>
            <li>Enhance communication with secure, one-to-one chat.</li>
            <li>
              Save time with automated calculations and receipt generation.
            </li>
          </ul>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        ref={sectionRefs.about}
        className={`about scroll-animate${inView.about ? " in-view" : ""}`}
      >
        <div className="container">
          <h2>About MasaiPe</h2>
          <p>
            MasaiPe is a payout automation system designed specifically for
            EdTech platforms. Our mission is to simplify the process of managing
            mentor payments, ensuring accuracy, transparency, and efficiency.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        ref={sectionRefs.contact}
        className={`contact scroll-animate${inView.contact ? " in-view" : ""}`}
      >
        <div className="container">
          <h2>Contact Us</h2>
          <p>
            Have questions or need support? Reach out to us at{" "}
            <a href="mailto:support@masaipe.com">support@masaipe.com</a>.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`footer scroll-animate${inView.footer ? " in-view" : ""}`}
        id="footer"
        ref={sectionRefs.footer}
      >
        <div className="container">
          <p>
            © {new Date().getFullYear()} MasaiPe. All rights reserved. |{" "}
            <a href="/privacy">Privacy Policy</a> |{" "}
            <a href="/terms">Terms of Service</a>
          </p>
        </div>
      </footer>
      <Footer />

      {/* Chat Assistant */}
      <div className="chat-assistant">
        <ChatAssistant />
      </div>
    </div>
  );
};

export default LandingPage;
