"use client";

import { useCallback, useState, useRef } from "react";
import apiClient from "@/services/api";
import { UploadResumeResponse, TextInputResponse } from "@/utils/types";
import { LoadingSpinner, ErrorDisplay } from "./LoadingStates";

interface FileUploadProps {
  label: string;
  sourceType: "resume" | "job_description";
  onUploadSuccess: (fileId: string, filename: string) => void;
  onTextSubmit: (textId: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export default function FileUpload({
  label,
  sourceType,
  onUploadSuccess,
  onTextSubmit,
  maxSizeMB = 10,
  acceptedTypes = [".pdf", ".docx", ".txt"],
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [submittingText, setSubmittingText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(", ")}`;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source_type", sourceType);

      const response = await apiClient.post<UploadResumeResponse>(
        "/api/upload/upload-resume",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percentCompleted);
            }
          },
        }
      );

      setUploadedFile({
        id: response.data.file_id,
        name: response.data.filename,
      });
      onUploadSuccess(response.data.file_id, response.data.filename);
      setProgress(100);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to upload file. Please try again."
      );
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
        uploadFile(file);
      }
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      uploadFile(file);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim() || textInput.trim().length < 10) {
      setError("Text must be at least 10 characters long");
      return;
    }

    setSubmittingText(true);
    setError(null);

    try {
      const response = await apiClient.post<TextInputResponse>(
        "/api/text/text",
        {
          text: textInput,
          source_type: sourceType,
        }
      );

      onTextSubmit(response.data.text_id);
      setTextInput("");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to submit text. Please try again."
      );
    } finally {
      setSubmittingText(false);
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setTextInput("");
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {/* File Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || submittingText}
        />

        {uploadedFile ? (
          <div className="text-center">
            <div className="flex items-center justify-center">
              <svg
                className="h-12 w-12 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {uploadedFile.name}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              File uploaded successfully
            </p>
            <button
              onClick={handleClear}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear and upload different file
            </button>
          </div>
        ) : uploading ? (
          <div className="text-center">
            <LoadingSpinner size="lg" text="Uploading..." />
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {progress}%
            </p>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
              <label
                htmlFor={`file-upload-${sourceType}`}
                className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500 dark:text-blue-400"
              >
                <span>Upload a file</span>
                <input
                  id={`file-upload-${sourceType}`}
                  name={`file-upload-${sourceType}`}
                  type="file"
                  accept={acceptedTypes.join(",")}
                  onChange={handleFileSelect}
                  className="sr-only"
                  disabled={uploading || submittingText}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-400">
              {acceptedTypes.join(", ")} up to {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            OR
          </span>
        </div>
      </div>

      {/* Text Input Area */}
      <div>
        <label
          htmlFor={`text-input-${sourceType}`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Paste {sourceType === "resume" ? "resume" : "job description"} text
        </label>
        <textarea
          id={`text-input-${sourceType}`}
          rows={8}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={uploading || submittingText || !!uploadedFile}
          placeholder={`Paste your ${sourceType === "resume" ? "resume" : "job description"} text here...`}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-900"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {textInput.length} characters
          </p>
          <button
            onClick={handleTextSubmit}
            disabled={
              !textInput.trim() ||
              textInput.trim().length < 10 ||
              submittingText ||
              uploading ||
              !!uploadedFile
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700"
          >
            {submittingText ? "Submitting..." : "Submit Text"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <ErrorDisplay
          message={error}
          onRetry={() => {
            setError(null);
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          retryText="Select File Again"
        />
      )}
    </div>
  );
}

