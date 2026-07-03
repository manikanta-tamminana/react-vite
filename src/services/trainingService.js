import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8080/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const fetchAllRecords = async () => {
  const res = await API.get("/certificates/all");

  console.log("fetchAllRecords response:", res);

  return res.data;
};

export const fetchEmployeeRecords = async (employeeId) => {
  const res = await API.get(`/certificates/employee/${employeeId}`);
  return res.data;
};

export const saveTrainingRecord = async (formData) => {
  const multipart = new FormData();

  // Separate the file
  const { certificateFile, ...trainingData } = formData;

  // Send JSON as the "data" part
  multipart.append(
    "data",
    new Blob([JSON.stringify(trainingData)], {
      type: "application/json",
    })
  );

  // Send file separately
  if (certificateFile) {
    multipart.append("certificateFile", certificateFile);
  }

  const res = await API.post("/certificates/save", multipart);

  return res.data;
};

export const deleteTrainingRecord = async (recordId) => {
  const res = await API.delete(`/certificates/${recordId}`);
  return res.data;
};

// Temporary authentication stubs.
// Your Spring Boot backend currently has no authentication APIs.
export const loginUser = async (employeeId, password) => {
  const response = await API.post("/auth/login", {
    employeeId,
    password,
  });

  const auth = response.data;

  localStorage.setItem("jwt", auth.token);
  localStorage.setItem("employeeId", auth.employeeId);
  localStorage.setItem("employeeName", auth.employeeName);
  localStorage.setItem("role", auth.role);

  return auth;
};

export const provisionUser = async (payload) => {
  const res = await API.post("/auth/provision", payload);
  return res.data;
};

export const getAuthToken = () => {
  return localStorage.getItem("jwt");
};
export const getAuthUser = () => {
  const employeeId = localStorage.getItem("employeeId");

  if (!employeeId) {
    return null;
  }

  return {
    employeeId,
    employeeName: localStorage.getItem("employeeName"),
    role: localStorage.getItem("role"),
  };
};
export const setAuthData = () => {};
export const clearAuthData = () => {
  localStorage.clear();
};