// src/components/common/EcoTechLogo.jsx
import React from "react";
import { Link } from "react-router-dom";

const EcoTechLogo = ({ size = 40, showText = true, className = "", linkTo = "/" }) => {
  const logoContent = (
    <div className={`ecotech-logo ${className}`} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      {/* SVG Logo - Leaf + Circuit */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Leaf shape */}
        <path
          d="M20 4C20 4 12 10 8 16C4 22 6 30 12 34C18 38 26 36 30 30C34 24 32 16 28 12C24 8 20 4 20 4Z"
          fill="#22c55e"
          fillOpacity="0.9"
        />
        {/* Circuit lines inside leaf */}
        <path
          d="M16 18L20 14L24 18M20 14V22M20 22L16 26M20 22L24 26"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Tech dots */}
        <circle cx="14" cy="20" r="1.5" fill="white" />
        <circle cx="26" cy="20" r="1.5" fill="white" />
        <circle cx="20" cy="12" r="1.5" fill="white" />
      </svg>
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
          <span style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary, #1a1f3a)" }}>
            EcoTech
          </span>
          <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-secondary, #64748b)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Store
          </span>
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} style={{ textDecoration: "none" }}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};

export default EcoTechLogo;
