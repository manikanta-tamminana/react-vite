import React, { useState } from 'react';
import { LayoutGrid, Table, Search, Trash2, Award, Calendar, FileText, User, Upload, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadCertificate } from '../services/trainingService';

export default function TrainingCards({ records, onDeleteRecord, onApprovalDecision, onCompleteRecord, role = 'user', currentUserEmployeeId = '' }) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('All');

  // Per-record local state: admin's pending decision (before it's saved), and
  // which record (if any) is currently showing the "Upload & Complete" panel.
  const [pendingDecision, setPendingDecision] = useState({}); // { [recordId]: { decision, remarks } }
  const [completingRecordId, setCompletingRecordId] = useState(null);
  const [completionForm, setCompletionForm] = useState({ certificateNumber: '', issueDate: '', remarks: '', certificateFile: null });

  const isAdmin = role === 'admin';

  // Extract unique employee names for Admin dropdown selection
  const uniqueEmployeeNames = Array.from(
    new Set(
      records.map((rec) => rec.employeeName || '').filter(Boolean)
    )
  );

  // Filter logic
  const filteredRecords = records.filter((rec) => {
    const employeeName = rec.employeeName || "";
    const employeeId = rec.employeeId || "";
    const trainingModule = rec.moduleName || "";

    const matchesSearch =
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainingModule.toLowerCase().includes(searchTerm.toLowerCase());

    // Admin filters by training status (In Progress/Completed) since they
    // need visibility into records at every stage, including in-progress ones.
    // Employees filter by the admin's approval verdict on their own records
    // instead — that's what matters to them once a cert is submitted.
    const matchesStatus = isAdmin
      ? (statusFilter === 'All' || rec.status === statusFilter)
      : (statusFilter === 'All' || rec.approvalStatus === statusFilter);

    const matchesRoleFilter = isAdmin
      ? (selectedEmployeeName === 'All' || employeeName === selectedEmployeeName)
      : (!currentUserEmployeeId || employeeId.toLowerCase() === currentUserEmployeeId.toLowerCase());

    return matchesSearch && matchesStatus && matchesRoleFilter;
  });

  // Backend Status enum is IN_PROGRESS / COMPLETED — map to friendly labels here.
  const statusLabel = (status) => {
    switch (status) {
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      default: return status || 'Unknown';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Admin's approval verdict — only meaningful once a record is COMPLETED.
  const approvalLabel = (status) => {
    switch (status) {
      case 'APPROVED': return 'Approved';
      case 'INVALID': return 'Invalid';
      default: return 'Waiting for Approval';
    }
  };

  const getApprovalBadgeClass = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INVALID': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  const getApprovalIcon = (status) => {
    if (status === 'APPROVED') return <CheckCircle2 className="w-3 h-3" />;
    if (status === 'INVALID') return <XCircle className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const getCardBorderColor = (status) => {
    if (status === 'IN_PROGRESS') return 'border-l-[4px] border-l-accent-orange';
    return 'border-l-[4px] border-l-primary-blue';
  };

  // ---- Admin approval controls ----

  const setDecisionField = (recordId, field, value) => {
    setPendingDecision((prev) => ({
      ...prev,
      [recordId]: { decision: 'APPROVED', remarks: '', ...prev[recordId], [field]: value }
    }));
  };

  const submitDecision = (recordId) => {
    const pending = pendingDecision[recordId] || { decision: 'APPROVED', remarks: '' };
    if (pending.decision === 'INVALID' && !pending.remarks.trim()) {
      return; // button is disabled in this case too; guard just in case
    }
    onApprovalDecision(recordId, pending.decision, pending.remarks);
    setPendingDecision((prev) => {
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
  };

  // ---- Employee "upload & complete" controls ----

  const openCompletionPanel = (recordId) => {
    setCompletingRecordId(recordId);
    setCompletionForm({ certificateNumber: '', issueDate: '', remarks: '', certificateFile: null });
  };

  const closeCompletionPanel = () => {
    setCompletingRecordId(null);
  };

  const submitCompletion = (recordId) => {
    if (!completionForm.certificateFile || !completionForm.certificateNumber) return;
    onCompleteRecord(recordId, completionForm);
    setCompletingRecordId(null);
  };

  // ---- Shared sub-renders ----

  const renderApprovalControls = (rec) => {
    // Admin can only approve/invalidate a record that's actually COMPLETED —
    // there's nothing to review on an in-progress one with no certificate yet.
    if (rec.status !== 'COMPLETED') {
      return (
        <div className="text-[11px] text-text-secondary italic border border-dashed border-gov-border rounded-[3px] py-2 px-3 text-center">
          Awaiting certificate upload — nothing to review yet.
        </div>
      );
    }

    const pending = pendingDecision[rec.recordId] || { decision: 'APPROVED', remarks: '' };
    const invalidNeedsRemarks = pending.decision === 'INVALID' && !pending.remarks.trim();

    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={pending.decision}
            onChange={(e) => setDecisionField(rec.recordId, 'decision', e.target.value)}
            className="flex-1 border border-gov-border rounded-[3px] text-xs px-2 py-1.5 focus:outline-none focus:border-primary-blue"
          >
            <option value="APPROVED">Approved</option>
            <option value="INVALID">Invalid</option>
          </select>
          <button
            type="button"
            onClick={() => submitDecision(rec.recordId)}
            disabled={invalidNeedsRemarks}
            className="bg-primary-blue hover:bg-[#1C355E] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
        {pending.decision === 'INVALID' && (
          <textarea
            rows={2}
            placeholder="Remarks required when marking Invalid..."
            value={pending.remarks}
            onChange={(e) => setDecisionField(rec.recordId, 'remarks', e.target.value)}
            className="w-full border border-gov-border rounded-[3px] text-xs px-2 py-1.5 focus:outline-none focus:border-primary-blue resize-none"
          />
        )}
      </div>
    );
  };

  const renderCompletionControls = (rec) => {
    const isOwnIncomplete = !isAdmin && rec.status === 'IN_PROGRESS';
    if (!isOwnIncomplete) return null;

    if (completingRecordId !== rec.recordId) {
      return (
        <button
          type="button"
          onClick={() => openCompletionPanel(rec.recordId)}
          className="flex-1 flex items-center justify-center gap-1 border border-primary-blue/40 hover:bg-primary-blue/5 text-primary-blue font-bold text-xs py-2 rounded-[3px] transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload & Complete
        </button>
      );
    }

    return (
      <div className="w-full flex flex-col gap-2 bg-gov-bg/20 border border-gov-border rounded-[3px] p-3">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setCompletionForm({ ...completionForm, certificateFile: e.target.files[0] || null })}
          className="text-xs"
        />
        <input
          type="text"
          placeholder="Certificate Number"
          value={completionForm.certificateNumber}
          onChange={(e) => setCompletionForm({ ...completionForm, certificateNumber: e.target.value })}
          className="border border-gov-border rounded-[3px] text-xs px-2 py-1.5 focus:outline-none focus:border-primary-blue"
        />
        <input
          type="date"
          value={completionForm.issueDate}
          onChange={(e) => setCompletionForm({ ...completionForm, issueDate: e.target.value })}
          className="border border-gov-border rounded-[3px] text-xs px-2 py-1.5 focus:outline-none focus:border-primary-blue"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => submitCompletion(rec.recordId)}
            disabled={!completionForm.certificateFile || !completionForm.certificateNumber}
            className="flex-1 bg-primary-blue hover:bg-[#1C355E] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-1.5 rounded-[3px] transition-colors cursor-pointer"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={closeCompletionPanel}
            className="flex-1 border border-gov-border text-text-secondary font-bold text-xs py-1.5 rounded-[3px] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white border border-gov-border rounded-[4px] shadow-xs p-6 md:p-8 animate-fade-up">
      {/* Title & View Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gov-border pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-primary-blue flex items-center gap-2">
            <span className="w-1.5 h-6 bg-accent-orange inline-block rounded-sm"></span>
            {isAdmin ? 'Audit Training Records' : 'My Training Records'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isAdmin
              ? 'Reporting Officer audit panel: review and approve/invalidate certificate uploads across all employees, including those still in progress.'
              : 'Displaying your active training registrations and digital certificates.'}
          </p>
        </div>

        <div className="flex items-center gap-2 border border-gov-border rounded-[4px] p-1 bg-gov-bg/40">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-primary-blue text-white shadow-xs' : 'text-text-secondary hover:text-primary-blue'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid View
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-primary-blue text-white shadow-xs' : 'text-text-secondary hover:text-primary-blue'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Table View
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4 mb-6`}>
        {/* Search — admin only. An employee's own record view is always
            scoped to themselves, so searching "by employee name" here would
            be searching for their own name, which is pointless. */}
        {isAdmin && (
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Employee Name, ID, or Module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gov-border rounded-[4px] text-sm focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue bg-gov-bg/10 focus:bg-white transition-all"
            />
          </div>
        )}

        {isAdmin && (
          <div>
            <select
              value={selectedEmployeeName}
              onChange={(e) => setSelectedEmployeeName(e.target.value)}
              className="w-full px-3 py-2 border border-gov-border rounded-[4px] text-sm focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue bg-gov-bg/10 focus:bg-white transition-all font-semibold text-primary-blue"
            >
              <option value="All">All Employees</option>
              {uniqueEmployeeNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter — admin filters by training progress; employees
            filter by the admin's approval verdict on their own records. */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gov-border rounded-[4px] text-sm focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue bg-gov-bg/10 focus:bg-white transition-all"
          >
            {isAdmin ? (
              <>
                <option value="All">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
              </>
            ) : (
              <>
                <option value="All">All</option>
                <option value="APPROVED">Approved</option>
                <option value="INVALID">Invalid</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Main Content (Listings) */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gov-border rounded-[4px] text-text-secondary">
          No training records found matching your filters.
        </div>
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          {viewMode === 'grid' ? (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredRecords.map((rec, idx) => {
                  const formattedIdx = String(idx + 1).padStart(2, '0');
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      key={rec.recordId}
                      className={`bg-white border border-gov-border rounded-[4px] shadow-xs hover:shadow-md transition-shadow flex flex-col relative overflow-hidden ${getCardBorderColor(rec.status)}`}
                    >
                      {/* Index & Status badges */}
                      <div className="px-5 pt-5 pb-2 flex justify-between items-start gap-2">
                        <span className="text-3xl font-extrabold text-[#D4DBE8] font-mono leading-none">
                          {formattedIdx}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[3px] border ${getStatusBadgeClass(rec.status)}`}>
                            {statusLabel(rec.status)}
                          </span>
                          {rec.status === 'COMPLETED' && (
                            <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[3px] border ${getApprovalBadgeClass(rec.approvalStatus)}`}>
                              {getApprovalIcon(rec.approvalStatus)}
                              {approvalLabel(rec.approvalStatus)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="px-5 pb-5 flex-grow flex flex-col">
                        <h3 className="text-md font-extrabold text-primary-blue leading-snug mb-3">
                          {rec.moduleName}
                        </h3>

                        <div className="space-y-2 text-xs text-text-secondary flex-grow">
                          <div className="flex items-center gap-2 pb-1.5 border-b border-gov-bg/60">
                            <User className="w-3.5 h-3.5 text-primary-blue/70" />
                            <div>
                              <span className="font-semibold text-text-primary block">{rec.employeeName}</span>
                              <span className="text-[10px] text-text-secondary uppercase">ID: {rec.employeeId} • {rec.department}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-text-secondary/70" />
                              <div>
                                <span className="text-[10px] text-text-secondary uppercase block">Issued</span>
                                <span className="font-medium text-text-primary">{rec.issueDate || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-text-secondary/70" />
                              <div>
                                <span className="text-[10px] text-text-secondary uppercase block">Attachment</span>
                                {rec.fileName ? (
                                  <button
                                    type="button"
                                    onClick={() => downloadCertificate(rec.recordId, rec.fileName)}
                                    className="font-semibold text-primary-blue hover:underline block max-w-[125px] truncate text-left cursor-pointer"
                                    title={`View ${rec.fileName}`}
                                  >
                                    {rec.fileName}
                                  </button>
                                ) : (
                                  <span className="font-semibold text-text-secondary block">No file</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {rec.certificateNumber && (
                            <div className="bg-gov-bg/30 p-2 rounded-[3px] border border-gov-border/40 mt-3">
                              <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-0.5">
                                <Award className="w-3.5 h-3.5 text-accent-orange" />
                                <span>Certificate No</span>
                              </div>
                              <span className="font-mono text-xs text-primary-blue font-semibold">{rec.certificateNumber}</span>
                            </div>
                          )}

                          {rec.remarks && (
                            <div className="text-[11px] italic bg-gov-bg/10 p-2 rounded-[3px] border-l-2 border-l-gov-border mt-2 leading-relaxed">
                              "{rec.remarks}"
                            </div>
                          )}

                          {rec.status === 'COMPLETED' && rec.approvalStatus === 'INVALID' && rec.adminRemarks && (
                            <div className="text-[11px] bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded-[3px] mt-2 leading-relaxed">
                              <span className="font-bold uppercase text-[9px] tracking-wider block mb-0.5">Admin remarks</span>
                              {rec.adminRemarks}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gov-border/60">
                          {isAdmin ? (
                            renderApprovalControls(rec)
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              {renderCompletionControls(rec)}
                              <button
                                onClick={() => onDeleteRecord(rec.recordId)}
                                className="flex-1 flex items-center justify-center gap-1 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs py-2 rounded-[3px] transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Record
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* Table View */
            <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-x-auto border border-gov-border rounded-[4px]">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-primary-blue text-white text-xs uppercase tracking-wider font-bold">
                    <th className="py-3.5 px-4 text-center w-12 border-r border-[#1C355E]">#</th>
                    <th className="py-3.5 px-4 border-r border-[#1C355E]">Employee Information</th>
                    <th className="py-3.5 px-4 border-r border-[#1C355E]">Training Details</th>
                    <th className="py-3.5 px-4 border-r border-[#1C355E]">Certificate</th>
                    <th className="py-3.5 px-4 border-r border-[#1C355E] text-center w-28">Status</th>
                    <th className="py-3.5 px-4 text-center w-56">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gov-border text-xs md:text-sm">
                  {filteredRecords.map((rec, idx) => (
                    <tr key={rec.recordId} className={`hover:bg-gov-bg/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gov-bg/15'}`}>
                      <td className="py-4 px-3 text-center font-mono font-bold text-text-secondary border-r border-gov-border">
                        {idx + 1}
                      </td>

                      <td className="py-4 px-4 border-r border-gov-border">
                        <div className="font-extrabold text-primary-blue text-sm">{rec.employeeName}</div>
                        <div className="text-[10px] text-text-secondary uppercase mt-0.5">ID: {rec.employeeId}</div>
                        <div className="text-[11px] font-medium text-text-secondary mt-0.5">{rec.department}</div>
                      </td>

                      <td className="py-4 px-4 border-r border-gov-border">
                        <div className="font-bold text-text-primary text-sm">{rec.moduleName}</div>
                        <div className="text-[10px] text-text-secondary uppercase mt-1">
                          Type: <span className="font-bold">{rec.trainingType}</span>
                        </div>
                        {rec.remarks && (
                          <div className="text-[10px] text-text-secondary italic mt-1 max-w-xs truncate" title={rec.remarks}>
                            "{rec.remarks}"
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 border-r border-gov-border">
                        <div className="font-mono text-xs font-semibold text-primary-blue">{rec.certificateNumber || 'N/A'}</div>
                        <div className="text-[10px] text-text-secondary mt-1">
                          Issued: <span className="font-medium">{rec.issueDate || 'N/A'}</span>
                        </div>
                        {rec.fileName && (
                          <button
                            type="button"
                            onClick={() => downloadCertificate(rec.recordId, rec.fileName)}
                            className="flex items-center gap-1.5 mt-2 bg-gov-bg/40 hover:bg-gov-bg/70 border border-gov-border/40 py-1 px-2 rounded-[3px] max-w-[190px] cursor-pointer text-left"
                            title={`View ${rec.fileName}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-primary-blue flex-shrink-0" />
                            <span className="font-semibold text-text-primary text-[10px] truncate">{rec.fileName}</span>
                          </button>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center border-r border-gov-border">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[3px] border ${getStatusBadgeClass(rec.status)}`}>
                            {statusLabel(rec.status)}
                          </span>
                          {rec.status === 'COMPLETED' && (
                            <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[3px] border ${getApprovalBadgeClass(rec.approvalStatus)}`}>
                              {getApprovalIcon(rec.approvalStatus)}
                              {approvalLabel(rec.approvalStatus)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-3">
                        {isAdmin ? (
                          renderApprovalControls(rec)
                        ) : (
                          <div className="flex flex-col gap-2">
                            {renderCompletionControls(rec)}
                            <button
                              onClick={() => onDeleteRecord(rec.recordId)}
                              className="flex items-center justify-center gap-1 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs py-1.5 px-3 rounded-[3px] mx-auto transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}