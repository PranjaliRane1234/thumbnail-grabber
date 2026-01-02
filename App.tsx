
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  /**
   * Fetches an image from a URL and converts it to a base64 string
   * formatted for the Gemini API.
   * @param {string} url The URL of the image to fetch.
   * @returns {Promise<object>} A promise that resolves to an object for the Gemini API.
   */
  const urlToBase64 = async (url: string): Promise<{inlineData: {data: string, mimeType: string}}> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: blob.type,
                }
            });
        };
        reader.readAsDataURL(blob);
    });
  };

  /**
   * Calls the Gemini API to generate a description for the current thumbnail.
   */
  const handleGenerateDescription = async () => {
    if (!videoId) return;

    setIsGenerating(true);
    setDescription(null);
    setDescriptionError(null);

    try {
      // Initialize the Gemini client. Assumes API_KEY is in environment variables.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      let imagePart;
      try {
        // First, try fetching the max resolution default image.
        const maxResUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        imagePart = await urlToBase64(maxResUrl);
      } catch (e) {
        console.warn("maxresdefault.jpg not found, falling back to hqdefault.jpg");
        // If that fails, fall back to the high quality default image.
        const hqUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        imagePart = await urlToBase64(hqUrl);
      }

      // Prepare the prompt with text and the image data.
      const textPart = {
        text: "Describe this YouTube thumbnail. What is it about? What is the mood? Be concise and engaging, as if you were writing a video description."
      };

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest', // A multimodal model is required.
        contents: { parts: [textPart, imagePart] },
      });
      
      if (response.text) {
        setDescription(response.text);
      } else {
        throw new Error("The AI returned an empty response.");
      }

    } catch (err) {
      console.error("Error generating description:", err);
      setDescriptionError("Sorry, the AI couldn't generate a description. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGetThumbnail = () => {
    setVideoId(null);
    setError(null);
    setDescription(null); // Reset description on new URL
    setDescriptionError(null);

    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      setVideoId(match[1]);
    } else {
      setError('Invalid YouTube URL. Please check the link and try again.');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleGetThumbnail();
    }
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-300">
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8">
        <header className="text-center mb-6">
          <div className="flex justify-center items-center gap-3 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 C3.326,4.648,2.648,5.326,2.418,6.186C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.86-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z" />
            </svg>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              YouTube Thumbnail Grabber
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Paste a link to get its thumbnail and an AI-generated description.
          </p>
        </header>

        <main>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., https://www.youtube.com/watch?v=..."
              className="flex-grow w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-700 dark:text-gray-200 transition"
            />
            <button
              onClick={handleGetThumbnail}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 transition-transform transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Get Thumbnail
            </button>
          </div>

          <div className="mt-6 min-h-[250px] flex items-center justify-center">
            {error && !videoId && (
              <div className="text-center p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                <p className="font-semibold">Error</p>
                <p>{error}</p>
              </div>
            )}
            
            {videoId && (
              <div className="w-full group animate-fade-in">
                <a 
                  href={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="YouTube Video Thumbnail"
                    className="w-full rounded-lg shadow-xl border-4 border-transparent group-hover:border-red-500 transition-all duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                  />
                </a>
                 <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Click the image to open the full-resolution thumbnail in a new tab.
                </p>
              </div>
            )}

            {!videoId && !error && (
                <div className="text-center text-gray-400 dark:text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2">Your thumbnail will appear here.</p>
                </div>
            )}
          </div>
          
          {videoId && (
            <div className="mt-4 text-center">
              <button
                onClick={handleGenerateDescription}
                disabled={isGenerating}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              >
                {isGenerating ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
                {isGenerating ? 'AI is thinking...' : '✨ Generate Description'}
              </button>
            </div>
          )}

          <div className="mt-4 min-h-[50px]">
            {descriptionError && (
              <div className="text-center p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg animate-fade-in">
                <p>{descriptionError}</p>
              </div>
            )}
            {description && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-700 dark:text-gray-300 animate-fade-in">
                <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">AI Generated Description</h3>
                <p className="whitespace-pre-wrap">{description}</p>
              </div>
            )}
          </div>

        </main>
      </div>
       <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }
      `}</style>
    </div>
  );
};

export default App;
