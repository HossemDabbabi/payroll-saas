import { useState, useCallback } from 'react';
import { payrollAPI, reportAPI } from '../services/api';
import toast from 'react-hot-toast';

export const usePayroll = () => {
  const [records, setRecords] = useState([]);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });

  const fetchRecords = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await payrollAPI.getAll(params);
      setRecords(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch payroll records.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecord = useCallback(async (id) => {
    setLoading(true);
    try {
      const { data } = await payrollAPI.getById(id);
      setCurrentRecord(data.data);
      return data.data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch payroll record.');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPayroll = useCallback(async (file, month, year) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('payrollFile', file);
      formData.append('month', month);
      formData.append('year', year);
      const { data } = await payrollAPI.upload(formData);
      toast.success(data.message);
      return { success: true, data: data.data };
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed.';
      toast.error(msg);
      return { success: false, error: msg, details: err.response?.data };
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteRecord = useCallback(async (id) => {
    try {
      await payrollAPI.delete(id);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      toast.success('Payroll record deleted.');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record.');
      return false;
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const { data } = await payrollAPI.getDashboardStats();
      setDashboardStats(data.data);
      return data.data;
    } catch (err) {
      toast.error('Failed to load dashboard stats.');
    }
  }, []);

  const downloadExcel = useCallback(async (payrollId, filename) => {
    try {
      const response = await reportAPI.downloadExcel(payrollId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `payroll_${payrollId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel report downloaded.');
    } catch (err) {
      toast.error('Failed to download Excel report.');
    }
  }, []);

  const downloadPayslip = useCallback(async (payrollId, matricule) => {
    try {
      const response = await reportAPI.downloadPayslip(payrollId, matricule);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${matricule}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Payslip downloaded.');
    } catch (err) {
      toast.error('Failed to download payslip.');
    }
  }, []);

  return {
    records, currentRecord, dashboardStats, loading, uploading, pagination,
    fetchRecords, fetchRecord, uploadPayroll, deleteRecord, fetchDashboardStats,
    downloadExcel, downloadPayslip,
  };
};
