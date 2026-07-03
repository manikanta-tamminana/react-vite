import axios from "axios";

const BASE_URL = "http://localhost:8080/api";

const api = axios.create({ baseURL: BASE_URL });

// Attach the JWT to every outgoing request, if we have one.
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server rejects the token (expired/invalid/missing), clear local
// auth state immediately so the UI never keeps acting as if we're logged in.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      clearAuthData();
    }
    return Promise.reject(err);
  }
);

// Extract a readable message from a failed axios call, preserving the status code.
const toError = (err, fallback) => {
  let message = fallback;
  if (err.response && typeof err.response.data === "string") message = err.response.data;
  else if (err.response && err.response.data && err.response.data.message) message = err.response.data.message;
  else if (err.message) message = err.message;

  const e = new Error(message);
  e.status = err.response ? err.response.status : null;
  return e;
};

// ---------- Training records ----------

export const fetchAllRecords = async () => {
  const res = await api.get("/certificates/all");
  return res.data;
};

export const fetchEmployeeRecords = async (employeeId) => {
  const res = await api.get(`/certificates/employee/${employeeId}`);
  return res.data;
};

export const saveTrainingRecord = async (formData) => {
  // Backend expects a multipart request with:
  //  - "data": a JSON blob matching TrainingRecordRequest
  //  - "certificateFile": the file part (optional)
  const { certificateFile, ...rest } = formData;

  const body = new FormData();
  body.append("data", new Blob([JSON.stringify(rest)], { type: "application/json" }));
  if (certificateFile instanceof File) {
    body.append("certificateFile", certificateFile);
  }

  try {
    const res = await api.post("/certificates/save", body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (err) {
    throw toError(err, "Failed to save training record");
  }
};

export const deleteTrainingRecord = async (recordId) => {
  try {
    const res = await api.delete(`/certificates/${recordId}`);
    return res.data;
  } catch (err) {
    throw toError(err, "Failed to delete training record");
  }
};

// Downloads/opens a certificate. This endpoint is auth-protected, so a plain
// <a href> won't work (the browser wouldn't attach the Authorization header).
// Instead we fetch it as a blob through axios (which does attach the header
// via the interceptor above), then hand the browser an object URL.
export const downloadCertificate = async (recordId, fileName) => {
  try {
    const res = await api.get(`/certificates/download/${recordId}`, {
      responseType: "blob",
    });

    const blobUrl = window.URL.createObjectURL(res.data);

    // Open in a new tab for viewing (PDFs/images render inline).
    // To force a save-as download instead, use the commented block below.
    window.open(blobUrl, "_blank");

    // -- Force-download variant, if preferred over open-in-tab:
    // const link = document.createElement("a");
    // link.href = blobUrl;
    // link.download = fileName || "certificate";
    // document.body.appendChild(link);
    // link.click();
    // link.remove();

    // Release the object URL after a short delay so the new tab has time to load it.
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
  } catch (err) {
    // err.response.data is a Blob here (axios doesn't know it's JSON/text until read),
    // so a plain toError() would show "[object Blob]" instead of the real message.
    if (err.response && err.response.data instanceof Blob) {
      const text = await err.response.data.text();
      const e = new Error(text || "Failed to download certificate");
      e.status = err.response.status;
      throw e;
    }
    throw toError(err, "Failed to download certificate");
  }
};

// ---------- Auth ----------

export const loginUser = async (employeeId, password) => {
  try {
    const res = await api.post("/auth/login", { employeeId, password });
    setAuthData(res.data);
    return res.data; // { token, employeeId, employeeName, role }
  } catch (err) {
    throw toError(err, "Login failed. Check your credentials.");
  }
};

// Public self-registration. Account starts PENDING with no role and cannot
// log in until an admin approves it via approveEmployee().
export const registerUser = async (employeeId, employeeName, department, password) => {
  try {
    const res = await api.post("/auth/register", { employeeId, employeeName, department, password });
    return res.data; // plain confirmation string
  } catch (err) {
    throw toError(err, "Registration failed.");
  }
};

export const fetchPendingEmployees = async () => {
  try {
    const res = await api.get("/auth/pending");
    return res.data; // [{ employeeId, employeeName, department, registeredAt }, ...]
  } catch (err) {
    throw toError(err, "Failed to load pending approvals.");
  }
};

export const approveEmployee = async (employeeId, role) => {
  try {
    const res = await api.post("/auth/approve", { employeeId, role });
    return res.data;
  } catch (err) {
    throw toError(err, "Failed to approve employee.");
  }
};

export const rejectEmployee = async (employeeId) => {
  try {
    const res = await api.post(`/auth/reject/${employeeId}`);
    return res.data;
  } catch (err) {
    throw toError(err, "Failed to reject employee.");
  }
};

export const provisionUser = async (employeeId, password, role, employeeName) => {
  try {
    const res = await api.post("/auth/provision", { employeeId, employeeName, password, role });
    return res.data;
  } catch (err) {
    throw toError(err, "Provisioning failed.");
  }
};

// ---------- Local auth storage ----------

const AUTH_KEY = "hrms_auth";

export const getAuthToken = () => {
  const stored = localStorage.getItem(AUTH_KEY);
  return stored ? JSON.parse(stored).token : null;
};

export const getAuthUser = () => {
  const stored = localStorage.getItem(AUTH_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const setAuthData = (data) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
};

export const clearAuthData = () => {
  localStorage.removeItem(AUTH_KEY);
};