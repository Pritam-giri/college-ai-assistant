import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, FileText, Filter, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { departmentAPI, noticeAPI } from "../services/api";
import MediaAction from "../components/MediaAction";
import "./Notices.css";

function formatDate(value) {
  if (!value) return "Date not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date not provided" : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function Notices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [departments, setDepartments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const department = searchParams.get("department") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    departmentAPI.getAll()
      .then(({ data }) => setDepartments((data?.data || []).filter((item) => !item.isAll)))
      .catch(() => setDepartments([]));
  }, []);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 10, status: "active" };
      if (department) params.department = department;
      const query = searchParams.get("search")?.trim();
      if (query) params.search = query;
      const { data } = await noticeAPI.getAll(params);
      setNotices(data?.data || []);
      setTotal(data?.total || 0);
      setPages(Math.max(1, data?.pages || 1));
    } catch {
      setError("Notices could not be loaded right now. Please try again shortly.");
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, [department, page, searchParams]);

  useEffect(() => {
    const request = setTimeout(loadNotices, 0);
    return () => clearTimeout(request);
  }, [loadNotices]);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    if ("department" in updates || "search" in updates) next.delete("page");
    setSearchParams(next);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    updateParams({ search: search.trim() });
  };

  return (
    <div className="notices-page">
      <header className="notices-header">
        <Link className="notices-brand" to="/"><span><FileText size={18} /></span><b>College <span>Chatbot</span></b></Link>
        <nav aria-label="Main navigation"><Link to="/">Home</Link><a href="#notice-list">Notices</a><Link to="/chatbot">Chatbot</Link><Link to="/about">About</Link></nav>
      </header>
      <main className="notices-main">
        <Link to="/" className="notices-back"><ArrowLeft size={15} /> Home</Link>
        <section className="notices-intro">
          <span className="notices-kicker">COLLEGE INFORMATION</span>
          <h1>Latest College Notices</h1>
          <p>Browse current announcements from Government Polytechnic Unnao. This student project displays notices shared through its college information system.</p>
        </section>

        <form className="notices-filters" onSubmit={handleSearch}>
          <label className="notices-search"><Search size={17} /><span className="visually-hidden">Search notices</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notices by title or details" maxLength={100} /><button type="submit">Search</button></label>
          <label className="notices-department"><Filter size={16} /><span className="visually-hidden">Filter by department</span><select value={department} onChange={(event) => updateParams({ department: event.target.value })}><option value="">All departments</option>{departments.map((item) => <option key={item._id} value={item.code}>{item.name}</option>)}</select></label>
        </form>

        <section className="notices-list" id="notice-list" aria-label="Current notices" aria-live="polite">
          <div className="notices-list-heading"><h2>Current announcements</h2><span>{loading ? "Loading…" : `${total} ${total === 1 ? "notice" : "notices"}`}</span></div>
          {loading ? <div className="notices-state">Loading current notices…</div>
            : error ? <div className="notices-state notices-error" role="alert">{error}<button onClick={loadNotices} type="button">Try again</button></div>
              : notices.length === 0 ? <div className="notices-state"><span className="notices-empty-icon"><FileText size={23} /></span><h3>No current notices</h3><p>There are no active notices matching this search.</p></div>
                : notices.map((notice) => {
                  return <article className="notice-card" key={notice._id}>
                    <div className="notice-card-top"><span className="notice-category">{notice.category || "general"}</span><span className="notice-dept">{departments.find((item) => item.code === notice.department)?.name || (notice.department === "ALL" ? "All departments" : notice.department)}</span></div>
                    <h3><Link to={`/notices/${notice._id}`}>{notice.title}</Link></h3>
                    <p className="notice-body">{notice.body}</p>
                    <div className="notice-card-bottom">
                      <span><CalendarDays size={14} /> Published {formatDate(notice.publishedAt || notice.createdAt)}</span>
                      <div className="notice-card-media-actions">
                        <MediaAction url={notice.attachment?.url} mimeType={notice.attachment?.mimeType} fileName={notice.attachment?.originalName} />
                        <MediaAction url={notice.image?.url} mimeType={notice.image?.mimeType} fileName={notice.image?.originalName} />
                      </div>
                    </div>
                  </article>;
                })}
        </section>
        {!loading && pages > 1 && <nav className="notices-pagination" aria-label="Notice pages"><button type="button" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}><ArrowLeft size={15} /> Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => updateParams({ page: String(page + 1) })}>Next <ArrowRight size={15} /></button></nav>}
      </main>
      <footer className="notices-footer"><Link className="notices-brand" to="/"><span><FileText size={16} /></span><b>College <span>Chatbot</span></b></Link><p>Independent student project by Pritam Giri · Not an official college service.</p></footer>
    </div>
  );
}
