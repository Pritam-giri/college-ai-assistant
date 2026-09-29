import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, FileText, GraduationCap, Users } from "lucide-react";
import "./PublicInfo.css";

const departmentContent = {
  cse: {
    name: "Computer Science & Engineering",
    short: "CSE",
    description: "This page helps students find Computer Science & Engineering information published in the PritamChatbot student project. Department notices and academic records appear when they have been added and verified by a project administrator.",
  },
  electronics: {
    name: "Electronics",
    short: "Electronics",
    description: "This page helps students find Electronics department information published in the PritamChatbot student project. Department notices and academic records appear when they have been added and verified by a project administrator.",
  },
};

const links = [
  ["Notices", "/notices", FileText, "Browse current public notices and department announcements."],
  ["Faculty", "/faculty", Users, "Faculty information is shown when verified records are available."],
  ["Timetables", "/timetable", CalendarDays, "Find published timetable information by department and semester."],
  ["Admissions", "/admissions", GraduationCap, "See where to look for verified admission updates."],
];

const pageCopy = {
  "/faculty": {
    title: "Faculty information",
    intro: "Faculty names, designations and contact details should be shared only when they are present in verified college records. This student project does not invent or assume faculty information.",
    note: "No faculty records are published on this public page yet. Check back when verified records become available, or contact the college administration through its official channels.",
  },
  "/timetable": {
    title: "Department timetables",
    intro: "Timetable information depends on department and semester records entered into the project. This page does not publish unverified class times or schedules.",
    note: "No timetable is published on this public page yet. Check with the college or department administration for the current schedule.",
  },
  "/admissions": {
    title: "Admissions information",
    intro: "Admission requirements, dates and fees can change. PritamChatbot publishes admission details only when verified information is available in its knowledge base.",
    note: "Admission details are not currently published here. For current requirements and deadlines, consult the official college or Uttar Pradesh technical education admission channels.",
  },
  "/contact": {
    title: "Contact and project information",
    intro: "PritamChatbot is an independent student project by Pritam Giri, created to make verified college information easier to find.",
    note: "This project is not an official Government Polytechnic Unnao service. For official college matters, contact the college administration using contact details published by the college.",
  },
};

export default function PublicInfo() {
  const { pathname } = useLocation();
  const departmentMatch = pathname.match(/^\/departments\/(cse|electronics)$/);
  const department = departmentMatch ? departmentContent[departmentMatch[1]] : null;
  const isDepartmentsIndex = pathname === "/departments";
  const copy = pageCopy[pathname];
  const title = department ? `${department.name} Department` : isDepartmentsIndex ? "Departments" : copy?.title || "College information";

  return (
    <div className="public-info-page">
      <header className="public-info-header">
        <Link to="/" className="public-info-brand">Pritam<span>Chatbot</span></Link>
        <nav aria-label="Main navigation">
          <Link to="/">Home</Link><Link to="/departments">Departments</Link><Link to="/notices">Notices</Link><Link to="/about">About</Link>
        </nav>
      </header>
      <main className="public-info-main">
        <p className="public-info-kicker">Student Project · College AI Assistant</p>
        <h1>{title}</h1>
        {department ? (
          <>
            <p className="public-info-lead">AI Assistant for Government Polytechnic Unnao</p>
            <p>{department.description}</p>
            <div className="public-info-links">
              <Link to={`/notices?department=${department.short === "CSE" ? "CSE" : "ELECTRONICS"}`}><FileText /> Department notices <ArrowRight /></Link>
              <Link to="/faculty"><Users /> Faculty information <ArrowRight /></Link>
              <Link to="/timetable"><CalendarDays /> Timetable information <ArrowRight /></Link>
              <Link to="/chatbot"><BookOpen /> Ask the college assistant <ArrowRight /></Link>
            </div>
          </>
        ) : isDepartmentsIndex ? (
          <>
            <p className="public-info-lead">Browse department information for the Government Polytechnic Unnao student project.</p>
            <div className="public-info-links">
              {Object.entries(departmentContent).map(([slug, item]) => <Link key={slug} to={`/departments/${slug}`}><GraduationCap /> {item.name} <ArrowRight /></Link>)}
            </div>
            <p>Additional departments can be added as verified information becomes available.</p>
          </>
        ) : (
          <>
            <p className="public-info-lead">{copy?.intro}</p>
            <section className="public-info-note"><h2>Information status</h2><p>{copy?.note}</p></section>
          </>
        )}
        <section className="public-info-related" aria-labelledby="related-title">
          <h2 id="related-title">Explore college information</h2>
          <div>{links.map(([label, href, Icon, detail]) => <Link to={href} key={label}><Icon /><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight /></Link>)}</div>
        </section>
        <p className="public-info-disclaimer">Independent student project by Pritam Giri. This is not an official college service.</p>
      </main>
      <footer className="public-info-footer"><Link to="/">PritamChatbot</Link><Link to="/about">About this project</Link></footer>
    </div>
  );
}
