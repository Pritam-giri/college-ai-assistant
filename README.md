# College AI Assistant

A MERN application: an AI chatbot (the main feature) plus notices, faculty, timetable,
syllabus and documents for a college. Starts with **CSE** and **Electronics**, and is built
so more departments can be added without code changes.

> **Development status: Phase 6 of 10** — student chat, verified college lookups, PDF text
> extraction, Gemini embeddings, department-aware retrieval, and source references are in
> place. Live AI and document indexing require provider credentials and MongoDB.

## Project structure

```text
college-ai-assistant/
├── .env.example
├── .gitignore
├── README.md
├── client/                  React + Vite student and admin interface
└── server/
    ├── server.js            entry point (loads .env, starts listening)
    ├── app.js               Express app: security, parsing, routes, errors
    ├── models/              Mongoose schemas
    ├── plugins/             departmentPlugin (adds a validated `department` field)
    ├── services/            AI, PDF indexing, retrieval, department and notice services
    ├── controllers/         request logic
    ├── routes/              THIN: only lists middleware + controller per URL
    ├── middleware/          auth (JWT + roles), validate, errorHandler, validators/
    ├── chatbot/             departmentDetector and chatbotService
    ├── seed/                initial departments + aliases and admin bootstrap
    ├── utils/               ApiError, asyncHandler, text matching, jwt, env loader
    └── tests/               node:test unit tests
```

## How departments work (design)

- **`models/Department.js`** — departments live in the DB, not in code. Adding a 3rd
  department is a data change: `POST /api/departments` (as an admin). Every model has a
  `department` string that holds the department **code** (`CSE`, `ELECTRONICS`, `ALL`, …).
- **`plugins/departmentPlugin.js`** — one plugin adds and validates `department` on every
  model that needs it.
- **`services/departmentService.js`** — the only place that knows how to validate a code or
  build a "visible to this department" filter (`{ department: { $in: [CODE, 'ALL'] } }`).
- **Aliases live on the Department document** (`aliases: ['cs', 'ece', …]`). The chatbot's
  `departmentDetector.js` reads them, matching **whole words only**, so adding a
  department needs no code change at all.

## API conventions

```text
success:  { "success": true, "data": ..., "count": n, "total": n, "page": n, "pages": n }
failure:  { "success": false, "message": "...", "errors": [ { "field": "...", "message": "..." } ] }
```

| Status | Meaning |
|---|---|
| 400 | validation failed / bad id |
| 401 | not logged in / bad or expired token |
| 403 | logged in but wrong role |
| 404 | not found |
| 409 | duplicate (unique index) |
| 503 | database not connected |

## Endpoints available now

| Method | Path | Access |
|---|---|---|
| GET | `/` | public health check |
| GET | `/api/departments` | public |
| GET | `/api/departments/all` | admin |
| POST | `/api/departments` | admin |
| PUT | `/api/departments/:id` | admin |
| GET | `/api/notices`, `/api/notices/categories`, `/api/notices/:id` | public; active notices only |
| POST / PUT / DELETE | `/api/notices[/:id]` | admin |

The public notice listing is available at `/notices`; each active notice also has a
shareable `/notices/:id` detail page. Public reads exclude expired notices. Students see
active notices for their department and college-wide notices, with semester filtering;
admins can browse all records and filter expired notices. Notice attachments can be
linked by URL or uploaded through the admin form. Admins can upload PDF documents up
to 10 MB or link externally hosted PDFs. File uploads require Cloudinary: configure
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

### PDF question answering (RAG)

Set `GEMINI_API_KEY` for document embeddings. Chat generation can use Gemini or Groq via
`AI_PROVIDER`, but indexing and retrieval use Gemini embeddings. Upload a PDF from the
admin Documents page; its **AI Search** status shows whether indexing succeeded. Answers
that use an indexed PDF include links to their source documents. PDF links remain download
links and are not indexed automatically. Scanned PDFs need OCR before they can be indexed.

For MongoDB Atlas, create a Vector Search index on the `knowledgechunks` collection named
`college_knowledge_vector` (or set `RAG_VECTOR_INDEX` to your chosen name):

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "department" }
  ]
}
```

Set the Atlas index type to `vectorSearch`. For local MongoDB development,
`RAG_VECTOR_PROVIDER=local` uses bounded cosine similarity; `auto` tries Atlas first, then
falls back to local search. Set `RAG_VECTOR_PROVIDER=atlas` in production to require Atlas
Vector Search. The vector dimensions and index fields must match the stored embeddings. See
[MongoDB's Vector Search index documentation](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type/).

Authentication endpoints are under `/api/auth`. Public registration creates student
accounts only. Admin accounts are provisioned from server environment variables with
`npm run seed:admin`; a public request cannot assign itself an elevated role. Protected
resource APIs read the current role from the user record for each request.

## Setup

```bash
# 1. Configure the root .env from .env.example, then set JWT_SECRET,
#    MONGO_URI, and admin credentials (see the comments in .env.example).
#    PowerShell: Copy-Item .env.example .env

# 2. server
cd server
npm install
npm run seed:admin              # create the initial admin (once MongoDB is reachable)
npm run dev                     # http://localhost:5000

# In a second terminal:
cd client
npm install
npm run dev                     # http://localhost:5173
```

Requires Node.js 20+ and a reachable MongoDB instance for
registration, login, admin provisioning and database-backed API routes. The public
health endpoints remain available while the server retries its MongoDB connection.

## Security notes

- Passwords are hashed with bcryptjs (never stored in plain text, never returned by the API).
- JWTs are required on protected APIs; the server checks the current account and role.
- Roles are `student`, `teacher`, and `admin`; self-registration always creates students.
- Admin bootstrap requires a 16–72 byte password with uppercase, lowercase, number and special character.
- `.env` is git-ignored; only `.env.example` is committed.
- CORS only allows the origin(s) in `CLIENT_URL`.

## Public SEO pages

The public site includes HTML-rendered React pages for the home page, departments,
notices, faculty information, timetables, admissions, contact and project details.
Page titles, descriptions, canonical URLs and social metadata are updated for the
current route. Private and login-required routes are marked `noindex`.

The Vite frontend serves `/robots.txt` and `/sitemap.xml` during development and
emits both files into `client/dist` during a production build. Copy
`client/.env.example` to `client/.env` for local settings. Before deployment, set
`VITE_SITE_URL` to the deployed frontend origin (for example, `https://your-real-domain.tld`)
in the frontend build environment so sitemap URLs and the robots sitemap reference
use the real public domain. Without it, production builds warn and use localhost.

Public informational pages clearly identify this as Pritam Giri's independent
student project. Department pages link to related notices, faculty and timetable
information. No college contact details, dates, fees or policies are fabricated.

## Deployment

Deployment configuration is prepared for a Vercel static frontend, a Render Node
API, and MongoDB Atlas. The root `vercel.json` configures the Vite build and SPA
deep links. The root `render.yaml` configures the API build, database readiness
probe and production environment variables. **No cloud services are created by
these files; connect the repository to your own provider accounts to deploy.**

### Before deploying

1. Push the project to a Git provider repository. Keep `.env` files and real keys
   out of the repository.
2. Create an Atlas cluster and database user. Copy its `mongodb+srv://` connection
   string into the Render `MONGO_URI` secret. Add the Render service's outbound
   IP ranges from its dashboard to Atlas Network Access. For local seeding, add
   your current IP temporarily and remove it afterward. Do not allow `0.0.0.0/0`.
3. Create the `college_knowledge_vector` Vector Search index on the
   `knowledgechunks` collection using the definition above. A small Atlas cluster
   can be used for a student prototype; monitor it and scale it for production
   traffic.
4. Prepare Cloudinary credentials for notice/document uploads and Gemini API
   credentials for answers and PDF embeddings. Add SMTP credentials if email OTP
   and password recovery will be used.

### Seed the production database

Copy `.env.example` to the ignored root `.env` and temporarily set its `MONGO_URI`,
`ADMIN_EMAIL` and `ADMIN_PASSWORD` to the production Atlas/admin values. Run these
from the repository root in PowerShell:

```powershell
npm run seed --prefix server
npm run seed:admin --prefix server
```

The seed commands are safe to rerun. Confirm the department seed completed before
using the application. Remove the temporary production connection string from the
local `.env` when finished and remove your temporary client IP from Atlas Network
Access.

### Deploy the frontend

In Vercel, import the repository with its root directory set to the repository
root. The checked-in `vercel.json` sets the install command, build command, output
directory and SPA rewrite. Deploy once to receive the Vercel site URL, then add
these Production environment variables in Project Settings:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
VITE_SITE_URL=https://YOUR-PUBLIC-FRONTEND-DOMAIN
```

Redeploy after setting them. The first deploy is only to establish the frontend
URL; the final build must use the actual frontend and API origins.

### Deploy the API

In Render, create a Blueprint from the repository root and use `render.yaml`.
The API service runs from `server/`, builds with `npm ci`, starts with `npm start`,
and reports ready at `/readyz` only after MongoDB connects. Render terminates HTTPS
at its load balancer, so this service configures one trusted proxy hop for accurate
client IP handling and rate limits.

Set each `sync: false` value in the Render dashboard. Required values are
`MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL` (the exact frontend origin without a
trailing slash). Set the generated API base URL in Vercel's `VITE_API_URL`, then
redeploy the frontend. Create `JWT_SECRET` locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never put production secrets into `vercel.json`, `render.yaml`, source code or
Git. Verify that `https://YOUR-RENDER-SERVICE.onrender.com/` returns the API
message and `/readyz` returns `{"ready":true}` before checking login, public
notices, uploads and chat.

The checked-in Render service plan is `0.5c-512mb`, currently listed at $7/month.
Render's Free services sleep after 15 minutes and cannot send outbound SMTP on
ports 25, 465 or 587, so they cannot support this app's email OTP flow reliably.
Vercel Hobby is limited to personal, non-commercial use. Review the current
[Render pricing](https://render.com/pricing), [Render free service limits](https://render.com/docs/free),
and [Vercel Hobby terms](https://vercel.com/docs/plans/hobby) before deploying.

The custom process-local rate limiter is suitable for a single API instance. If
you scale the API to multiple instances, move rate-limit state to a shared store
before enabling horizontal scaling.
