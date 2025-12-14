"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  HiUpload,
  HiDocumentText,
  HiCheckCircle,
  HiXCircle,
} from "react-icons/hi";
import Image from "next/image";

const RollingLoader = () => {
  return (
    <div className="flex justify-center items-center">
      <div className="w-16 h-16 rounded-full border-4 border-gray-300 animate-spin border-t-blue-500"></div>
    </div>
  );
};

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [dragActive, setDragActive] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const checkAuthorization = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/upload");
      const data = await response.json();
      return data.authorized || false;
    } catch (error) {
      console.error("Authorization check failed:", error);
      return false;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (status === "unauthenticated") {
        router.push("/");
      } else if (status === "authenticated") {
        const authorized = await checkAuthorization();
        setIsAuthorized(authorized);
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [status, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".xlsx")) {
        setFile(selectedFile);
        setUploadStatus({ type: null, message: "" });
      } else {
        setUploadStatus({
          type: "error",
          message: "Please select a CSV file",
        });
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".xlsx")) {
        setFile(droppedFile);
        setUploadStatus({ type: null, message: "" });
      } else {
        setUploadStatus({
          type: "error",
          message: "Please select a CSV file",
        });
      }
    }
  };

const handleUpload = async () => {
  if (!file || !session?.user?.email) return;

  setUploading(true);
  setUploadStatus({ type: null, message: "" });

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", session.user.email);

    // Upload directly to Flask
    const response = await fetch("/api/upload_file", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      setUploadStatus({
        type: "success",
        message: "File uploaded successfully!",
      });
      setFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } else {
      setUploadStatus({
        type: "error",
        message: data.error || "Upload failed",
      });
    }
  } catch (error) {
    setUploadStatus({
      type: "error",
      message: `An error occurred during upload: ${error}`,
    });
  } finally {
    setUploading(false);
  }
};

  const UserAvatar = () => {
    return session?.user?.image ? (
      <Image
        src={session.user.image}
        alt={session.user.name || "User"}
        width={36}
        height={36}
        className="rounded-full"
      />
    ) : (
      <div className="flex justify-center items-center w-9 h-9 text-white bg-gray-700 rounded-full">
        {session?.user?.name?.charAt(0) || "U"}
      </div>
    );
  };

  if (status === "loading" || checkingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <RollingLoader />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen text-gray-100 bg-gray-900">
      <div className="sticky top-0 bg-gray-900 border-b border-gray-800">
        <div className="flex justify-between items-center py-4 px-4 mx-auto max-w-4xl">
          <h1 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            SuperVaani - File Upload
          </h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => router.push("/chat")}
              className="text-sm text-gray-400 transition-colors hover:text-gray-300"
            >
              Back to Chat
            </button>
            <UserAvatar />
          </div>
        </div>
      </div>

      <div className="py-8 px-4 mx-auto max-w-4xl">
        {!isAuthorized ? (
          <div className="p-6 text-center rounded-lg border border-red-800 bg-red-900/20">
            <HiXCircle className="mx-auto mb-4 w-16 h-16 text-red-500" />
            <h2 className="mb-2 text-2xl font-bold text-red-400">
              Access Denied
            </h2>
            <p className="mb-4 text-gray-300">
              You are not authorized to upload files. Only authorized users can
              access this page.
            </p>
            <button
              onClick={() => router.push("/chat")}
              className="py-2 px-6 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
            >
              Return to Chat
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 mb-6 bg-gray-800 rounded-lg">
              <h2 className="mb-2 text-2xl font-bold">Upload CSV File</h2>
              <p className="mb-6 text-gray-400">
                Upload CSV files to update the knowledge base. Only CSV files
                are accepted.
              </p>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-gray-600 hover:border-gray-500"
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <HiUpload className="mx-auto mb-4 w-16 h-16 text-gray-400" />
                <p className="mb-2 text-lg">
                  Drag and drop your xlsx file here, or click to browse
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => document.getElementById("file-input")?.click()}
                  className="py-2 px-6 mt-4 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                >
                  Browse Files
                </button>
              </div>

              {file && (
                <div className="flex justify-between items-center p-4 mt-6 bg-gray-700 rounded-lg">
                  <div className="flex gap-3 items-center">
                    <HiDocumentText className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              )}

              {file && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex gap-2 justify-center items-center py-3 mt-6 w-full font-medium text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white animate-spin border-t-transparent"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <HiUpload className="w-5 h-5" />
                      Upload File
                    </>
                  )}
                </button>
              )}

              {uploadStatus.type && (
                <div
                  className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${uploadStatus.type === "success"
                      ? "bg-green-900/20 border border-green-800"
                      : "bg-red-900/20 border border-red-800"
                    }`}
                >
                  {uploadStatus.type === "success" ? (
                    <HiCheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <HiXCircle className="w-6 h-6 text-red-400" />
                  )}
                  <p
                    className={
                      uploadStatus.type === "success"
                        ? "text-green-300"
                        : "text-red-300"
                    }
                  >
                    {uploadStatus.message}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-800 rounded-lg">
              <h3 className="mb-3 text-lg font-semibold">Upload Guidelines</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex gap-2 items-start">
                  <span className="mt-1 text-blue-400">•</span>
                  <span>Only CSV files are accepted</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="mt-1 text-blue-400">•</span>
                  <span>Files are associated with your email address</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="mt-1 text-blue-400">•</span>
                  <span>Ensure your CSV file is properly formatted</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="mt-1 text-blue-400">•</span>
                  <span>Maximum file size: 10MB</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

