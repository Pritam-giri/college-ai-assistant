import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "College Chatbot | AI Assistant for Government Polytechnic Unnao";
const configuredSiteOrigin = import.meta.env.VITE_SITE_URL
  ? new URL(import.meta.env.VITE_SITE_URL).origin
  : null;

const publicPages = {
  "/": {
    title: "College Chatbot | AI Assistant for Government Polytechnic Unnao",
    description: "Explore College Chatbot, an independent student project by Pritam Giri. Sign in to ask about Government Polytechnic Unnao college information.",
    type: "website",
  },
  "/about": {
    title: "About College Chatbot | Student Project by Pritam Giri",
    description: "Learn about College Chatbot, an independent project by Pritam Giri that helps students find Government Polytechnic Unnao information from verified records.",
    type: "article",
  },
  "/help": {
    title: "Help | College Chatbot",
    description: "Get help using College Chatbot or find technical support for this independent student project.",
    type: "article",
  },
  "/departments": {
    title: "Departments | Government Polytechnic Unnao Information",
    description: "Browse CSE and Electronics department information in College Chatbot, an independent student project for Government Polytechnic Unnao.",
    type: "website",
  },
  "/departments/cse": {
    title: "Computer Science & Engineering | GP Unnao Information",
    description: "A brief overview of the Computer Science & Engineering department in the College Chatbot student project for Government Polytechnic Unnao.",
    type: "article",
  },
  "/departments/electronics": {
    title: "Electronics Department | GP Unnao Information",
    description: "A brief overview of the Electronics department in the College Chatbot student project for Government Polytechnic Unnao.",
    type: "article",
  },
  "/privacy-policy": {
    title: "Privacy Policy | College Chatbot",
    description: "Read how the College Chatbot student project handles account and college information.",
    type: "article",
  },
  "/terms-and-conditions": {
    title: "Terms & Conditions | College Chatbot",
    description: "Read the terms for using College Chatbot, an independent student project for college information assistance.",
    type: "article",
  },
};

const privatePath = (pathname) =>
  /^\/(login|register|verify-email|forgot-password|admin|chatbot|practicals|assignments|notices|faculty|timetable|admissions)(\/|$)/i.test(pathname);

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
    const page = publicPages[normalizedPath];
    const isPrivate = privatePath(normalizedPath) || (!page && normalizedPath !== "/privacy-policy" && normalizedPath !== "/terms-and-conditions");
    const privateTitle = normalizedPath.startsWith("/admin")
      ? "Admin dashboard | College Chatbot"
      : normalizedPath === "/login" ? "Sign in | College Chatbot"
        : normalizedPath === "/register" ? "Create account | College Chatbot"
          : normalizedPath === "/verify-email" ? "Verify email | College Chatbot"
            : normalizedPath === "/forgot-password" ? "Reset password | College Chatbot"
              : normalizedPath === "/chatbot" ? "College Chatbot | Government Polytechnic Unnao"
                : normalizedPath === "/practicals" ? "Practicals | College Chatbot"
                  : normalizedPath === "/assignments" ? "Assignments | College Chatbot" : SITE_NAME;
    const title = page?.title || privateTitle;
    const description = page?.description || "Student project for college information assistance.";
    const siteOrigin = configuredSiteOrigin || window.location.origin;
    const canonicalUrl = new URL(normalizedPath, siteOrigin).href;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", isPrivate ? "noindex, nofollow" : "index, follow");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", page?.type || "website");
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", `${siteOrigin}/assets/chatbot%20logo.png`);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("name", "twitter:card", "summary");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", `${siteOrigin}/assets/chatbot%20logo.png`);
    setMeta("name", "twitter:url", canonicalUrl);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    document.head.querySelectorAll("script[data-seo-jsonld]").forEach((script) => script.remove());
    if (normalizedPath === "/") {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seoJsonld = "true";
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "College Chatbot",
        alternateName: "AI Assistant for Government Polytechnic Unnao",
        description: "Independent student project for college information assistance. Not an official Government Polytechnic Unnao service.",
        url: siteOrigin,
      });
      document.head.appendChild(script);
    } else if (page) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seoJsonld = "true";
      const currentLabel = title.split("|")[0].trim();
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: new URL("/", siteOrigin).href },
          { "@type": "ListItem", position: 2, name: currentLabel, item: canonicalUrl },
        ],
      });
      document.head.appendChild(script);
    }
  }, [pathname]);

  return null;
}
