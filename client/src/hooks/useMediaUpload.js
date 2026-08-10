import { useState } from 'react';
import api from '../api/axios';

const useMediaUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Opens file picker and uploads selected file
  // Returns { url, messageType } on success
  const uploadFile = (onSuccess) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,audio/*,video/*';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await api.post('/api/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percent);
          },
        });

        // Call the callback with url and messageType
        onSuccess(response.data.url, response.data.messageType);
      } catch (err) {
        console.error('Upload failed:', err);
        alert('Upload failed. Please try again.');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    };

    input.click();
  };

  return { uploadFile, uploading, progress };
};

export default useMediaUpload;