"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import "./dashboard.css";

interface DocumentEntity {
	id: string;
	userId: string;
	name: string;
	storagePath: string;
	fileSize: number;
	status: "pending" | "processing" | "completed" | "failed";
	createdAt: number;
	updatedAt: number;
}

export default function DashboardPage() {
	const [documents, setDocuments] = useState<DocumentEntity[]>([]);
	const [uploading, setUploading] = useState<boolean>(false);
	const [mounted, setMounted] = useState<boolean>(false);
	const [dragActive, setDragActive] = useState<boolean>(false);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const fetchDocuments = useCallback(async () => {
		try {
			const res = await fetch("/api/documents");
			if (!res.ok) {
				throw new Error("Failed to fetch documents");
			}
			const data = await res.json();
			setDocuments(data);
		} catch (err) {
			console.error(err);
			setMessage({ type: "error", text: "Failed to load documents." });
		}
	}, []);

	useEffect(() => {
		setMounted(true);
		void fetchDocuments();
	}, [fetchDocuments]);

	const handleUpload = async (file: File) => {
		setUploading(true);
		setMessage(null);
		try {
			const formData = new FormData();
			formData.append("file", file);

			const res = await fetch("/api/documents/upload", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Upload failed");
			}

			const result = await res.json();

			if (result.success && result.data) {
				setMessage({ type: "success", text: `Successfully uploaded "${file.name}"` });
				setDocuments((prev) => [result.data, ...prev]);
				await fetchDocuments();
			} else {
				throw new Error("Invalid response from server");
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "Failed to upload file.";
			setMessage({ type: "error", text: errorMsg });
		} finally {
			setUploading(false);
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

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		const file = e.dataTransfer.files?.[0];
		if (file) {
			await handleUpload(file);
		}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			await handleUpload(file);
		}
	};

	const triggerFileSelect = () => {
		fileInputRef.current?.click();
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const formatDateTime = (timestamp: number) => {
		if (!mounted) return "";
		return new Date(timestamp).toLocaleString();
	};

	return (
		<div className="dashboard-container">
			<header className="dashboard-header">
				<div className="logo-section">
					<svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Logo Icon">
						<title>Logo Icon</title>
						<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
						<path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
						<path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
					<h1 className="header-title">AI Learning Support</h1>
				</div>
				<div className="user-badge">Local Developer</div>
			</header>

			<main className="dashboard-main">
				<div className="dashboard-card upload-section">
					{/* biome-ignore lint/a11y/noStaticElementInteractions: Dropzone requires drag and drop handlers and behaves as an interactive surface for dragging */}
					<div
						className={`dropzone ${dragActive ? "drag-active" : ""}`}
						onDragEnter={handleDrag}
						onDragOver={handleDrag}
						onDragLeave={handleDrag}
						onDrop={handleDrop}
					>
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileChange}
							style={{ display: "none" }}
							accept=".pdf,.txt,.docx,.csv,.json"
						/>
						<div className="dropzone-content">
							<svg className="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Upload Icon">
								<title>Upload Icon</title>
								<path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								<polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								<line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
							<h3>Drag & Drop Files Here</h3>
							<p>Supports PDF, DOCX, TXT, CSV, JSON</p>
							<button
								type="button"
								className="upload-button"
								onClick={triggerFileSelect}
								disabled={uploading}
							>
								{uploading ? "Uploading..." : "Select Files"}
							</button>
						</div>
						{dragActive && (
							<div className="drag-overlay">
								<span className="overlay-text">Drop your file to upload</span>
							</div>
						)}
					</div>
				</div>

				{message && (
					<div className={`alert-message ${message.type}`}>
						<span className="alert-icon">
							{message.type === "success" ? "✓" : "⚠"}
						</span>
						<p>{message.text}</p>
					</div>
				)}

				<div className="dashboard-card list-section">
					<div className="card-header">
						<h2>Ingested Documents</h2>
						<span className="document-count">{documents.length} Total</span>
					</div>
					<div className="table-responsive">
						{documents.length === 0 ? (
							<div className="empty-state">
								<svg className="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Empty Document Icon">
									<title>Empty Document Icon</title>
									<path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
									<polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
									<line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
									<line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
									<polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
								<p>No documents found. Upload a file to get started.</p>
							</div>
						) : (
							<table className="documents-table">
								<thead>
									<tr>
										<th>Name</th>
										<th>Status</th>
										<th>Size</th>
										<th>Uploaded At</th>
									</tr>
								</thead>
								<tbody>
									{documents.map((doc) => (
										<tr key={doc.id} className="document-row">
											<td className="doc-name-cell">
												<svg className="file-type-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Document File Icon">
													<title>Document File Icon</title>
													<path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
													<polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
												</svg>
												<span className="doc-name" title={doc.name}>{doc.name}</span>
											</td>
											<td>
												<span className={`status-badge ${doc.status}`}>
													<span className="status-dot" />
													{doc.status}
												</span>
											</td>
											<td className="doc-size">{formatFileSize(doc.fileSize)}</td>
											<td className="doc-date">{formatDateTime(doc.createdAt)}</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
