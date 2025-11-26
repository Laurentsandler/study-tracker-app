'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase/client';
import { Course, AssignmentPriority, AssignmentStatus } from '@/types';

interface EditAssignmentInput {
  title: string;
  description?: string;
  course_id?: string;
  due_date?: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  estimated_duration: number;
}

export default function EditAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors, isDirty } } = useForm<EditAssignmentInput>({
    defaultValues: {
      priority: 'medium',
      status: 'pending',
      estimated_duration: 60,
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch courses
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (coursesData) setCourses(coursesData);

        // Fetch assignment
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', assignmentId)
          .eq('user_id', user.id)
          .single();

        if (assignmentError) throw assignmentError;

        // Populate form with existing data
        setValue('title', assignment.title);
        setValue('description', assignment.description || '');
        setValue('course_id', assignment.course_id || '');
        setValue('due_date', assignment.due_date ? assignment.due_date.split('T')[0] : '');
        setValue('priority', assignment.priority);
        setValue('status', assignment.status);
        setValue('estimated_duration', assignment.estimated_duration);
      } catch (err) {
        console.error('Error fetching assignment:', err);
        setError('Failed to load assignment');
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [assignmentId, router, setValue]);

  const onSubmit = async (data: EditAssignmentInput) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData = {
        title: data.title,
        description: data.description || null,
        course_id: data.course_id || null,
        due_date: data.due_date || null,
        priority: data.priority,
        status: data.status,
        estimated_duration: data.estimated_duration || 60,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('assignments')
        .update(updateData)
        .eq('id', assignmentId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      router.push(`/dashboard/assignments/${assignmentId}`);
    } catch (err) {
      console.error('Assignment update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/assignments/${assignmentId}`}
          className="inline-flex items-center gap-2 text-gray-700 hover:text-black font-bold mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>
        <h1 className="text-3xl font-black text-black">Edit Assignment</h1>
        <p className="text-gray-600 font-medium">Update the assignment details below</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-200 border-3 border-black flex items-center gap-3 text-black">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 border-3 border-black shadow-[4px_4px_0_0_#000] space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-bold text-black mb-2">
            Title *
          </label>
          <input
            {...register('title', { required: 'Title is required' })}
            type="text"
            id="title"
            placeholder="e.g., Chapter 5 Homework"
            className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
          />
          {errors.title && (
            <p className="text-red-600 text-sm mt-1 font-bold">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-bold text-black mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            id="description"
            rows={4}
            placeholder="Add details about this assignment..."
            className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none resize-none text-black bg-white font-medium"
          />
        </div>

        {/* Course */}
        <div>
          <label htmlFor="course_id" className="block text-sm font-bold text-black mb-2">
            Course
          </label>
          <select
            {...register('course_id')}
            id="course_id"
            className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="due_date" className="block text-sm font-bold text-black mb-2">
              Due Date
            </label>
            <input
              {...register('due_date')}
              type="date"
              id="due_date"
              className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
            />
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-bold text-black mb-2">
              Priority
            </label>
            <select
              {...register('priority')}
              id="priority"
              className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-bold text-black mb-2">
            Status
          </label>
          <select
            {...register('status')}
            id="status"
            className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Estimated Duration */}
        <div>
          <label htmlFor="estimated_duration" className="block text-sm font-bold text-black mb-2">
            Estimated Duration (minutes)
          </label>
          <input
            {...register('estimated_duration', { valueAsNumber: true })}
            type="number"
            id="estimated_duration"
            min={1}
            className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 bg-gray-200 border-3 border-black text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !isDirty}
            className="flex-1 py-3 bg-yellow-300 border-3 border-black text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
