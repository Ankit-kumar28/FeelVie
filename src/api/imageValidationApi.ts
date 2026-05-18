// src/api/imageValidationApi.ts
import Toast from 'react-native-toast-message';

export interface ImageScore {
  total_score: number;
  status: 'accepted' | 'rejected';
  scores: {
    pose: number;
    coverage: number;
    face_visibility: number;
    brightness: number;
    lighting: number;
  };
  reason: string[];
}

interface APIResponse {
  success: boolean;
  message: string;
  analysis: {
    scores: {
      pose: number;
      coverage: number;
      face_visibility: number;
      brightness: number;
      lighting: number;
    };
    reason: string[];
    status: 'accepted' | 'rejected';
    total_score: number;
  };
}

interface ValidationError {
  type: 'network' | 'timeout' | 'invalid_response' | 'server' | 'unknown';
  message: string;
  statusCode?: number;
  details?: any;
}

/**
 * Parse error from fetch response
 */
const parseError = (error: any): ValidationError => {
  console.error('[ImageValidation] Error object:', error);

  // Network error (no internet, DNS failure, etc.)
  if (error.message === 'Network request failed' || 
      error.message?.includes('Network') ||
      error.message?.includes('network')) {
    console.error('[ImageValidation] Network error detected');
    return {
      type: 'network',
      message: 'No internet connection. Please check your network.',
      details: error.message,
    };
  }

  // Timeout error
  if (error.message?.includes('timeout') || 
      error.message?.includes('Timeout') ||
      error.code === 'ETIMEDOUT') {
    console.error('[ImageValidation] Timeout error detected');
    return {
      type: 'timeout',
      message: 'Request took too long. Please try again.',
      details: error.message,
    };
  }

  // Invalid JSON response
  if (error.message?.includes('JSON') || 
      error.message?.includes('Unexpected')) {
    console.error('[ImageValidation] Invalid response format');
    return {
      type: 'invalid_response',
      message: 'Server returned an invalid response. Please try again.',
      details: error.message,
    };
  }

  // Unknown error
  console.error('[ImageValidation] Unknown error:', error.message);
  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred',
    details: error,
  };
};

/**
 * Validates an image using the image scoring API
 * @param imageUri - Local image URI (file://)
 * @returns Promise<ImageScore> - Score details and validation status
 */
export const validateUserImage = async (imageUri: string): Promise<ImageScore | null> => {
  const logPrefix = '[ImageValidation]';
  
  try {
    console.debug(`${logPrefix} Starting image validation for: ${imageUri.substring(0, 60)}...`);

    // Validate image URI
    if (!imageUri || typeof imageUri !== 'string') {
      console.error(`${logPrefix} Invalid image URI provided`);
      Toast.show({
        type: 'error',
        text1: 'Invalid Image',
        text2: 'Please select a valid image file',
      });
      return null;
    }

    // Create FormData for image upload
    console.debug(`${logPrefix} Creating FormData for upload`);
    const formData = new FormData();
    
    // Prepare image file for FormData
    console.debug(`${logPrefix} Preparing image file from URI: ${imageUri}`);
    
    // In React Native, we can directly use the file URI
    // Extract filename from URI
    const uriParts = imageUri.split('/');
    const fileName = uriParts[uriParts.length - 1] || 'image.jpg';
    
    // Determine MIME type
    let mimeType = 'image/jpeg';
    if (fileName.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    } else if (fileName.toLowerCase().endsWith('.gif')) {
      mimeType = 'image/gif';
    } else if (fileName.toLowerCase().endsWith('.webp')) {
      mimeType = 'image/webp';
    }
    
    console.debug(`${logPrefix} Image file: ${fileName}, MIME type: ${mimeType}`);
    
    // Append image directly to FormData
    try {
      formData.append('image', {
        uri: imageUri,
        type: mimeType,
        name: fileName,
      } as any);
      console.debug(`${logPrefix} Image appended to FormData successfully`);
    } catch (appendErr: any) {
      console.error(`${logPrefix} Failed to append image to FormData:`, appendErr);
      Toast.show({
        type: 'error',
        text1: 'Image Error',
        text2: 'Could not prepare the image for upload. Please try another image.',
      });
      return null;
    }

    // Skip size validation since we can't check blob size in React Native
    // The server will validate the file size instead

    // Send request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let apiResponse: Response;
    try {
      console.debug(`${logPrefix} Making API request to: https://scoreimage.feelvie.com/api/analyze`);
      apiResponse = await fetch('https://scoreimage.feelvie.com/api/analyze', {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.error(`${logPrefix} API request failed:`, fetchErr.message);

      const parsedError = parseError(fetchErr);
      console.error(`${logPrefix} Parsed error type: ${parsedError.type}`, parsedError);

      Toast.show({
        type: 'error',
        text1: 'Validation Failed',
        text2: parsedError.message,
        duration: 4000,
      });
      return null;
    } finally {
      clearTimeout(timeoutId);
    }

    console.debug(`${logPrefix} API response status: ${apiResponse.status}`);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text().catch(() => '');
      console.error(`${logPrefix} API returned error status ${apiResponse.status}:`, errorText);

      const errorMap: { [key: number]: string } = {
        400: 'Invalid image format or data',
        401: 'Authentication failed',
        403: 'Access denied',
        404: 'Service not found',
        500: 'Server error - please try again later',
        502: 'Service temporarily unavailable',
        503: 'Service is down for maintenance',
      };

      const errorMsg = errorMap[apiResponse.status] || `Server error (${apiResponse.status})`;
      console.error(`${logPrefix} Error message: ${errorMsg}`);

      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: errorMsg,
        duration: 4000,
      });
      return null;
    }

    // Parse response
    console.debug(`${logPrefix} Parsing JSON response...`);
    let responseData: APIResponse;
    try {
      responseData = await apiResponse.json();
    } catch (parseErr: any) {
      console.error(`${logPrefix} Failed to parse JSON response:`, parseErr.message);
      Toast.show({
        type: 'error',
        text1: 'Response Error',
        text2: 'Could not read validation result. Please try again.',
      });
      return null;
    }

    // Validate response structure
    if (!responseData || !responseData.analysis) {
      console.error(`${logPrefix} Invalid response structure:`, responseData);
      Toast.show({
        type: 'error',
        text1: 'Invalid Response',
        text2: 'Server returned unexpected data format.',
      });
      return null;
    }

    const analysis = responseData.analysis;

    // Extract and validate score data
    if (!analysis || typeof analysis.total_score !== 'number' || !analysis.status) {
      console.error(`${logPrefix} Invalid analysis data:`, analysis);
      Toast.show({
        type: 'error',
        text1: 'Invalid Response',
        text2: 'Server returned unexpected data format.',
      });
      return null;
    }

    // Transform to ImageScore format
    const scoreData: ImageScore = {
      total_score: analysis.total_score,
      status: analysis.status,
      scores: analysis.scores,
      reason: analysis.reason || [],
    };

    console.debug(`${logPrefix} Validation successful:`, {
      status: scoreData.status,
      total_score: scoreData.total_score,
      reasonCount: scoreData.reason?.length || 0,
    });

    return scoreData;
  } catch (err: any) {
    console.error(`${logPrefix} Unexpected error in validateUserImage:`, err);
    console.error(`${logPrefix} Error stack:`, err.stack);

    const parsedError = parseError(err);
    console.error(`${logPrefix} Final error - Type: ${parsedError.type}, Message: ${parsedError.message}`);

    Toast.show({
      type: 'error',
      text1: 'Validation Failed',
      text2: parsedError.message || 'An unexpected error occurred. Please try again.',
      duration: 4000,
    });

    return null;
  }
};

/**
 * Get user-friendly error message from error code
 */
export const getErrorMessage = (errorType: string): string => {
  const messages: { [key: string]: string } = {
    network: 'No internet connection. Please check your network and try again.',
    timeout: 'The request took too long. Please try again.',
    invalid_response: 'Server returned invalid data. Please try again.',
    server: 'Server error. Please try again later.',
    unknown: 'An unexpected error occurred. Please try again.',
  };
  return messages[errorType] || messages.unknown;
};
