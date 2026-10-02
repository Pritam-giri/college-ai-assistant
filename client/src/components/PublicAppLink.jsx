import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function PublicAppLink({ className, back = false }) {
  const { user, loading } = useAuth();

  if (loading && !user) return null;

  const isAuthenticated = Boolean(user);
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const to = isAuthenticated ? (isAdmin ? "/admin" : "/") : "/login";
  const label = isAuthenticated
    ? (isAdmin ? "Open Admin Panel" : "Back to College Chatbot")
    : "Sign In";

  return (
    <Link to={to} className={className}>
      {back && <ArrowLeft size={16} />}
      <span>{label}</span>
    </Link>
  );
}
