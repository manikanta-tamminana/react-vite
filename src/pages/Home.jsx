import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import TrainingForm from '../components/TrainingForm';
import TrainingCards from '../components/TrainingCards';
import FaqAccordion from '../components/FaqAccordion';
import Footer from '../components/Footer';
import BackToTop from '../components/BackToTop';
import mockRecords from '../data/trainingData.json';
import {
  fetchAllRecords,
  fetchEmployeeRecords,
  saveTrainingRecord,
  loginUser,
  provisionUser,
  getAuthUser,
  clearAuthData,
  deleteTrainingRecord
} from "../services/trainingService";

import { AlertCircle, CheckCircle2, User, Shield, Lock, Eye, EyeOff, X } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

const emptyForm = {
  employeeName: '',
  employeeId: '',
  department: '',
  trainingModule: '',
  trainingType: '',
  status: '',
  issueDate: '',
  instructor: '',
  certificateNumber: '',
  certificateFile: '',
  remarks: ''
};

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

  // Provisioning state
  const [provisionData, setProvisionData] = useState({ employeeId: '', password: '', role: 'USER' });
  const [provLoading, setProvLoading] = useState(false);

  // Refs for smooth scroll
  const formRef = useRef(null);
  const recordsRef = useRef(null);

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
        triggerNotification(
          "error",
          "Unable to load training records"
        );
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

  const handleFormReset = () => {
    setFormData(emptyForm);
    triggerNotification('info', 'Form input fields cleared.');
  };

  const handleFormSubmit = async () => {
    try {
      setLoading(true);

      try {
        await saveTrainingRecord(formData);

        if (currentUser) {
          let latestRecords;
          if (currentUser.role === 'ADMIN') {
            latestRecords = await fetchAllRecords();
          } else {
            latestRecords = await fetchEmployeeRecords(currentUser.employeeId);
          }
          setRecords(latestRecords);
        }

        triggerNotification(
          "success",
          "Training record saved successfully"
        );
      } catch (backendError) {
        // Fallback for offline preview/mock mode
        console.warn("Backend is offline, saving locally for preview", backendError);
        const newRecord = {
          recordId: Date.now(),
          employeeName: formData.employeeName,
          employeeId: formData.employeeId,
          department: formData.department,
          status: formData.status,
          issueDate: formData.issueDate,
          instructorName: formData.instructor,
          certificateNumber: formData.certificateNumber,
          remarks: formData.remarks,
          certificateFile: formData.certificateFile instanceof File ? formData.certificateFile.name : formData.certificateFile
        };
        setRecords([newRecord, ...records]);
        triggerNotification(
          "success",
          "Training record saved successfully (Preview Mode - Database Offline)"
        );
      }

      setFormData(emptyForm);
    } catch (error) {
      triggerNotification(
        "error",
        error.message || "Failed to save training record"
      );
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
      setRole(data.role.toLowerCase());
      setLoginModalOpen(false);
      setLoginData({ employeeId: '', password: '' });
      triggerNotification('success', `Welcome back, ${data.employeeName}!`);
    } catch (err) {
      // Fallback for offline preview/mock mode
      if (loginData.employeeId === 'EMP001' && loginData.password === 'password') {
        const mockAdmin = {
          employeeId: 'EMP001',
          employeeName: 'Mock Test Admin',
          role: 'ADMIN'
        };
        setCurrentUser(mockAdmin);
        setRole('admin');
        setLoginModalOpen(false);
        setLoginData({ employeeId: '', password: '' });
        setRecords(mockRecords.map((r, idx) => ({ ...r, recordId: idx + 1 })));
        triggerNotification('success', 'Logged in using Mock Admin Session (Database offline).');
      } else if (loginData.employeeId === 'TE-030316' && loginData.password === 'password') {
        const mockUser = {
          employeeId: 'TE-030316',
          employeeName: 'Bikas Mallik',
          role: 'USER'
        };
        setCurrentUser(mockUser);
        setRole('user');
        setLoginModalOpen(false);
        setLoginData({ employeeId: '', password: '' });
        setRecords(mockRecords.map((r, idx) => ({ ...r, recordId: idx + 1 })));
        triggerNotification('success', 'Logged in using Mock Employee Session (Database offline).');
      } else {
        setLoginError(err.message || 'Login failed. Check your credentials.');
      }
    }
  };

  const handleLogout = () => {
    clearAuthData();
    setCurrentUser(null);
    setRole('user');
    triggerNotification('info', 'Logged out successfully.');
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
    console.log("Received ID for deletion:", recordId);

    // Optimistic UI Update (immediate removal from list, zero lag!)
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

        {/* Section: User Provisioning for Admin */}
        {role === 'admin' && (
          <div className="bg-white border border-gov-border rounded-[4px] shadow-xs p-6 animate-fade-up">
            <div className="border-b border-gov-border pb-3 mb-4">
              <h2 className="text-md font-extrabold text-primary-blue flex items-center gap-2">
                <span className="w-1.5 h-5 bg-[#E08500] inline-block rounded-sm"></span>
                Provision Employee Login Access
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Set roles and passwords for registered employees to enable portal logins.
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
                  onChange={(e) => setProvisionData({ ...provisionData, employeeId: e.target.value })}
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
            <TrainingForm
              formData={formData}
              onChange={handleFormChange}
              onReset={handleFormReset}
              onSubmit={handleFormSubmit}
              loading={loading}
            />
          </div>
        )}

        {/* Section: Recent Listings Cards/Table */}
        <div ref={recordsRef} className="scroll-mt-28">
          <TrainingCards
            records={records}
            onDeleteRecord={handleDeleteRecord}
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
                    onChange={(e) => setLoginData({ ...loginData, employeeId: e.target.value })}
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
              </form>
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
