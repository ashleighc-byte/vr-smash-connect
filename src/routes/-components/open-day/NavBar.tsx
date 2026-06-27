import { useLocation } from "@tanstack/react-router";
import { COLORS, NAV_LINKS } from "./styles";

export function NavBar() {
  const location = useLocation();

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: COLORS.bg,
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex",
        justifyContent: "center",
        padding: "0 1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 0,
          maxWidth: SIZES.maxWidth,
          width: "100%",
          overflowX: "auto",
        }}
      >
        <a
          href="/"
          style={{
            padding: "0.75rem 1rem",
            color: COLORS.textMuted,
            textDecoration: "none",
            fontSize: "0.8rem",
            fontWeight: 700,
            whiteSpace: "nowrap",
            borderBottom: "2px solid transparent",
            letterSpacing: "0.02em",
          }}
        >
          🏓 Home
        </a>
        {NAV_LINKS.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <a
              key={link.path}
              href={link.path}
              style={{
                padding: "0.75rem 1rem",
                color: isActive ? COLORS.text : COLORS.textMuted,
                textDecoration: "none",
                fontSize: "0.8rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                borderBottom: isActive ? `2px solid ${COLORS.red}` : "2px solid transparent",
                transition: "border-color 0.15s, color 0.15s",
                letterSpacing: "0.02em",
              }}
            >
              {link.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

// Need the SIZES import
import { SIZES } from "./styles";
