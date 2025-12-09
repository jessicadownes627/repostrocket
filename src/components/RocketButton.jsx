import React from "react";
import "../styles/rocketbutton.css";

export default function RocketButton({ onClick }) {
  return (
    <button className="rocketlaunch-btn" onClick={onClick}>
      Rocket Launch
    </button>
  );
}
