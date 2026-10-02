import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { noticeAPI } from "../services/api";
import { useUnreadContent } from "../context/UnreadContentContext";
import MediaAction from "../components/MediaAction";
import { safeHttpUrl } from "../safeUrl";
import "./Notices.css";

export default function NoticeDetail() {
  const { id } = useParams();
  const { markContentRead } = useUnreadContent();
  const [notice, setNotice] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    noticeAPI.getOne(id)
      .then(({ data }) => {
        if (!active) return;
        setNotice(data?.data || null);
        setStatus(data?.data ? "ready" : "missing");
        if (data?.data?._id) markContentRead('notice', data.data._id);
      })
      .catch(() => active && setStatus("missing"));
    return () => { active = false; };
  }, [id, markContentRead]);

  useEffect(() => {
    if (status === "missing") {
      document.title = "Notice unavailable | College Chatbot";
      document.querySelector('meta[name="robots"]')?.setAttribute("content", "noindex, follow");
      return;
    }
    if (status !== "ready" || !notice) return;

    const title = `${notice.title} | College Chatbot Notice`;
    const description = (notice.body || "College notice shared through the College Chatbot student project.").replace(/\s+/g, " ").slice(0, 160);
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[name="robots"]')?.setAttribute("content", "index, follow");
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:type"]')?.setAttribute("content", "article");

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = window.location.href.split("?")[0];
  }, [notice, status]);

  const imageUrl = safeHttpUrl(notice?.image?.url);
  return (
    <div className="notices-page">
      <header className="notices-header"><Link className="notices-brand" to="/"><span><FileText size={18} /></span><b>College <span>Chatbot</span></b></Link><nav aria-label="Main navigation"><Link to="/">Home</Link><Link to="/notices">Notices</Link><Link to="/chatbot">Chatbot</Link><Link to="/about">About</Link></nav></header>
      <main className="notices-main">
        <Link to="/notices" className="notices-back"><ArrowLeft size={15} /> All notices</Link>
        {status === "loading" ? <div className="notices-state">Loading notice…</div>
          : status === "missing" ? <div className="notices-state"><h1>Notice not found</h1><p>This notice may have expired or is no longer available.</p><Link to="/notices">Browse current notices</Link></div>
            : <article className="notice-detail">
              <span className="notice-category">{notice.category || "general"}</span>
              <h1>{notice.title}</h1>
              <p className="notice-detail-meta"><CalendarDays size={15} /> Published {notice.publishedAt ? new Date(notice.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "Date not provided"} <span>·</span> {notice.department === "ALL" ? "All departments" : notice.department}</p>
              <p className="notice-detail-body">{notice.body}</p>
              {imageUrl && <img className="notice-detail-image" src={imageUrl} alt={notice.title ? `${notice.title} attachment` : "Notice attachment"} />}
              <div className="notice-detail-media-actions">
                <MediaAction url={notice.attachment?.url} mimeType={notice.attachment?.mimeType} fileName={notice.attachment?.originalName} className="notice-detail-attachment" />
                <MediaAction url={notice.image?.url} mimeType={notice.image?.mimeType} fileName={notice.image?.originalName} className="notice-detail-attachment" />
              </div>
            </article>}
      </main>
      <footer className="notices-footer"><Link className="notices-brand" to="/"><span><FileText size={16} /></span><b>College <span>Chatbot</span></b></Link><p>Independent student project by Pritam Giri · Not an official college service.</p></footer>
    </div>
  );
}
