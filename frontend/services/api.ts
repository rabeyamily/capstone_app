// API service for backend communication
import axios from 'axios';
import { UploadResumeResponse, TextInputResponse, AnalyzeGapRequest } from '@/utils/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// File upload helper
export const uploadFile = async (
  file: File,
  sourceType: 'resume' | 'job_description'
): Promise<UploadResumeResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_type', sourceType);

  const response = await apiClient.post<UploadResumeResponse>(
    '/api/upload/upload-resume',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

// Text input helper
export const submitText = async (
  text: string,
  sourceType: 'resume' | 'job_description'
): Promise<TextInputResponse> => {
  const response = await apiClient.post<TextInputResponse>('/api/text/text', {
    text,
    source_type: sourceType,
  });

  return response.data;
};

// PDF Report generation helper
export const generatePDFReport = async (
  request: AnalyzeGapRequest
): Promise<Blob> => {
  const response = await apiClient.post(
    '/api/report/generate-pdf',
    request,
    {
      responseType: 'blob',
    }
  );

  return response.data;
};

// PDF Report generation from IDs helper
export const generatePDFReportFromIds = async (
  resumeId: string,
  jdId: string,
  technicalWeight?: number,
  softSkillsWeight?: number
): Promise<Blob> => {
  const response = await apiClient.post(
    `/api/report/generate-pdf-from-ids?resume_id=${resumeId}&jd_id=${jdId}${technicalWeight !== undefined ? `&technical_weight=${technicalWeight}` : ''}${softSkillsWeight !== undefined ? `&soft_skills_weight=${softSkillsWeight}` : ''}`,
    {},
    {
      responseType: 'blob',
    }
  );

  return response.data;
};

export default apiClient;

