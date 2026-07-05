import React from 'react';
import { Send, RotateCcw, Upload, FileText, X } from 'lucide-react';

export default function TrainingForm({ formData, onChange, onSubmit, onReset, loading, lockIdentity }) {
  const modules = [
    'Cyber Security Awareness',
    'Data Privacy Compliance',
    'e-Procurement & GeM',
    'Financial Rules & Procedures',
    'Leave & Attendance Rules',
    'RTI Act Compliance',
    'Office Automation & e-Office',
    'Treasury Integration Systems'
  ];

  const types = ['Induction', 'Refresher', 'Specialization', 'Technical'];
  // value = what the backend's Status enum / @Pattern accepts, label = what the user sees
  const statuses = [
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="bg-white border border-gov-border rounded-[4px] shadow-xs p-6 md:p-8 animate-fade-up">
      <div className="border-b border-gov-border pb-4 mb-6">
        <h2 className="text-xl font-extrabold text-primary-blue flex items-center gap-2">
          <span className="w-1.5 h-6 bg-accent-orange inline-block rounded-sm"></span>
          New Training Record
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Enter training completion and certification details. All fields should be updated accurately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="employeeName" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
              Employee Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="employeeName"
              name="employeeName"
              value={formData.employeeName}
              onChange={onChange}
              required
              disabled={lockIdentity}
              readOnly={lockIdentity}
              placeholder="e.g. Bikas Mallik"
              className={`border border-gov-border rounded-[4px] text-text-primary text-sm px-3 py-2 focus:outline-none transition-all ${
                lockIdentity
                  ? 'bg-gov-bg/60 cursor-not-allowed text-text-secondary'
                  : 'bg-gov-bg/30 focus:bg-white focus:border-primary-blue focus:ring-1 focus:ring-primary-blue'
              }`}
            />
            {lockIdentity && (
              <p className="text-[10px] text-text-secondary">Locked to your logged-in account.</p>
            )}
          </div>

          {/* Employee ID */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="employeeId" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
              Employee ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="employeeId"
              name="employeeId"
              value={formData.employeeId}
              onChange={onChange}
              required
              disabled={lockIdentity}
              readOnly={lockIdentity}
              placeholder="e.g. TE-030316"
              className={`border border-gov-border rounded-[4px] text-text-primary text-sm px-3 py-2 focus:outline-none transition-all ${
                lockIdentity
                  ? 'bg-gov-bg/60 cursor-not-allowed text-text-secondary'
                  : 'bg-gov-bg/30 focus:bg-white focus:border-primary-blue focus:ring-1 focus:ring-primary-blue'
              }`}
            />
            {lockIdentity && (
              <p className="text-[10px] text-text-secondary">Locked to your logged-in account.</p>
            )}
          </div>

          {/* Training Module */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="trainingModule" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
              Training Module <span className="text-red-500">*</span>
            </label>
            <select
              id="trainingModule"
              name="trainingModule"
              value={formData.trainingModule}
              onChange={onChange}
              required
              className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
            >
              <option value="">Select Module</option>
              {modules.map((mod) => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>

          {/* Training Type */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="trainingType" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
              Training Type <span className="text-red-500">*</span>
            </label>
            <select
              id="trainingType"
              name="trainingType"
              value={formData.trainingType}
              onChange={onChange}
              required
              className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
            >
              <option value="">Select Type</option>
              {types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={onChange}
              required
              className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
            >
              <option value="">Select Status</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Issue Date */}
          {formData.status === 'COMPLETED' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="issueDate" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="issueDate"
                name="issueDate"
                value={formData.issueDate}
                onChange={onChange}
                required
                className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
              />
            </div>
          )}

          {/* Certificate File Upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-primary-blue uppercase tracking-wider">
              Certificate Document {formData.status === 'COMPLETED' ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-text-secondary normal-case font-normal">(optional — can upload later)</span>
              )}
            </label>
            <div className="relative">
              {formData.certificateFile ? (
                <div className="flex items-center justify-between border border-gov-border rounded-[4px] bg-gov-bg/50 px-3 py-2.5 text-sm text-text-primary font-medium">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary-blue flex-shrink-0" />
                    <span className="truncate font-semibold text-primary-blue" title={typeof formData.certificateFile === 'object' && formData.certificateFile ? formData.certificateFile.name : formData.certificateFile}>
                      {typeof formData.certificateFile === 'object' && formData.certificateFile ? formData.certificateFile.name : formData.certificateFile}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const event = { target: { name: 'certificateFile', value: '' } };
                      onChange(event);
                    }}
                    className="text-text-secondary hover:text-rose-600 transition-colors p-1 cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative border border-dashed border-gov-border hover:border-primary-blue/60 rounded-[4px] bg-gov-bg/30 hover:bg-white transition-all px-3 py-[7px] flex items-center justify-center cursor-pointer group">
                  <input
                    type="file"
                    id="certificateFile"
                    name="certificateFile"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const event = { target: { name: 'certificateFile', value: file } };
                        onChange(event);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    required={formData.status === 'COMPLETED'}
                  />
                  <div className="flex items-center gap-2 text-text-secondary group-hover:text-primary-blue font-bold text-xs uppercase tracking-wider transition-colors py-0.5">
                    <Upload className="w-4 h-4 text-accent-orange" />
                    <span>Upload Certificate</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructor */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="instructor" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
              Instructor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="instructor"
              name="instructor"
              value={formData.instructor}
              onChange={onChange}
              required
              placeholder="e.g. NIC Security Cell"
              className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
            />
          </div>

          {/* Certificate Number */}
          {formData.status === 'COMPLETED' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="certificateNumber" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
                Certificate Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="certificateNumber"
                name="certificateNumber"
                value={formData.certificateNumber}
                onChange={onChange}
                required
                placeholder="e.g. NIC-CS-2026-0891"
                className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
              />
            </div>
          )}
        </div>

        {/* Remarks */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="remarks" className="text-xs font-bold text-primary-blue uppercase tracking-wider">
            Remarks / Comments
          </label>
          <textarea
            id="remarks"
            name="remarks"
            rows="3"
            value={formData.remarks}
            onChange={onChange}
            placeholder="Add any learning notes, special recognition, or performance comments..."
            className="border border-gov-border rounded-[4px] bg-gov-bg/30 text-text-primary text-sm px-3 py-2 focus:bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all resize-y"
          ></textarea>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gov-border">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-blue hover:bg-[#1C355E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-[4px] shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4 text-accent-orange" />
            {loading ? "Submitting..." : "Submit Record"}
          </button>
          
          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-gov-border hover:bg-gov-bg/50 text-text-secondary font-bold py-2.5 px-6 rounded-[4px] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
}