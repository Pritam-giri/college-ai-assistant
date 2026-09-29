import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, CheckCircle } from "lucide-react";
import PublicAppLink from "../components/PublicAppLink";

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy | College AI Assistant";
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <PublicAppLink className="legal-back-link" back />
          <div className="legal-brand">
            <div className="legal-icon"><Shield size={20} /></div>
            <div><h1>Privacy Policy</h1><p>College AI Assistant</p></div>
          </div>
          <div className="legal-meta"><span>Effective Date: September 2026</span><span>Last Updated: September 2026</span></div>
        </header>
        <main className="legal-content">
          <section className="legal-section"><h2>1. Introduction</h2><p>This policy summarizes the information used by the College AI Assistant to provide account access and college information features.</p></section>
          <section className="legal-section"><h2>2. Information Used</h2><p>The application uses information associated with your account, such as your name, email address, roll number, department, and semester. It also stores conversations and the academic records managed through the application.</p></section>
          <section className="legal-section"><h2>3. How Information Is Used</h2><p>Account and academic information is used to authenticate users and provide relevant college information, notices, schedules, and academic records.</p></section>
          <section className="legal-section"><h2>4. Account Security</h2><p>Passwords are stored as bcrypt hashes. Authentication uses signed JSON Web Tokens. Do not share your password or account access with others.</p></section>
          <section className="legal-section"><h2>5. Assistant Queries</h2><p>Queries submitted to the assistant are used to retrieve college records or generate responses to general questions. General questions may be sent to Google Gemini for response generation.</p></section>
          <section className="legal-section"><h2>6. Questions or Requests</h2><p>For questions about your account information or this policy, contact the college assistant team using the address below.</p><div className="legal-contact-box"><p><strong>Institution:</strong> Government Polytechnic Unnao, Uttar Pradesh</p><p><strong>Contact Email:</strong> <a className="institutional-legal-link" href="mailto:gpunnaocollegeassistant@gmail.com">gpunnaocollegeassistant@gmail.com</a></p></div></section>
        </main>
        <footer className="legal-footer"><p>&copy; {new Date().getFullYear()} College AI Assistant. All rights reserved.</p><div className="legal-footer-links"><Link className="institutional-legal-link" to="/terms-and-conditions">Terms &amp; Conditions</Link><PublicAppLink /></div></footer>
      </div>
    </div>
  );
}
