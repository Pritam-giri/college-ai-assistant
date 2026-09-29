import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "PritamChatbot | College AI Assistant";

const publicPages = {
  "/": {
    title: "Government Polytechnic Unnao AI Assistant | PritamChatbot",
    description: "Explore the PritamChatbot student project for Government Polytechnic Unnao. Find public college information, notices, department pages and verified record links.",
    type: "website",
  },
  "/about": {
    title: "About PritamChatbot | Student Project by Pritam Giri",
    description: "Learn about PritamChatbot, a student project by Pritam Giri that helps students find Government Polytechnic Unnao information from verified records.",
    type: "article",
  },
  "/departments": {
    title: "Departments | Government Polytechnic Unnao Information",
    description: "Browse the CSE and Electronics department information pages for the Government Polytechnic Unnao student project.",
    type: "website",
  },
  "/departments/cse": {
    title: "Computer Science & Engineering | GP Unnao Information",
    description: "Browse Computer Science & Engineering information, related notices and timetable links in the PritamChatbot student project for Government Polytechnic Unnao.",
    type: "article",
  },
  "/departments/electronics": {
    title: "Electronics Department | GP Unnao Information",
    description: "Browse Electronics department information, related notices and timetable links in the PritamChatbot student project for Government Polytechnic Unnao.",
    type: "article",
  },
  "/notices": {
    title: "Latest Notices | Government Polytechnic Unnao | PritamChatbot",
    description: "Browse current public notices shared through the Government Polytechnic Unnao student information project. Check each notice for its date and department.",
    type: "website",
  },
  "/faculty": {
    title: "Faculty Directory | Government Polytechnic Unnao | PritamChatbot",
    description: "Find faculty information published in the PritamChatbot college information project. Faculty details appear when verified records are available.",
    type: "website",
  },
  "/timetable": {
    title: "Department Timetables | Government Polytechnic Unnao",
    description: "Browse timetable information published in the PritamChatbot student project for Government Polytechnic Unnao departments.",
    type: "website",
  },
  "/admissions": {
    title: "Admissions Information | Government Polytechnic Unnao",
    description: "Find admissions information links and verified updates for Government Polytechnic Unnao through the PritamChatbot student project.",
    type: "website",
  },
  "/contact": {
    title: "Contact & Project Information | PritamChatbot",
    description: "Contact the PritamChatbot student project maintainer or find guidance for checking Government Polytechnic Unnao information with the college administration.",
    type: "website",
  },
  "/privacy-policy": {
    title: "Privacy Policy | PritamChatbot College AI Assistant",
    description: "Read how the PritamChatbot student project handles account and college information.",
    type: "article",
  },
  "/terms-and-conditions": {
    title: "Terms & Conditions | PritamChatbot College AI Assistant",
    description: "Read the terms for using PritamChatbot, an independent student project for college information assistance.",
    type: "article",
  },
};

const privatePath = (pathname) =>
  /^\/(login|register|verify-email|forgot-password|admin|chatbot|practicals|assignments)(\/|$)/i.test(pathname);

function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
    const isNoticeDetail = /^\/notices\/[^/]+$/.test(normalizedPath);
    const page = publicPages[normalizedPath] || (isNoticeDetail ? {
      title: "College Notice | Government Polytechnic Unnao | PritamChatbot",
      description: "Read a college notice shared through the Government Polytechnic Unnao student information project.",
      type: "article",
    } : null);
    const isPrivate = privatePath(normalizedPath) || (!page && normalizedPath !== "/privacy-policy" && normalizedPath !== "/terms-and-conditions");
    const privateTitle = normalizedPath.startsWith("/admin")
      ? "Admin dashboard | PritamChatbot"
      : normalizedPath === "/login" ? "Sign in | PritamChatbot"
        : normalizedPath === "/register" ? "Create account | PritamChatbot"
          : normalizedPath === "/verify-email" ? "Verify email | PritamChatbot"
            : normalizedPath === "/forgot-password" ? "Reset password | PritamChatbot"
              : normalizedPath === "/chatbot" ? "College Chatbot | PritamChatbot"
                : normalizedPath === "/practicals" ? "Practicals | PritamChatbot"
                  : normalizedPath === "/assignments" ? "Assignments | PritamChatbot" : SITE_NAME;
    const title = page?.title || privateTitle;
    const description = page?.description || "Student project for college information assistance.";
    const canonicalUrl = new URL(normalizedPath, window.location.origin).href;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", isPrivate ? "noindex, nofollow" : "index, follow");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", page?.type || "website");
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", `${window.location.origin}/og-image.svg`);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("name", "twitter:card", "summary");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", `${window.location.origin}/og-image.svg`);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const oldStructuredData = document.head.querySelector("script[data-seo-jsonld]");
    oldStructuredData?.remove();
    if (normalizedPath === "/") {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seoJsonld = "true";
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "PritamChatbot",
        alternateName: "College AI Assistant",
        description: "Independent student project for college information assistance. Not an official Government Polytechnic Unnao service.",
        url: window.location.origin,
      });
      document.head.appendChild(script);
    }
  }, [pathname]);

  return null;
}
