import React from "react";
import "./Loader3D.css";

const Loader3D = ({ text = "Loading..." }) => {
  return (
    <div className="loader-container">
      <div className="spinner-box">
        <div className="blue-orbit"></div>
        <div className="green-orbit"></div>
        <div className="red-orbit"></div>
        <div className="white-orbit"></div>
        <div className="w-ball"></div>
      </div>
      <div className="loader-text">{text}</div>
    </div>
  );
};

export default Loader3D;
