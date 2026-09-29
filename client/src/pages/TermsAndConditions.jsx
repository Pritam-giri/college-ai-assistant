import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import PublicAppLink from "../components/PublicAppLink";

export default function TermsAndConditions() {
  useEffect(() => {
    document.title = "Terms & Conditions | College AI Assistant";
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <PublicAppLink className="legal-back-link" back />
          <div className="legal-brand"><div className="legal-icon"><FileText size={20} /></div><div><h1>Terms and Conditions</h1><p>College AI Assistant</p></div></div>
          <div className="legal-meta"><span>Effective Date: September 2026</span><span>Version: 1.0</span></div>
        </header>
        <main className="legal-content">
          <section className="legal-section"><h2>1. Acceptance of Terms</h2><p>By creating an account, accessing, or using the College AI Assistant (the &ldquo;Service&rdquo;), you agree to comply with and be bound by these Terms and Conditions. These terms apply to all enrolled students, faculty members, and authorized administrative staff of Government Polytechnic Unnao.</p><p>If you do not agree to these terms, you must not register an account or use this software platform.</p></section>
          <section className="legal-section"><h2>2. Permitted Educational Use</h2><p>The College AI Assistant is provided strictly as an institutional support system for academic, informational, and departmental purposes. Users may use the assistant to:</p><ul><li>Check course timetables, schedules, and classroom allocations.</li><li>Review current semester curricula, syllabus documents, and course descriptions.</li><li>Access faculty directory information and department announcements.</li><li>Review institutional notices and administrative circulars.</li></ul></section>
          <section className="legal-section"><h2>3. Account Responsibilities</h2><p>Users are responsible for safeguarding the credentials associated with their account. You agree to:</p><ul><li>Provide accurate, current, and complete registration information (name, official email, roll number, and department).</li><li>Maintain the security of your password and accept responsibility for all activities that occur under your account.</li><li>Promptly notify the institution administration of any unauthorized access or security breach.</li></ul></section>
          <section className="legal-section"><h2>4. Acceptable Conduct and Prohibited Activities</h2><p>When using this application, users shall not:</p><ul><li>Attempt to bypass authentication, access control mechanisms, or administrative interfaces without authorization.</li><li>Submit abusive, defamatory, harassing, or illegal content in chat queries or profile fields.</li><li>Execute automated scraping, denial-of-service attempts, or reverse-engineering of backend services.</li><li>Misrepresent identity by impersonating faculty, administrative staff, or fellow students.</li></ul></section>
          <section className="legal-section"><h2>5. Academic Advice and Information Accuracy</h2><p>While the College AI Assistant retrieves information from official institutional records, timetables, and departmental notices, users should verify critical academic decisions (such as examination registration deadlines, degree requirements, or fee payments) with their respective Head of Department or official administrative notices.</p></section>
          <section className="legal-section"><h2>6. Termination and Account Suspension</h2><p>The institution reserves the right to suspend or terminate access for any user found to have violated institutional policies, academic honor codes, or these Terms and Conditions.</p></section>
          <section className="legal-section"><h2>7. Amendments</h2><p>The institution may update these terms periodically to reflect administrative or operational changes. Continued use of the service following such updates constitutes acceptance of the modified terms.</p></section>
          <section className="legal-section"><h2>8. Contact Information</h2><p>For questions about these terms, contact the college assistant team:</p><div className="legal-contact-box"><p><strong>Institution:</strong> Government Polytechnic Unnao, Uttar Pradesh</p><p><strong>Email:</strong> <a className="institutional-legal-link" href="mailto:gpunnaocollegeassistant@gmail.com">gpunnaocollegeassistant@gmail.com</a></p></div></section>
        </main>
        <footer className="legal-footer"><p>&copy; {new Date().getFullYear()} College AI Assistant. All rights reserved.</p><div className="legal-footer-links"><Link className="institutional-legal-link" to="/privacy-policy">Privacy Policy</Link><PublicAppLink /></div></footer>
      </div>
    </div>
  );
}
