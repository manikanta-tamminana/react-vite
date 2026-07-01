import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8080/api/certificates",
});

export const fetchAllRecords = async () => {
  const res = await API.get("/all");
  return res.data;
};

export const fetchEmployeeRecords = async (employeeId) => {
  const res = await API.get(`/employee/${employeeId}`);
  return res.data;
};

export const saveTrainingRecord = async (formData) => {
  const data = new FormData();

  Object.keys(formData).forEach((key) => {
    if (formData[key] !== null && formData[key] !== undefined) {
      data.append(key, formData[key]);
    }
  });

  const res = await API.post("/save", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const deleteTrainingRecord = async (recordId) => {
  const res = await API.delete(`/${recordId}`);
  return res.data;
};

// Temporary authentication stubs.
// Your Spring Boot backend currently has no authentication APIs.
export const loginUser = async () => {
  throw new Error("Authentication API not implemented yet.");
};

export const provisionUser = async () => {
  throw new Error("Provision API not implemented yet.");
};

export const getAuthToken = () => null;
export const getAuthUser = () => null;
export const setAuthData = () => {};
export const clearAuthData = () => {};