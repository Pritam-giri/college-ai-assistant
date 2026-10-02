import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "http://localhost:5000/api");

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function academicImagePayload(payload) {
  const { imageFile, attachmentFile, removeImage, ...fields } = payload;
  if (!imageFile && !attachmentFile && !removeImage) return fields;

  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  });
  if (imageFile) formData.append("image", imageFile);
  if (attachmentFile) formData.append("attachment", attachmentFile);
  if (removeImage) formData.append("removeImage", "true");
  return formData;
}

function academicImageConfig(payload) {
  return payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : undefined;
}

/* =========================
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(
      "college_ai_token"
    );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(
        "college_ai_token"
      );

      localStorage.removeItem(
        "college_ai_user"
      );
    }

    return Promise.reject(error);
  }
);

/* =========================
   AUTH
========================= */

export const authAPI = {
  login: (data) =>
    api.post("/auth/login", data),

  register: (data) =>
    api.post("/auth/register", data),

  verifyEmail: (data) =>
    api.post("/auth/verify-email", data),

  resendVerification: (data) =>
    api.post("/auth/resend-verification", data),

  forgotPassword: (data) =>
    api.post("/auth/forgot-password", data),

  verifyResetOtp: (data) =>
    api.post("/auth/verify-reset-otp", data),

  resetPassword: (data) =>
    api.post("/auth/reset-password", data),

  logout: () => api.post("/auth/logout"),
};

/* =========================
   PROFILE
========================= */

export const profileAPI = {
  get: () =>
    api.get("/profile"),

  update: (data) =>
    api.put("/profile", data),
};

/* =========================
   DEPARTMENTS
========================= */

export const departmentAPI = {
  getAll: () =>
    api.get("/departments"),

  getAllAdmin: () =>
    api.get("/departments/all"),

  create: (data) =>
    api.post("/departments", data),

  update: (id, data) =>
    api.put(`/departments/${id}`, data),
};

/* =========================
   CONVERSATIONS
========================= */

export const conversationAPI = {
  create: (data) =>
    api.post("/conversations", data),

  getAll: () =>
    api.get("/conversations"),

  getOne: (id) =>
    api.get(`/conversations/${id}`),

  update: (id, data) =>
    api.put(`/conversations/${id}`, data),

  delete: (id) =>
    api.delete(`/conversations/${id}`),
};

/* =========================
   CHAT
========================= */

export const chatAPI = {
  send: (data) =>
    api.post("/chat", data),
};

/* =========================
   NOTICES
========================= */

export const noticeAPI = {
  getAll: (params = {}) =>
    api.get("/notices", { params }),

  getCategories: () =>
    api.get("/notices/categories"),

  getOne: (id) =>
    api.get(`/notices/${id}`),

  create: (data) =>
    api.post("/notices", data, data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined),

  update: (id, data) =>
    api.put(`/notices/${id}`, data, data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined),

  delete: (id) =>
    api.delete(`/notices/${id}`),
};

export const contentReadAPI = {
  getUnreadCounts: () =>
    api.get('/notifications/unread-counts'),

  markRead: (contentType, contentId) =>
    api.post(`/notifications/${contentType}/${contentId}/read`),
};

/* =========================
   FACULTY
========================= */

export const facultyAPI = {
  getAll: (params = {}) =>
    api.get("/faculty", { params }),

  getOne: (id) =>
    api.get(`/faculty/${id}`),

  create: (data) =>
    api.post("/faculty", data),

  update: (id, data) =>
    api.put(`/faculty/${id}`, data),

  delete: (id) =>
    api.delete(`/faculty/${id}`),
};

/* =========================
   TIMETABLE
========================= */

export const timetableAPI = {
  getAll: (params = {}) =>
    api.get("/timetable", { params }),

  getOne: (id) =>
    api.get(`/timetable/${id}`),

  create: (data) =>
    api.post("/timetable", data),

  update: (id, data) =>
    api.put(`/timetable/${id}`, data),

  delete: (id) =>
    api.delete(`/timetable/${id}`),
};

/* =========================
   SYLLABUS
========================= */

export const syllabusAPI = {
  getAll: (params = {}) =>
    api.get("/syllabus", { params }),

  getOne: (id) =>
    api.get(`/syllabus/${id}`),

  create: (data) => {
    const payload = academicImagePayload(data);
    return api.post("/syllabus", payload, academicImageConfig(payload));
  },

  update: (id, data) => {
    const payload = academicImagePayload(data);
    return api.put(`/syllabus/${id}`, payload, academicImageConfig(payload));
  },

  delete: (id) =>
    api.delete(`/syllabus/${id}`),
};

/* =========================
   DOCUMENTS
========================= */

export const documentAPI = {
  getAll: (params = {}) =>
    api.get("/documents", { params }),

  getOne: (id) =>
    api.get(`/documents/${id}`),

  create: (data) =>
    api.post("/documents", data, data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined),

  update: (id, data) =>
    api.put(`/documents/${id}`, data, data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined),

  delete: (id) =>
    api.delete(`/documents/${id}`),
};

/* =========================
   FAQ
========================= */

export const faqAPI = {
  getAll: (params = {}) =>
    api.get("/faqs", { params }),

  getOne: (id) =>
    api.get(`/faqs/${id}`),

  create: (data) =>
    api.post("/faqs", data),

  update: (id, data) =>
    api.put(`/faqs/${id}`, data),

  delete: (id) =>
    api.delete(`/faqs/${id}`),
};

/* =========================
   KNOWLEDGE BASE
========================= */

export const knowledgeAPI = {
  getAll: (params = {}) =>
    api.get("/knowledge", { params }),

  getOne: (id) =>
    api.get(`/knowledge/${id}`),

  create: (data) =>
    api.post("/knowledge", data),

  update: (id, data) =>
    api.put(`/knowledge/${id}`, data),

  delete: (id) =>
    api.delete(`/knowledge/${id}`),
};

/* =========================
   PRACTICALS
========================= */

export const practicalAPI = {
  getAll: (params = {}) =>
    api.get("/practicals", { params }),

  getOne: (id) =>
    api.get(`/practicals/${id}`),

  create: (data) => {
    const payload = academicImagePayload(data);
    return api.post("/practicals", payload, academicImageConfig(payload));
  },

  update: (id, data) => {
    const payload = academicImagePayload(data);
    return api.put(`/practicals/${id}`, payload, academicImageConfig(payload));
  },

  delete: (id) =>
    api.delete(`/practicals/${id}`),
};

/* =========================
   ASSIGNMENTS
========================= */

export const assignmentAPI = {
  getAll: (params = {}) =>
    api.get("/assignments", { params }),

  getOne: (id) =>
    api.get(`/assignments/${id}`),

  create: (data) => {
    const payload = academicImagePayload(data);
    return api.post("/assignments", payload, academicImageConfig(payload));
  },

  update: (id, data) => {
    const payload = academicImagePayload(data);
    return api.put(`/assignments/${id}`, payload, academicImageConfig(payload));
  },

  delete: (id) =>
    api.delete(`/assignments/${id}`),
};

/* =========================
   ADMIN (Stats & Students)
========================= */

export const adminAPI = {
  getDashboard: () =>
    api.get("/admin/dashboard"),

  getStudents: (params = {}) =>
    api.get("/admin/students", { params }),

  getStudent: (id) =>
    api.get(`/admin/students/${id}`),

  updateStudentStatus: (id, active) =>
    api.patch(`/admin/students/${id}/status`, { active }),
};

export default api;
