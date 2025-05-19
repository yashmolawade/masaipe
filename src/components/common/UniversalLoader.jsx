import React from "react";
import { useTheme } from "../../context/ThemeContext";
import "./UniversalLoader.css";

const UniversalLoader = ({ text = "Loading..." }) => {
  const { darkMode } = useTheme();
  return (
    <div
      className="universal-loader-overlay"
      data-theme={darkMode ? "dark" : "light"}
    >
      <div className="universal-loader-container">
        <div className="spinner-box">
          <div className="blue-orbit"></div>
          <div className="green-orbit"></div>
          <div className="red-orbit"></div>
          <div className="white-orbit"></div>
          <div className="w-ball"></div>
        </div>
        <div className="universal-loader-text">{text}</div>
      </div>
    </div>
  );
};

export default UniversalLoader;
