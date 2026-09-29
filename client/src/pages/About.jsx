import { useEffect } from "react";
import { Link } from "react-router-dom";
import PublicAppLink from "../components/PublicAppLink";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Users,
  Bell,
  FileText,
  HelpCircle,
  FlaskConical,
  BookOpenCheck,
  Code,
  Mail,
} from "lucide-react";

export default function About() {
  useEffect(() => {
    document.title = "About | College AI Assistant";
  }, []);

  return (
    <div className="legal-page about-page">
      <div className="legal-container">
        <header className="legal-header">
          <PublicAppLink className="legal-back-link" back />
          <div className="legal-brand">
            <div className="legal-icon">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1>About College AI Assistant</h1>
              <p>Government Polytechnic Unnao</p>
            </div>
          </div>
        </header>

        <main className="legal-content">
          <section className="legal-section">
            <h2>Project Overview</h2>
            <p>
              <strong>PritamChatbot</strong> is an independent student project by Pritam Giri. It is an AI Assistant for Government Polytechnic Unnao information, and is not an official college service.
            </p>
            <p>
              The project is designed to organize verified timetables, syllabus details, faculty records, notices, laboratory practicals, and assignments when those records are available. It does not invent missing college information.
            </p>
          </section>

          <section className="legal-section">
            <h2>Core Features</h2>
            <div className="about-features-grid">
              <div className="about-feature-item">
                <Bell size={18} />
                <div>
                  <strong>Verified Notice Records</strong>
                  <p>College and department notices appear when they have been added to the project.</p>
                </div>
              </div>

              <div className="about-feature-item">
                <Calendar size={18} />
                <div>
                  <strong>Weekly Timetable</strong>
                  <p>Semester-specific lecture and lab schedules with classroom allocations.</p>
                </div>
              </div>

              <div className="about-feature-item">
                <BookOpen size={18} />
                <div>
                  <strong>Curriculum &amp; Syllabus</strong>
                  <p>Subject descriptions, unit topics, and reference curriculum documents.</p>
                </div>
              </div>

              <div className="about-feature-item">
                <Users size={18} />
                <div>
                  <strong>Faculty Directory</strong>
                  <p>Department faculty profiles, designations, and contact channels.</p>
                </div>
              </div>

              <div className="about-feature-item">
                <FlaskConical size={18} />
                <div>
                  <strong>Lab Practicals</strong>
                  <p>Laboratory experiment guidelines, manual references, and due dates.</p>
                </div>
              </div>

              <div className="about-feature-item">
                <BookOpenCheck size={18} />
                <div>
                  <strong>Course Assignments</strong>
                  <p>Structured semester coursework assignments with clear submission criteria.</p>
                </div>
              </div>

              <div className="about-feature-item">
                <FileText size={18} />
                <div>
                  <strong>Academic Documents</strong>
                  <p>Proforma forms, examination guidelines, and institutional regulations.</p>
                </div>
              </div>

              <div className="about-feature-item">
                <HelpCircle size={18} />
                <div>
                  <strong>Institutional FAQs</strong>
                  <p>Answers to common questions regarding college policies and administrative workflows.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Developer &amp; Institutional Attribution</h2>
            <div className="developer-card">
              <div className="developer-badge">
                <Code size={20} />
              </div>
              <div className="developer-info">
                <h3>Pritam Giri</h3>
                <p className="developer-title">Developer &amp; Maintainer</p>
                <p className="developer-dept">
                  Department of Computer Science &amp; Engineering (CSE), 2nd Year
                </p>
                <p className="developer-batch">Batch 2025 – 2028</p>
                <p className="developer-inst">Government Polytechnic Unnao, Uttar Pradesh</p>

                <div className="developer-links" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                  <a
                    href="mailto:pritamgirics@gmail.com"
                    className="developer-contact-link"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      backgroundColor: "var(--bg-card, rgba(255,255,255,0.06))",
                      color: "var(--text-primary, #f8fafc)",
                      fontSize: "0.86rem",
                      textDecoration: "none",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.08))"
                    }}
                  >
                    <Mail size={14} />
                    <span>pritamgirics@gmail.com</span>
                  </a>

                  <a
                    href="https://www.linkedin.com/in/pritam-giri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="developer-contact-link"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      backgroundColor: "var(--bg-card, rgba(255,255,255,0.06))",
                      color: "var(--text-primary, #f8fafc)",
                      fontSize: "0.86rem",
                      textDecoration: "none",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.08))"
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    <span>LinkedIn</span>
                  </a>

                  <a
                    href="https://github.com/Pritam-giri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="developer-contact-link"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      backgroundColor: "var(--bg-card, rgba(255,255,255,0.06))",
                      color: "var(--text-primary, #f8fafc)",
                      fontSize: "0.86rem",
                      textDecoration: "none",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.08))"
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                    <span>GitHub</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Institutional Support &amp; Contact</h2>
            <div className="legal-contact-box">
              <p><strong>Institution:</strong> Government Polytechnic Unnao, Uttar Pradesh</p>
              <p><strong>Department:</strong> Department of Computer Science &amp; Engineering / Academic Administration</p>
              <p><strong>Support Email:</strong> <a className="institutional-legal-link" href="mailto:gpunnaocollegeassistant@gmail.com">gpunnaocollegeassistant@gmail.com</a></p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Technical Architecture</h2>
            <p>
              The system is built on modern web standards utilizing React, Node.js, Express, and MongoDB, paired with a secure retrieval-augmented AI pipeline grounded strictly in verified institutional records.
            </p>
          </section>
        </main>

        <footer className="legal-footer">
          <p>&copy; {new Date().getFullYear()} College AI Assistant. Government Polytechnic Unnao.</p>
          <div className="legal-footer-links">
            <Link className="institutional-legal-link" to="/privacy-policy">Privacy Policy</Link>
            <Link className="institutional-legal-link" to="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link to="/">Assistant Home</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
