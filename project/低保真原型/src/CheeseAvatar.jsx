import React from 'react';
import './cheese-assistant.css';
import './cheese-station.css';

/** The assistant's visual identity; its existing product name is supplied by callers. */
export default function CheeseAvatar({size = 32, sleeping = false, className = '', ...props}) {
  const source = sleeping ? 'q-rest.png' : 'q-avatar.png';
  return <img className={`cheese-avatar ${className}`} src={`/mascot/${source}`} width={size} height={size} alt="" aria-hidden="true" draggable="false" decoding="async" {...props}/>;
}

/** Approved illustration poses stay out of icon slots and never carry UI copy. */
export function CheesePose({pose = 'think', width = 104, height = 116, className = '', ...props}) {
  const source = {think:'q-perch',read:'q-read',rest:'q-rest',note:'q-note',track:'q-track',perch:'q-perch',welcome:'q-avatar'}[pose] || pose;
  return <img className={`cheese-pose ${className}`} data-cheese-pose={source} src={`/mascot/${source}.png`} width={width} height={height} alt="" aria-hidden="true" draggable="false" decoding="async" loading="lazy" {...props}/>;
}
