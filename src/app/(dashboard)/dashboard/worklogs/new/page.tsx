'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  Upload, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  Calendar,
  FileText,
  BookOpen,
  ClipboardList,
  GraduationCap,
  FlaskConical,
  FolderOpen,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { WorklogType } from '@/types';
import PhotoCapture from '@/components/PhotoCapture';

const worklogTypes: { value: WorklogType; label: string; icon: typeof FileText }[] = [
  { value: 'classwork', label: 'Classwork', icon: ClipboardList },
  { value: 'homework', label: 'Homework', icon: BookOpen },
  { value: 'notes', label: 'Notes', icon: FileText },
  { value: 'quiz', label: 'Quiz', icon: GraduationCap },
  { value: 'test', label: 'Test', icon: GraduationCap },
  { value: 'project', label: 'Project', icon: FlaskConical },
  { value: 'other', label: 'Other', icon: FolderOpen },
];

export default function NewWorklogPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showCamera, setShowCamera] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [worklogType, setWorklogType] = useState<WorklogType>('classwork');
  const [dateCompleted, setDateCompleted] = useState(new Date().toISOString().split('T')[0]);

  const handlePhotoCapture = async (base64: string, mimeType: string) => {
    setShowCamera(false);
    setImageBase64(base64);
    setImagePreview(`data:${mimeType};base64,${base64}`);
    
    // Automatically analyze the image
    await analyzeImage(base64, mimeType);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setImagePreview(dataUrl);
      
      // Automatically analyze the image
      await analyzeImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64: string, mimeType: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze-worklog-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setTitle(data.data.title || '');
        setDescription(data.data.description || '');
        setContent(data.data.content || '');
        setTopic(data.data.topic || '');
        setWorklogType(data.data.worklog_type || 'classwork');
        if (data.data.date_completed) {
          setDateCompleted(data.data.date_completed);
        }
      }
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError('Failed to analyze image. Please fill in the details manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      let imageUrl = null;
      let storagePath = null;
      
      // Upload image to Supabase Storage if we have one
      if (imageBase64) {
        const fileName = `${session.user.id}/${Date.now()}.jpg`;
        
        // Convert base64 to blob
        const byteCharacters = atob(imageBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('worklog-images')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
          });
        
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Continue without image if upload fails
        } else {
          storagePath = uploadData.path;
          const { data: urlData } = supabase.storage
            .from('worklog-images')
            .getPublicUrl(uploadData.path);
          imageUrl = urlData.publicUrl;
        }
      }
      
      // Create worklog
      const response = await fetch('/api/worklogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          description,
          content,
          topic,
          worklog_type: worklogType,
          date_completed: dateCompleted,
          image_url: imageUrl,
          storage_path: storagePath,
          raw_extracted_text: content,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create worklog');
      }
      
      router.push('/dashboard/worklogs');
    } catch (err) {
      console.error('Error saving worklog:', err);
      setError('Failed to save worklog. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (showCamera) {
    return (
      <PhotoCapture
        onCapture={handlePhotoCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-black">📸 Log Work</h1>
          <p className="text-gray-700 font-medium">Take a photo or upload an image of your work</p>
        </div>
      </div>

      {/* Image Capture Section */}
      {!imagePreview ? (
        <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-6 mb-6">
          <h2 className="text-xl font-black text-black mb-4">Capture Your Work</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowCamera(true)}
              className="flex-1 flex flex-col items-center justify-center gap-3 p-6 border-3 border-dashed border-black hover:bg-cyan-100 transition-colors"
            >
              <div className="w-14 h-14 bg-cyan-300 border-3 border-black flex items-center justify-center">
                <Camera className="w-7 h-7 text-black" />
              </div>
              <div className="text-center">
                <p className="font-bold text-black">Take Photo</p>
                <p className="text-sm text-gray-600">Use your camera</p>
              </div>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center gap-3 p-6 border-3 border-dashed border-black hover:bg-violet-100 transition-colors"
            >
              <div className="w-14 h-14 bg-violet-300 border-3 border-black flex items-center justify-center">
                <Upload className="w-7 h-7 text-black" />
              </div>
              <div className="text-center">
                <p className="font-bold text-black">Upload Image</p>
                <p className="text-sm text-gray-600">From your device</p>
              </div>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-black">Captured Image</h2>
            <button
              onClick={removeImage}
              className="p-2 bg-rose-300 border-2 border-black hover:bg-rose-400 transition-colors"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>
          <div className="relative bg-gray-200 border-3 border-black overflow-hidden">
            <img
              src={imagePreview}
              alt="Captured work"
              className="w-full max-h-[400px] object-contain"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-yellow-300 animate-spin mb-3" />
                <p className="text-white font-bold">Analyzing image with AI...</p>
                <p className="text-white/70 text-sm">Extracting text and details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Status */}
      {isAnalyzing && (
        <div className="bg-yellow-300 border-3 border-black p-4 mb-6 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-black animate-pulse" />
          <p className="text-black font-bold">AI is analyzing your handwritten work...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-rose-300 border-3 border-black p-4 mb-6">
          <p className="text-black font-bold">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-6">
        <h2 className="text-xl font-black text-black mb-4">Work Details</h2>
        
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Math Chapter 5 Problems"
              className="w-full px-4 py-3 border-3 border-black bg-white text-black placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300"
              required
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Topic / Subject
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Algebra, World History"
              className="w-full px-4 py-3 border-3 border-black bg-white text-black placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>

          {/* Type and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Type
              </label>
              <select
                value={worklogType}
                onChange={(e) => setWorklogType(e.target.value as WorklogType)}
                className="w-full px-4 py-3 border-3 border-black bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 cursor-pointer"
              >
                {worklogTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Date Completed
              </label>
              <input
                type="date"
                value={dateCompleted}
                onChange={(e) => setDateCompleted(e.target.value)}
                className="w-full px-4 py-3 border-3 border-black bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the work..."
              rows={2}
              className="w-full px-4 py-3 border-3 border-black bg-white text-black placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Content / Extracted Text
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The full content extracted from your work..."
              rows={6}
              className="w-full px-4 py-3 border-3 border-black bg-white text-black placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
            />
            <p className="mt-2 text-xs text-gray-600 font-medium">
              This content will be used for generating study materials and test prep
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t-3 border-black">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-3 bg-gray-200 text-black font-bold border-3 border-black hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || isAnalyzing}
            className="px-6 py-3 bg-emerald-300 text-black font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Work Log'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
