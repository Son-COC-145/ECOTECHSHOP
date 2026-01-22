import api from './api';

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/api/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const deleteImage = async (publicId) => {
  const response = await api.delete('/api/upload/image', {
    data: { publicId },
  });
  return response.data;
};

