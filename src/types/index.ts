// ============================================================
// SLATE — Tipi TypeScript
// ============================================================

export type UserRole = 'photographer' | 'model'
export type ProfileStatus = 'pending' | 'approved' | 'suspended'
export type ProjectStatus =
  | 'proposed'
  | 'accepted'
  | 'brief_signed'
  | 'paid'
  | 'completed'
  | 'disputed'
  | 'cancelled'
export type PayerRole = 'photographer' | 'model' | 'tfp'
export type ShootUsage = 'portfolio_only' | 'social' | 'commercial'
export type XpReason =
  | 'seniority_bonus'
  | 'shoot_completed'
  | 'review_5_stars'
  | 'review_4_stars'
  | 'master_collaboration'
  | 'no_show_penalty'
  | 'late_cancellation_penalty'
  | 'report_penalty'

// ============================================================
// DATABASE ROWS
// ============================================================

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  bio: string | null
  city: string | null
  instagram_url: string | null
  years_in_industry: number
  oldest_photo_url: string | null
  avatar_url: string | null
  xp: number
  level: number
  status: ProfileStatus
  created_at: string
}

export interface PortfolioItem {
  id: string
  profile_id: string
  image_url: string
  caption: string | null
  order_index: number
  created_at: string
}

export interface InviteCode {
  id: string
  code: string
  created_by: string
  used_by: string | null
  used_at: string | null
  created_at: string
}

export interface Project {
  id: string
  photographer_id: string
  model_id: string
  proposed_by: string | null
  status: ProjectStatus
  payer_role: PayerRole
  amount: number
  stripe_payment_intent_id: string | null
  created_at: string
}

export interface Brief {
  id: string
  project_id: string
  shoot_type: string
  shoot_date: string
  duration_hours: number
  location_description: string
  deliverables_count: number
  delivery_days: number
  usage: ShootUsage
  notes: string | null
  signed_by_photographer_at: string | null
  signed_by_model_at: string | null
  created_at: string
}

export interface Review {
  id: string
  project_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface Message {
  id: string
  project_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface Conversation {
  id: string
  participant_1: string
  participant_2: string
  created_at: string
}

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface DirectMessageWithSender extends DirectMessage {
  sender: Pick<Profile, 'id' | 'full_name' | 'role'>
}

export interface ConversationWithProfiles extends Conversation {
  participant_1_profile: Pick<Profile, 'id' | 'full_name' | 'role' | 'avatar_url' | 'level'>
  participant_2_profile: Pick<Profile, 'id' | 'full_name' | 'role' | 'avatar_url' | 'level'>
}

export interface XpTransaction {
  id: string
  profile_id: string
  delta: number
  reason: XpReason
  project_id: string | null
  created_at: string
}

// ============================================================
// TIPI ESTESI (con join)
// ============================================================

export interface ProfileWithPortfolio extends Profile {
  portfolio_items: PortfolioItem[]
}

export interface ProjectWithParticipants extends Project {
  photographer: Profile
  model: Profile
  brief: Brief | null
}

export interface ReviewWithReviewer extends Review {
  reviewer: Pick<Profile, 'id' | 'full_name' | 'role'>
}

export interface MessageWithSender extends Message {
  sender: Pick<Profile, 'id' | 'full_name' | 'role'>
}

// ============================================================
// LIVELLI XP
// ============================================================

export const XP_LEVELS = [
  { level: 1, name: 'Newcomer', min: 0, max: 499 },
  { level: 2, name: 'Rising', min: 500, max: 1499 },
  { level: 3, name: 'Established', min: 1500, max: 3999 },
  { level: 4, name: 'Pro', min: 4000, max: 9999 },
  { level: 5, name: 'Master', min: 10000, max: Infinity },
] as const

export type LevelName = (typeof XP_LEVELS)[number]['name']

// ============================================================
// FORM TYPES
// ============================================================

export interface SignupFormData {
  email: string
  password: string
  invite_code: string
}

export interface OnboardingFormData {
  role: UserRole
  full_name: string
  bio: string
  city: string
  instagram_url: string
  years_in_industry: number
}

export interface BriefFormData {
  shoot_type: string
  shoot_date: string
  duration_hours: number
  location_description: string
  deliverables_count: number
  delivery_days: number
  usage: ShootUsage
  notes: string
}
