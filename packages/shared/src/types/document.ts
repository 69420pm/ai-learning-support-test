export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DocumentEntity {
  id: string;
  userId: string;
  name: string;
  storagePath: string;
  fileSize: number;
  status: DocumentStatus;
  createdAt: number;
  updatedAt: number;
}
