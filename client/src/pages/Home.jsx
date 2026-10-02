import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, BookOpen, CalendarDays, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { PublicSiteFooter, PublicSiteHeader } from "../components/PublicSiteChrome";
import CollegeLogo from "../components/CollegeLogo";
import "./Home.css";

const sections = [
  { id: "college-information", title: "College Information", detail: "Find useful college information through the chatbot.", icon: BookOpen, href: "/chatbot" },
  { id: "department-support", title: "Department Support", detail: "Support for CSE and Electronics.", icon: GraduationCap, href: "/departments" },
  { id: "verified-information", title: "Verified Information", detail: "Answers are based on college information available to the chatbot.", icon: BadgeCheck, href: "/about" },
];

export default function Home() {
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    let active = true;
    api.get("/health")
      .then(({ data }) => {
        if (active && data?.message) setApiStatus("connected");
        else if (active) setApiStatus("unavailable");
      })
      .catch(() => active && setApiStatus("unavailable"));
    return () => { active = false; };
  }, []);

  return (
    <div className="home-page">
      <PublicSiteHeader />

      <main>
        <section className="home-hero" id="home">
          <div className="home-hero-copy">
            <span className="home-eyebrow"><span /> Student Project · College information assistant</span>
            <h1>College information,<br /><span>easier to find.</span></h1>
            <p className="home-subtitle">AI Assistant for Government Polytechnic Unnao</p>
            <p className="home-description">Your smart college companion for notices, departments, faculty, timetables and more. Answers will be grounded in verified college information.</p>
            <div className="home-actions">
              <Link className="home-primary-button" to="/chatbot">Explore the Chatbot <ArrowRight size={17} /></Link>
              <Link className="home-secondary-button" to="/departments">Explore Departments</Link>
            </div>
            <p className="home-disclaimer">Independent student project by Pritam Giri. This is not an official college service.</p>
          </div>
          <div className="home-hero-card" aria-label="Assistant preview">
              <div className="preview-top"><CollegeLogo className="preview-avatar" /><span><strong>College Chatbot</strong><small>AI Assistant for Government Polytechnic Unnao</small></span><span className={`api-indicator ${apiStatus}`} title={`API ${apiStatus}`} /></div>
            <div className="preview-content">
              <div className="preview-greeting">Namaste! <span>👋</span></div>
              <p>What would you like to know about your college?</p>
              <Link className="preview-question" to="/chatbot?question=What%20are%20the%20latest%20notices%3F"><BookOpen size={16} /> What are the latest notices? <ArrowRight size={14} /></Link>
              <Link className="preview-question" to="/chatbot?question=Show%20me%20the%20CSE%20timetable"><CalendarDays size={16} /> Show me the CSE timetable <ArrowRight size={14} /></Link>
              <Link className="preview-input" to="/chatbot">Ask about your college… <span>↑</span></Link>
            </div>
            <div className="preview-status"><span className={`status-dot ${apiStatus}`} />{apiStatus === "connected" ? "API connected" : apiStatus === "checking" ? "Connecting to API…" : "API unavailable · Start the backend"}</div>
          </div>
        </section>

        <section className="college-about-section" aria-labelledby="college-about-title">
          <div className="college-about-card">
            <div className="college-about-copy">
              <span className="home-section-label">Official College Website</span>
              <h2 id="college-about-title">About Government Polytechnic Unnao</h2>
              <p>
                Government Polytechnic Unnao is a government technical education institution located near Dahi Chowki, NH-25, Kanpur Road, Unnao. The institute was established in 1984 and is affiliated with the Board of Technical Education, Uttar Pradesh (BTEUP) and approved by AICTE.
              </p>
              <p className="college-about-programs-label">Technical education includes:</p>
              <ul className="college-about-programs">
                <li>Computer Science &amp; Engineering</li>
                <li>Electronics Engineering</li>
              </ul>
              <a
                className="college-about-link home-primary-button"
                href="https://www.gpunnao.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit the Government Polytechnic Unnao official website (opens in a new tab)"
              >
                Visit Official Website <span aria-hidden="true">→</span>
              </a>
              <p className="college-about-disclaimer">
                College Chatbot is an independent student project and is not the official college website or operated by Government Polytechnic Unnao.
              </p>
            </div>
          </div>
        </section>

        <section className="home-info" aria-labelledby="info-title">
          <div className="home-section-heading"><span className="home-section-label">COLLEGE INFORMATION</span><h2 id="info-title">Everything you need, in one place.</h2><p>Explore college information and find the right place to start.</p></div>
          <div className="home-card-grid">
            {sections.map(({ id, title, detail, icon: Icon, href }) => <article className="home-info-card" id={id} key={id}><span className="home-info-icon"><Icon size={20} /></span><h3>{title}</h3><p>{detail}</p>{href ? <Link to={href}>Explore <ArrowRight size={14} /></Link> : <a href="#home">Explore <ArrowRight size={14} /></a>}</article>)}
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
