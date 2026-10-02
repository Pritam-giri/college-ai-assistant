import { Code2, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicSiteFooter, PublicSiteHeader } from "../components/PublicSiteChrome";
import { CONTACT_EMAIL, CONTACT_LINKS } from "../config/contact";
import "./Home.css";
import "./Help.css";

const supportLinks = [
  { label: "LinkedIn", href: CONTACT_LINKS.linkedin, icon: Globe },
  { label: "GitHub", href: CONTACT_LINKS.github, icon: Code2 },
];

export default function Help() {
  return (
    <div className="home-page help-page">
      <PublicSiteHeader />

      <main className="help-main">
        <header className="help-intro">
          <span className="home-section-label">College Chatbot Support</span>
          <h1>Need Help?</h1>
          <p>Find answers to common questions or get help with the College Chatbot.</p>
        </header>

        <div className="help-sections">
          <section className="help-card">
            <h2>Using the Chatbot</h2>
            <p>Ask questions naturally, or choose a suggested question to get started.</p>
            <p>You can ask about CSE, Electronics, or college-wide information. Sign in to access internal college information.</p>
            <Link className="help-chat-link" to="/chatbot">Open the College Chatbot</Link>
          </section>

          <section className="help-card">
            <h2>Information Not Found</h2>
            <p>If the chatbot cannot find verified information, please contact the college administration for official information.</p>
            <span className="help-contact-note">College information and official support are handled by the college administration.</span>
          </section>

          <section className="help-card">
            <h2>Technical Support</h2>
            <p>For website or project technical issues, contact the developer:</p>
            <strong className="help-developer-name">Pritam Giri</strong>
            <span className="help-contact-note">Independent project developer; not college administration or an official college representative.</span>
            <div className="help-email">
              <span>Email</span>
              <a href={CONTACT_LINKS.email}>{CONTACT_EMAIL}</a>
            </div>
            <div className="help-contact-links">
              {supportLinks.map(({ label, href, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer">
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
