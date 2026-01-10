// API utility for consistent endpoint handling
export const getApiUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NEXT_PUBLIC_API_URL || '/api';
  }
  // Client-side
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicUrl) {
    return publicUrl;
  }
  // Fallback to relative path
  return '/api';
};

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText} for ${url}`);
    }
    
    return response;
  } catch (error) {
    console.error(`API Call Failed for ${url}:`, error);
    throw error;
  }
};
