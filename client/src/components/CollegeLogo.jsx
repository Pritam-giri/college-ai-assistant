/** One shared image source for all College Chatbot brand marks. */
export default function CollegeLogo({ className = "" }) {
  return (
    <span className={`college-mark ${className}`.trim()} aria-hidden="true">
      <img className="college-mark-image" src="/assets/chatbot%20logo.png" alt="" />
    </span>
  );
}
