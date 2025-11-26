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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log Work</h1>
          <p className="text-gray-600">Take a photo or upload an image of your work</p>
        </div>
      </div>

      {/* Image Capture Section */}
      {!imagePreview ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Capture Your Work</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowCamera(true)}
              className="flex-1 flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Take Photo</p>
                <p className="text-sm text-gray-500">Use your camera</p>
              </div>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                <Upload className="w-7 h-7 text-primary-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Upload Image</p>
                <p className="text-sm text-gray-500">From your device</p>
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Captured Image</h2>
            <button
              onClick={removeImage}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative rounded-lg overflow-hidden bg-gray-100">
            <img
              src={imagePreview}
              alt="Captured work"
              className="w-full max-h-[400px] object-contain"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
                <p className="text-white font-medium">Analyzing image with AI...</p>
                <p className="text-white/70 text-sm">Extracting text and details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Status */}
      {isAnalyzing && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary-600 animate-pulse" />
          <p className="text-primary-700">AI is analyzing your handwritten work...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Details</h2>
        
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Math Chapter 5 Problems"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
              required
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic / Subject
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Algebra, World History"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Type and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={worklogType}
                onChange={(e) => setWorklogType(e.target.value as WorklogType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
              >
                {worklogTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Completed
              </label>
              <input
                type="date"
                value={dateCompleted}
                onChange={(e) => setDateCompleted(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the work..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content / Extracted Text
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The full content extracted from your work..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm bg-white text-gray-900 placeholder-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              This content will be used for generating study materials and test prep
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || isAnalyzing}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
