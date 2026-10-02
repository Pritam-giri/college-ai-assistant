import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import PublicAppLink from "../components/PublicAppLink";

export default function TermsAndConditions() {
  useEffect(() => {
    document.title = "Terms & Conditions | College Chatbot";
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <PublicAppLink className="legal-back-link" back />
          <div className="legal-brand"><div className="legal-icon"><FileText size={20} /></div><div><h1>Terms and Conditions</h1><p>College Chatbot · Student project by Pritam Giri</p></div></div>
          <div className="legal-meta"><span>Effective Date: September 2026</span><span>Version: 1.0</span></div>
        </header>
        <main className="legal-content">
          <section className="legal-section"><h2>1. Acceptance of Terms</h2><p>By accessing or using College Chatbot, an independent student project by Pritam Giri, you agree to these terms. This project is not an official Government Polytechnic Unnao service.</p><p>If you do not agree to these terms, do not register an account or use the platform.</p></section>
          <section className="legal-section"><h2>2. Informational Use</h2><p>College Chatbot organizes college information when records are available. Users may use it to:</p><ul><li>Browse timetable and syllabus records entered into the project.</li><li>Read faculty information and department notices available in the database.</li><li>Review project knowledge-base entries and uploaded documents.</li><li>Open links to source records when provided.</li></ul></section>
          <section className="legal-section"><h2>3. Account Responsibilities</h2><p>Users are responsible for safeguarding the credentials associated with their account. You agree to:</p><ul><li>Provide accurate, current, and complete registration information (name, official email, roll number, and department).</li><li>Maintain the security of your password and accept responsibility for all activities that occur under your account.</li><li>Promptly notify the institution administration of any unauthorized access or security breach.</li></ul></section>
          <section className="legal-section"><h2>4. Acceptable Conduct and Prohibited Activities</h2><p>When using this application, users shall not:</p><ul><li>Attempt to bypass authentication, access control mechanisms, or administrative interfaces without authorization.</li><li>Submit abusive, defamatory, harassing, or illegal content in chat queries or profile fields.</li><li>Execute automated scraping, denial-of-service attempts, or reverse-engineering of backend services.</li><li>Misrepresent identity by impersonating faculty, administrative staff, or fellow students.</li></ul></section>
          <section className="legal-section"><h2>5. Information Accuracy</h2><p>The assistant uses records available to this student project and may not have the latest college information. Verify critical academic decisions, examination deadlines, requirements, and payments with Government Polytechnic Unnao through its official channels.</p></section>
          <section className="legal-section"><h2>6. Termination and Account Suspension</h2><p>The institution reserves the right to suspend or terminate access for any user found to have violated institutional policies, academic honor codes, or these Terms and Conditions.</p></section>
          <section className="legal-section"><h2>7. Amendments</h2><p>The institution may update these terms periodically to reflect administrative or operational changes. Continued use of the service following such updates constitutes acceptance of the modified terms.</p></section>
          <section className="legal-section"><h2>8. Contact Information</h2><p>For questions about these terms, contact the college assistant team:</p><div className="legal-contact-box"><p><strong>Institution:</strong> Government Polytechnic Unnao, Uttar Pradesh</p><p><strong>Email:</strong> <a className="institutional-legal-link" href="mailto:gpunnaocollegeassistant@gmail.com">gpunnaocollegeassistant@gmail.com</a></p></div></section>
        </main>
        <footer className="legal-footer"><p>&copy; {new Date().getFullYear()} College Chatbot · Student project by Pritam Giri</p><div className="legal-footer-links"><Link className="institutional-legal-link" to="/privacy-policy">Privacy Policy</Link><PublicAppLink /></div></footer>
      </div>
    </div>
  );
}
