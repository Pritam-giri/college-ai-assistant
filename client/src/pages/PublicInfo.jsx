import { Link, useLocation } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "../components/PublicSiteChrome";
import "./Home.css";
import "./PublicInfo.css";

const departmentContent = {
  cse: {
    name: "Computer Science & Engineering",
    short: "CSE",
    description: "Computer Science & Engineering is one of the departments represented in the College Chatbot student project. Sign in to ask the assistant about department information.",
  },
  electronics: {
    name: "Electronics",
    short: "Electronics",
    description: "Electronics is one of the departments represented in the College Chatbot student project. Sign in to ask the assistant about department information.",
  },
};

export default function PublicInfo() {
  const { pathname } = useLocation();
  const departmentMatch = pathname.match(/^\/departments\/(cse|electronics)$/);
  const department = departmentMatch ? departmentContent[departmentMatch[1]] : null;
  const isDepartmentsIndex = pathname === "/departments";
  const title = department ? `${department.name} Department` : "Departments";

  return (
    <div className="public-info-page">
      <PublicSiteHeader />
      <main className="public-info-main">
        <p className="public-info-kicker">Independent student project by Pritam Giri</p>
        <h1>{title}</h1>
        {department ? (
          <>
            <p className="public-info-lead">AI Assistant for Government Polytechnic Unnao</p>
            <p>{department.description}</p>
            <div className="public-info-links">
              <Link to="/chatbot"><GraduationCap /> Ask the college assistant <ArrowRight /></Link>
            </div>
          </>
        ) : isDepartmentsIndex ? (
          <>
            <p className="public-info-lead">A simple overview of the departments represented in this student project.</p>
            <div className="public-info-links">
              {Object.entries(departmentContent).map(([slug, item]) => <Link key={slug} to={`/departments/${slug}`}><GraduationCap /><span>{item.name}</span><ArrowRight /></Link>)}
            </div>
            <p>Additional departments can be added as verified information becomes available.</p>
          </>
        ) : null}
        <p className="public-info-disclaimer">Independent student project by Pritam Giri. This is not an official college service.</p>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
