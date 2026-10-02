import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import CollegeLogo from "./CollegeLogo";

const navigation = [
  ["Home", "/"],
  ["Departments", "/departments"],
  ["Chatbot", "/chatbot"],
  ["Help", "/help"],
  ["About", "/about"],
];

export function PublicSiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const showThemeToggle = pathname === "/";

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className={`home-header${menuOpen ? " menu-open" : ""}`}>
      <Link className="home-brand" to="/" aria-label="College Chatbot home" onClick={() => setMenuOpen(false)}>
        <CollegeLogo className="home-brand-icon" />
        <span className="home-brand-copy">
          <span className="home-brand-title">College <span className="home-brand-accent">Chatbot</span></span>
          {pathname === "/" && <span className="home-brand-subtitle">AI Assistant for Government Polytechnic Unnao</span>}
        </span>
      </Link>
      <button
        type="button"
        className="home-menu-toggle"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="public-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      {menuOpen && <button type="button" className="home-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      <nav className={`home-nav${menuOpen ? " is-open" : ""}`} id="public-navigation" aria-label="Main navigation">
        {navigation.map(([label, href]) => (
          <NavLink key={label} to={href} end={href === "/"} onClick={() => setMenuOpen(false)}>
            {label}
          </NavLink>
        ))}
        {showThemeToggle && <ThemeToggle className="public-theme-toggle" />}
      </nav>
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="home-footer">
      <Link className="home-brand" to="/">
        <CollegeLogo className="home-brand-icon" />
        <span className="home-brand-copy">
          <span className="home-brand-title">College <span className="home-brand-accent">Chatbot</span></span>
        </span>
      </Link>
      <div className="home-footer-copy">
        <span>© {new Date().getFullYear()} College Chatbot · Developer: Pritam Giri</span>
        <small>Independent student project by Pritam Giri. This is not an official college service.</small>
      </div>
      <nav className="home-footer-links" aria-label="Footer navigation">
        <Link to="/help">Help</Link>
        <Link to="/about">About</Link>
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
      </nav>
    </footer>
  );
}
