// API service for backend communication
import axios from 'axios';
import { UploadResumeResponse, TextInputResponse } from '@/utils/types';

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

export default apiClient;

