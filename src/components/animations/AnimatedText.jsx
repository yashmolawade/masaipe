import React, { useEffect, useState } from "react";

/**
 * AnimatedLetter
 * Animates a single letter with a 3D effect and staggered entrance.
 * Usecase: For animated headings or text with a 3D pop-in effect.
 */
const AnimatedLetter = ({ letter, delay }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span
      style={{
        display: 'inline-block',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-80px)',
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        marginRight: letter === ' ' ? '0.15em' : '0.01em',
        color: 'inherit',
        willChange: 'transform, opacity'
      }}
    >
      {letter === " " ? "\u00A0" : letter}
    </span>
  );
};

/**
 * AnimatedText
 * Animates a string of text, letter by letter, with 3D effect.
 * Usecase: Drop-in for animated headings or hero text.
 */
export const AnimatedText = ({
  text,
  className = "",
  baseDelay = 0,
  staggerDelay = 50,
  animate = true
}) => {
  if (!animate) {
    return <div className={className} style={{ letterSpacing: '-0.02em' }}>{text}</div>;
  }

  return (
    <div 
      className={className}
      style={{
        display: 'block',
        position: 'relative',
        color: 'inherit',
        letterSpacing: '-0.02em'
      }}
    >
      {text.split("").map((letter, index) => (
        <AnimatedLetter
          key={index}
          letter={letter}
          delay={baseDelay + index * staggerDelay}
        />
      ))}
    </div>
  );
}; 