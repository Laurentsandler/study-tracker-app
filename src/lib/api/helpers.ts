import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

/**
 * Extract user from request Authorization header
 */
export async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

/**
 * Verify user is a member of a shared course and return their membership info
 */
export async function verifySharedCourseMembership(courseId: string, userId: string) {
  const supabase = createServerClient();
  const { data: membership } = await supabase
    .from('shared_course_members')
    .select('role')
    .eq('shared_course_id', courseId)
    .eq('user_id', userId)
    .single();
  
  return membership;
}

/**
 * Valid assignment priorities
 */
export const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
export type ValidPriority = typeof VALID_PRIORITIES[number];

/**
 * Validate priority value
 */
export function isValidPriority(priority: unknown): priority is ValidPriority {
  return typeof priority === 'string' && VALID_PRIORITIES.includes(priority as ValidPriority);
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: unknown): boolean {
  if (typeof color !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate estimated duration (positive integer within reasonable range)
 */
export function isValidDuration(duration: unknown): boolean {
  if (typeof duration !== 'number') return false;
  return Number.isInteger(duration) && duration > 0 && duration <= 1440; // Max 24 hours
}
