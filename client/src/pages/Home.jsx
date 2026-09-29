import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, FileText, GraduationCap, MessageCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Home.css";

const navigation = [
  ["Home", "/"],
  ["Departments", "/departments"],
  ["Notices", "/notices"],
  ["Faculty", "/faculty"],
  ["Timetable", "/timetable"],
  ["Chatbot", "/chatbot"],
  ["About", "/about"],
];

const sections = [
  { id: "departments", title: "Departments", detail: "Browse information for CSE, Electronics and other departments as they are added.", icon: GraduationCap, href: "/departments" },
  { id: "notices", title: "Notices", detail: "Browse current college announcements, exam updates and department notices.", icon: FileText, href: "/notices" },
  { id: "faculty", title: "Faculty", detail: "Find department faculty information from the college knowledge base.", icon: Users, href: "/faculty" },
  { id: "timetable", title: "Timetable", detail: "Check class schedules by department and semester when schedules are published.", icon: CalendarDays, href: "/timetable" },
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
      <header className="home-header">
        <Link className="home-brand" to="/" aria-label="PritamChatbot home">
          <span className="home-brand-icon"><MessageCircle size={20} /></span>
          <span>Pritam<span className="home-brand-accent">Chatbot</span></span>
        </Link>
        <nav className="home-nav" aria-label="Main navigation">
          {navigation.map(([label, href]) => <Link key={label} to={href}>{label}</Link>)}
        </nav>
      </header>

      <main>
        <section className="home-hero" id="home">
          <div className="home-hero-copy">
            <span className="home-eyebrow"><span /> Student Project · College information assistant</span>
            <h1>College information,<br /><span>easier to find.</span></h1>
            <p className="home-subtitle">AI Assistant for Government Polytechnic Unnao</p>
            <p className="home-description">Your smart college companion for notices, departments, faculty, timetables and more. Answers will be grounded in verified college information.</p>
            <div className="home-actions">
              <Link className="home-primary-button" to="/chatbot">Explore the chatbot <ArrowRight size={17} /></Link>
              <a className="home-secondary-button" href="#departments">Browse information</a>
            </div>
            <p className="home-disclaimer">Independent student project by Pritam Giri. This is not an official college service.</p>
          </div>
          <div className="home-hero-card" aria-label="Assistant preview">
            <div className="preview-top"><span className="preview-avatar"><MessageCircle size={18} /></span><span><strong>College AI Assistant</strong><small>Information assistant</small></span><span className={`api-indicator ${apiStatus}`} title={`API ${apiStatus}`} /></div>
            <div className="preview-content">
              <div className="preview-greeting">Namaste! <span>👋</span></div>
              <p>What would you like to know about your college?</p>
              <div className="preview-question"><BookOpen size={16} /> What are the latest notices?</div>
              <div className="preview-question"><CalendarDays size={16} /> Show me the CSE timetable</div>
              <div className="preview-input">Ask about your college… <span>↑</span></div>
            </div>
            <div className="preview-status"><span className={`status-dot ${apiStatus}`} />{apiStatus === "connected" ? "API connected" : apiStatus === "checking" ? "Connecting to API…" : "API unavailable · Start the backend"}</div>
          </div>
        </section>

        <section className="home-info" aria-labelledby="info-title">
          <div className="home-section-heading"><span className="home-section-label">COLLEGE INFORMATION</span><h2 id="info-title">Everything you need, in one place.</h2><p>Explore college information and find the right place to start.</p></div>
          <div className="home-card-grid">
            {sections.map(({ id, title, detail, icon: Icon, href }) => <article className="home-info-card" id={id} key={id}><span className="home-info-icon"><Icon size={20} /></span><h3>{title}</h3><p>{detail}</p>{href ? <Link to={href}>Explore <ArrowRight size={14} /></Link> : <a href="#home">Explore <ArrowRight size={14} /></a>}</article>)}
          </div>
        </section>
      </main>

      <footer className="home-footer"><Link className="home-brand" to="/"><span className="home-brand-icon"><MessageCircle size={17} /></span><span>Pritam<span className="home-brand-accent">Chatbot</span></span></Link><p>Student Project — College AI Assistant · Not an official college service</p><Link to="/about">About this project</Link></footer>
    </div>
  );
}
