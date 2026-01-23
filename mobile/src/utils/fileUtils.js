// File utility functions
import { ANALYSIS_CONFIG } from '../config/constants';

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

export const getFileExtension = (filename) => {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

export const isImageFile = (type) => {
  if (!type) return false;
  return ANALYSIS_CONFIG.SUPPORTED_IMAGE_FORMATS.includes(type.toLowerCase());
};

export const isVideoFile = (type) => {
  if (!type) return false;
  return ANALYSIS_CONFIG.SUPPORTED_VIDEO_FORMATS.includes(type.toLowerCase());
};

export const isAudioFile = (type) => {
  if (!type) return false;
  return ANALYSIS_CONFIG.SUPPORTED_AUDIO_FORMATS.includes(type.toLowerCase());
};

export const validateFileSize = (size) => {
  return size <= ANALYSIS_CONFIG.MAX_FILE_SIZE;
};

export const getFileType = (type) => {
  if (isImageFile(type)) return 'image';
  if (isVideoFile(type)) return 'video';
  if (isAudioFile(type)) return 'audio';
  return 'file';
};

export const getFileIcon = (type) => {
  if (isImageFile(type)) return 'image';
  if (isVideoFile(type)) return 'video';
  if (isAudioFile(type)) return 'music';
  return 'file';
};
