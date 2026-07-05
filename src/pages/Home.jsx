import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import TrainingForm from '../components/TrainingForm';
import TrainingCards from '../components/TrainingCards';
import FaqAccordion from '../components/FaqAccordion';
import Footer from '../components/Footer';
import BackToTop from '../components/BackToTop';
import {
  fetchAllRecords,
  fetchEmployeeRecords,
  saveTrainingRecord,
  loginUser,
  registerUser,
  fetchPendingEmployees,
  approveEmployee,
  rejectEmployee,
  provisionUser,
  getAuthUser,
  clearAuthData,
  deleteTrainingRecord,
  completeTrainingRecord,
  decideApproval
} from "../services/trainingService";

import { AlertCircle, CheckCircle2, User, Shield, Lock, Eye, EyeOff, X } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

const emptyForm = {
  employeeName: '',
  employeeId: '',
  trainingModule: '',
  trainingType: '',
  status: '',
  issueDate: '',
  instructor: '',
  certificateNumber: '',
  certificateFile: '',
  remarks: ''
};

// Used by the registration form only — training record submission no longer
// collects department (it's sourced from the employee's own registration).
const DEPARTMENTS = [
  'Finance Department',
  'Agriculture',
  'Agriculture (Horticulture)',
  'Information Technology',
  'PWD (Public Works Department)',
  'Health & Family Welfare',
  'School Education',
  'Treasury Department',
  'Panchayats'
];

export default function Home() {
  const initialUser = getAuthUser();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [role, setRole] = useState(initialUser && initialUser.role === 'ADMIN' ? 'admin' : 'user');
  const [formData, setFormData] = useState(emptyForm);
  const [records, setRecords] = useState([]);
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', message: '' }
  const [loading, setLoading] = useState(false);

  // Login Modal state
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginData, setLoginData] = useState({ employeeId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Self-registration modal state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerData, setRegisterData] = useState({ employeeId: '', employeeName: '', department: '', password: '' });
  const [registerError, setRegisterError] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Admin: pending self-registrations awaiting approval
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingRoleChoice, setPendingRoleChoice] = useState({}); // { [employeeId]: 'USER' | 'ADMIN' }

  // Provisioning state
  const [provisionData, setProvisionData] = useState({ employeeId: '', password: '', role: 'USER' });
  const [provLoading, setProvLoading] = useState(false);

  // Refs for smooth scroll
  const formRef = useRef(null);
  const recordsRef = useRef(null);

  // Keep the portal-view toggle in sync whenever auth state changes,
  // instead of manually setting it in every login/logout handler.
  useEffect(() => {
    setRole(currentUser && currentUser.role === 'ADMIN' ? 'admin' : 'user');
  }, [currentUser]);

  // For non-admin users, the Employee ID/Name fields are locked to their own
  // identity (the backend now rejects submissions under someone else's ID),
  // so keep the form pre-filled and in sync whenever the logged-in user changes.
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      setFormData((prev) => ({
        ...prev,
        employeeId: currentUser.employeeId,
        employeeName: currentUser.employeeName,
      }));
    }
  }, [currentUser]);

  // Load pending self-registrations whenever an admin is viewing the admin portal.
  useEffect(() => {
    const loadPending = async () => {
      if (!currentUser || currentUser.role !== 'ADMIN' || role !== 'admin') return;
      setPendingLoading(true);
      try {
        const data = await fetchPendingEmployees();
        setPendingEmployees(data);
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          setCurrentUser(null);
        }
        // Non-fatal otherwise — the admin panel just shows an empty pending list.
      } finally {
        setPendingLoading(false);
      }
    };
    loadPending();
  }, [currentUser, role]);

  // Initialize records from localStorage or JSON file
  useEffect(() => {
    const loadRecords = async () => {
      if (!currentUser) {
        setRecords([]);
        return;
      }
      try {
        let data;
        if (currentUser.role === 'ADMIN') {
          data = await fetchAllRecords();
        } else {
          data = await fetchEmployeeRecords(currentUser.employeeId);
        }
        setRecords(data);
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          setCurrentUser(null);
          triggerNotification("error", "Your session has expired. Please log in again.");
        } else {
          triggerNotification("error", "Unable to load training records");
        }
      }
    };

    loadRecords();
  }, [currentUser, role]);


  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFormPreservingIdentity = () => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      setFormData({ ...emptyForm, employeeId: currentUser.employeeId, employeeName: currentUser.employeeName });
    } else {
      setFormData(emptyForm);
    }
  };

  const handleFormReset = () => {
    resetFormPreservingIdentity();
    triggerNotification('info', 'Form input fields cleared.');
  };

  const handleFormSubmit = async () => {
    if (!currentUser) {
      triggerNotification("error", "Please log in before submitting a training record.");
      setLoginModalOpen(true);
      return;
    }
    try {
      setLoading(true);

      await saveTrainingRecord(formData);

      if (currentUser) {
        const latestRecords = currentUser.role === 'ADMIN'
          ? await fetchAllRecords()
          : await fetchEmployeeRecords(currentUser.employeeId);
        setRecords(latestRecords);
      }

      triggerNotification("success", "Training record saved successfully");
      resetFormPreservingIdentity();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setCurrentUser(null);
        triggerNotification("error", "Your session has expired. Please log in again.");
      } else {
        triggerNotification("error", error.message || "Failed to save training record");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const data = await loginUser(loginData.employeeId, loginData.password);
      setCurrentUser(data);
      setLoginModalOpen(false);
      setLoginData({ employeeId: '', password: '' });
      triggerNotification('success', `Welcome back, ${data.employeeName}!`);
    } catch (err) {
      // Login is intentionally generic about *why* it failed (wrong password vs.
      // account still pending vs. rejected all return the same 401), so we add
      // a soft hint here rather than the backend leaking account state.
      setLoginError(
        (err.message || 'Login failed. Check your credentials.') +
        ' If you recently registered, your account may still be awaiting admin approval.'
      );
    }
  };

  const handleLogout = () => {
    clearAuthData();
    setCurrentUser(null);
    triggerNotification('info', 'Logged out successfully.');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    setRegisterLoading(true);
    try {
      const message = await registerUser(
        registerData.employeeId,
        registerData.employeeName,
        registerData.department,
        registerData.password
      );
      setRegisterSuccess(message || 'Registration submitted. An administrator will review your account.');
      setRegisterData({ employeeId: '', employeeName: '', department: '', password: '' });
    } catch (err) {
      setRegisterError(err.message || 'Registration failed.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleApprove = async (employeeId) => {
    const chosenRole = pendingRoleChoice[employeeId] || 'USER';
    try {
      await approveEmployee(employeeId, chosenRole);
      setPendingEmployees((prev) => prev.filter((p) => p.employeeId !== employeeId));
      triggerNotification('success', `Approved ${employeeId} as ${chosenRole}`);
    } catch (err) {
      triggerNotification('error', err.message || 'Failed to approve employee.');
    }
  };

  const handleReject = async (employeeId) => {
    try {
      await rejectEmployee(employeeId);
      setPendingEmployees((prev) => prev.filter((p) => p.employeeId !== employeeId));
      triggerNotification('info', `Rejected ${employeeId}`);
    } catch (err) {
      triggerNotification('error', err.message || 'Failed to reject employee.');
    }
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setProvLoading(true);
    try {
      await provisionUser(provisionData.employeeId, provisionData.password, provisionData.role);
      triggerNotification('success', `Access credentials provisioned for ${provisionData.employeeId}`);
      setProvisionData({ employeeId: '', password: '', role: 'USER' });
    } catch (err) {
      triggerNotification('error', err.message || 'Provisioning failed.');
    } finally {
      setProvLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    // Owner-only now — admins review records via approve/invalidate instead
    // of deleting (backend also enforces this; the button is simply hidden
    // for admins in TrainingCards).
    const updated = records.filter(
      rec => rec.recordId !== recordId
    );
    setRecords(updated);

    try {
      await deleteTrainingRecord(recordId);
      triggerNotification(
        "success",
        "Record deleted successfully."
      );
    } catch (error) {
      triggerNotification(
        "error",
        "Failed to delete training record: " + error.message
      );
    }
  };

  // Admin approves or invalidates a COMPLETED record.
  const handleApprovalDecision = async (recordId, decision, remarks) => {
    try {
      await decideApproval(recordId, decision, remarks);
      setRecords((prev) =>
        prev.map((rec) =>
          rec.recordId === recordId
            ? { ...rec, approvalStatus: decision, adminRemarks: decision === 'INVALID' ? remarks : null }
            : rec
        )
      );
      triggerNotification('success', `Record marked ${decision === 'APPROVED' ? 'Approved' : 'Invalid'}.`);
    } catch (error) {
      triggerNotification('error', error.message || 'Failed to update approval status.');
    }
  };

  // Employee completes a previously IN_PROGRESS record: uploads the
  // certificate (now mandatory) and the record moves to COMPLETED, awaiting
  // admin review.
  const handleCompleteRecord = async (recordId, completionData) => {
    try {
      const updated = await completeTrainingRecord(recordId, completionData);
      setRecords((prev) =>
        prev.map((rec) => (rec.recordId === recordId ? updated : rec))
      );
      triggerNotification('success', 'Certificate uploaded — record marked Completed and sent for approval.');
    } catch (error) {
      triggerNotification('error', error.message || 'Failed to complete training record.');
    }
  };

  const scrollToRef = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gov-bg w-full">
      {/* Global Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onLoginClick={() => setLoginModalOpen(true)}
      />

      {/* Hero Banner */}
      <Hero
        onScrollToForm={() => scrollToRef(formRef)}
        onScrollToCards={() => scrollToRef(recordsRef)}
      />

      {/* Main Page Layout Container */}
      <main className="flex-grow max-w-7xl mx-auto px-4 md:px-8 py-10 w-full flex flex-col gap-10">

        {/* Floating Toast Notification Bar */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`p-4 border rounded-[4px] shadow-sm flex items-start gap-3 w-full max-w-2xl mx-auto select-none ${notification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : notification.type === 'error'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-blue-50 border-blue-300 text-blue-800'
                }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-grow text-xs md:text-sm font-semibold">
                {notification.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Switcher Card */}
        <div className="bg-white border border-gov-border rounded-[4px] shadow-xs p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-up">
          <div className="text-left">
            <h3 className="text-sm font-extrabold text-primary-blue uppercase tracking-wider flex items-center gap-1.5">
              Select Portal Profile
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Switch roles to either register your own training certificate or audit employee submissions.
            </p>
          </div>

          <div className="flex items-center gap-2 border border-gov-border rounded-[4px] p-1 bg-gov-bg/40 w-full sm:w-auto">
            <button
              onClick={() => {
                if (currentUser && currentUser.role === 'ADMIN') {
                  triggerNotification('info', 'You are currently logged in as a Reporting Officer (Admin). To view the Employee Portal, please logout first.');
                  return;
                }
                setRole('user');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-extrabold px-5 py-2.5 rounded-[3px] transition-all cursor-pointer ${role === 'user'
                  ? 'bg-primary-blue text-white shadow-xs'
                  : 'text-[#4A5568] hover:text-primary-blue'
                } ${currentUser && currentUser.role === 'ADMIN' ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={currentUser && currentUser.role === 'ADMIN' ? 'Logout to switch to Employee Portal' : ''}
            >
              <User className="w-4 h-4" />
              Employee Portal (User)
            </button>

            <button
              onClick={() => {
                if (currentUser && currentUser.role !== 'ADMIN') {
                  triggerNotification('error', 'Access Denied: You are currently logged in as an Employee. To access the Admin Portal, please logout first.');
                  return;
                }
                if (!currentUser) {
                  triggerNotification('info', 'Please log in to access the Admin / Reporting Officer portal.');
                  setLoginModalOpen(true);
                } else {
                  setRole('admin');
                }
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-extrabold px-5 py-2.5 rounded-[3px] transition-all cursor-pointer ${role === 'admin'
                  ? 'bg-[#E08500] text-white shadow-xs'
                  : 'text-[#4A5568] hover:text-[#E08500]'
                } ${currentUser && currentUser.role !== 'ADMIN' ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={currentUser && currentUser.role !== 'ADMIN' ? 'Logout to switch to Admin Portal' : ''}
            >
              <Shield className="w-4 h-4" />
              Reporting Officer (Admin)
            </button>
          </div>
        </div>

        {/* Section: Pending Self-Registrations (Admin) */}
        {role === 'admin' && currentUser && (
          <div className="bg-white border border-gov-border rounded-[4px] shadow-xs p-6 animate-fade-up">
            <div className="border-b border-gov-border pb-3 mb-4">
              <h2 className="text-md font-extrabold text-primary-blue flex items-center gap-2">
                <span className="w-1.5 h-5 bg-accent-orange inline-block rounded-sm"></span>
                Pending Registrations
                {pendingEmployees.length > 0 && (
                  <span className="bg-accent-orange text-[#1a1a2e] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {pendingEmployees.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Employees who self-registered and are awaiting a role assignment before they can log in.
              </p>
            </div>

            {pendingLoading ? (
              <p className="text-xs text-text-secondary">Loading pending registrations...</p>
            ) : pendingEmployees.length === 0 ? (
              <p className="text-xs text-text-secondary italic">No registrations awaiting approval.</p>
            ) : (
              <div className="space-y-3">
                {pendingEmployees.map((p) => (
                  <div
                    key={p.employeeId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gov-border rounded-[4px] p-3 bg-gov-bg/20"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-primary-blue truncate">{p.employeeName}</p>
                      <p className="text-xs text-text-secondary">
                        ID: <span className="font-mono">{p.employeeId}</span>
                        {p.department && <> &middot; {p.department}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={pendingRoleChoice[p.employeeId] || 'USER'}
                        onChange={(e) =>
                          setPendingRoleChoice({ ...pendingRoleChoice, [p.employeeId]: e.target.value })
                        }
                        className="border border-gov-border rounded-[4px] bg-white text-text-primary text-xs px-2 py-2 focus:outline-none focus:border-primary-blue"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleApprove(p.employeeId)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-2 px-3 rounded-[4px] transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(p.employeeId)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider py-2 px-3 rounded-[4px] transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section: User Provisioning for Admin */}
        {role === 'admin' && currentUser && (
          <div className="bg-white border border-gov-border rounded-[4px] shadow-xs p-6 animate-fade-up">
            <div className="border-b border-gov-border pb-3 mb-4">
              <h2 className="text-md font-extrabold text-primary-blue flex items-center gap-2">
                <span className="w-1.5 h-5 bg-[#E08500] inline-block rounded-sm"></span>
                Provision Employee Login Access
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Directly create or update a login for a known employee, bypassing self-registration.
                For employees who registered themselves, use the Pending Registrations panel above instead.
              </p>
            </div>
            <form onSubmit={handleProvisionSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="provEmployeeId" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                  Employee ID
                </label>
                <input
                  type="text"
                  id="provEmployeeId"
                  required
                  placeholder="e.g. EMP002"
                  value={provisionData.employeeId}
                  onChange={(e) => setProvisionData({ ...provisionData, employeeId: e.target.value.toUpperCase() })}
                  className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2.5 focus:bg-white focus:outline-none focus:border-primary-blue transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="provPassword" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  id="provPassword"
                  required
                  placeholder="Create password"
                  value={provisionData.password}
                  onChange={(e) => setProvisionData({ ...provisionData, password: e.target.value })}
                  className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2.5 focus:bg-white focus:outline-none focus:border-primary-blue transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="provRole" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                  Role
                </label>
                <select
                  id="provRole"
                  value={provisionData.role}
                  onChange={(e) => setProvisionData({ ...provisionData, role: e.target.value })}
                  className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2.5 focus:bg-white focus:outline-none focus:border-primary-blue transition-all"
                >
                  <option value="USER">USER (Employee)</option>
                  <option value="ADMIN">ADMIN (Reporting Officer)</option>
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={provLoading}
                  className="w-full bg-[#E08500] hover:bg-[#C07200] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-[4px] transition-colors cursor-pointer"
                >
                  {provLoading ? "Provisioning..." : "Provision Access"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Section: Form */}
        {role === 'user' && (
          <div ref={formRef} className="w-full scroll-mt-28">
            {currentUser ? (
              <TrainingForm
                formData={formData}
                onChange={handleFormChange}
                onReset={handleFormReset}
                onSubmit={handleFormSubmit}
                loading={loading}
                lockIdentity={currentUser.role !== 'ADMIN'}
              />
            ) : (
              <div className="bg-white border border-dashed border-gov-border rounded-[4px] p-8 text-center">
                <Lock className="w-6 h-6 text-primary-blue/60 mx-auto mb-2" />
                <p className="text-sm font-semibold text-primary-blue">Login required to submit a training record</p>
                <p className="text-xs text-text-secondary mt-1 mb-4">
                  You can browse records below, but submitting requires an authenticated session.
                </p>
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="bg-primary-blue hover:bg-[#1C355E] text-white font-bold text-xs uppercase tracking-wider py-2.5 px-6 rounded-[4px] transition-colors cursor-pointer"
                >
                  Login
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section: Recent Listings Cards/Table */}
        <div ref={recordsRef} className="scroll-mt-28">
          <TrainingCards
            records={records}
            onDeleteRecord={handleDeleteRecord}
            onApprovalDecision={handleApprovalDecision}
            onCompleteRecord={handleCompleteRecord}
            role={role}
            currentUserEmployeeId={currentUser ? (currentUser.role === 'ADMIN' ? '' : currentUser.employeeId) : formData.employeeId}
          />
        </div>

        {/* Section: FAQs */}
        <div id="faq" className="scroll-mt-28">
          <FaqAccordion />
        </div>
      </main>

      {/* Login Modal */}
      <AnimatePresence>
        {loginModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gov-border rounded-[4px] shadow-lg w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-primary-blue text-white p-5 flex items-center justify-between border-b border-[#1C355E]">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-accent-orange" />
                  <span className="text-sm font-extrabold uppercase tracking-wider">
                    NextGen HRMS Portal Login
                  </span>
                </div>
                <button
                  onClick={() => {
                    setLoginModalOpen(false);
                    setLoginError('');
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
                {loginError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-[3px] text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="loginEmployeeId" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    id="loginEmployeeId"
                    required
                    placeholder="Enter Employee ID (e.g. EMP001)"
                    value={loginData.employeeId}
                    onChange={(e) => setLoginData({ ...loginData, employeeId: e.target.value.toUpperCase() })}
                    className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2.5 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5 relative">
                  <label htmlFor="loginPassword" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="loginPassword"
                      required
                      placeholder="Enter password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="w-full border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm pl-3 pr-10 py-2.5 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-primary-blue cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-[#f5a623] hover:bg-[#e09516] text-[#1a1a2e] font-extrabold text-sm uppercase tracking-wider py-3 rounded-[4px] transition-colors cursor-pointer shadow-sm active:scale-98"
                  >
                    Authenticate Session
                  </button>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginModalOpen(false);
                      setLoginError('');
                      setRegisterModalOpen(true);
                    }}
                    className="text-xs font-semibold text-primary-blue hover:underline cursor-pointer"
                  >
                    New employee? Register here
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Modal */}
      <AnimatePresence>
        {registerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gov-border rounded-[4px] shadow-lg w-full max-w-md overflow-hidden"
            >
              <div className="bg-primary-blue text-white p-5 flex items-center justify-between border-b border-[#1C355E]">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-accent-orange" />
                  <span className="text-sm font-extrabold uppercase tracking-wider">
                    Employee Self-Registration
                  </span>
                </div>
                <button
                  onClick={() => {
                    setRegisterModalOpen(false);
                    setRegisterError('');
                    setRegisterSuccess('');
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {registerSuccess ? (
                <div className="p-6 space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-[3px] text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{registerSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterModalOpen(false);
                      setRegisterSuccess('');
                      setLoginModalOpen(true);
                    }}
                    className="w-full bg-primary-blue hover:bg-[#1C355E] text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-[4px] transition-colors cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
                  <p className="text-xs text-text-secondary -mt-1">
                    Your account will be created as pending — an administrator must approve it
                    and assign a role before you can log in.
                  </p>

                  {registerError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-[3px] text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{registerError}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="regEmployeeId" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      id="regEmployeeId"
                      required
                      placeholder="e.g. TE-030316"
                      value={registerData.employeeId}
                      onChange={(e) => setRegisterData({ ...registerData, employeeId: e.target.value.toUpperCase() })}
                      className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2.5 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="regEmployeeName" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="regEmployeeName"
                      required
                      placeholder="e.g. Bikas Mallik"
                      value={registerData.employeeName}
                      onChange={(e) => setRegisterData({ ...registerData, employeeName: e.target.value })}
                      className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2.5 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="regDepartment" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                      Department
                    </label>
                    <select
                      id="regDepartment"
                      required
                      value={registerData.department}
                      onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
                      className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2.5 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map((dep) => (
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="regPassword" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        id="regPassword"
                        required
                        minLength={8}
                        placeholder="At least 8 characters"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="w-full border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm pl-3 pr-10 py-2.5 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-primary-blue cursor-pointer"
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={registerLoading}
                      className="w-full bg-primary-blue hover:bg-[#1C355E] disabled:opacity-50 text-white font-extrabold text-sm uppercase tracking-wider py-3 rounded-[4px] transition-colors cursor-pointer shadow-sm active:scale-98"
                    >
                      {registerLoading ? "Submitting..." : "Submit Registration"}
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterModalOpen(false);
                        setRegisterError('');
                        setLoginModalOpen(true);
                      }}
                      className="text-xs font-semibold text-primary-blue hover:underline cursor-pointer"
                    >
                      Already have an approved account? Log in
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Footer */}
      <Footer />

      {/* Scroll Assistant */}
      <BackToTop />
    </div>
  );
}