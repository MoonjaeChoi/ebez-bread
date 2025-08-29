-- Enable Row Level Security on all tables
-- This migration ensures proper multi-tenant security for Church Management System

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own church" ON public.churches;
DROP POLICY IF EXISTS "Users can update their own church" ON public.churches;
DROP POLICY IF EXISTS "Users can view same church users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users in their church" ON public.users;

-- Enable RLS on ALL public tables
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Churches table policies
CREATE POLICY "Users can view their own church" ON public.churches
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.users WHERE church_id = churches.id
        )
    );

CREATE POLICY "Users can update their own church" ON public.churches  
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.users WHERE church_id = churches.id AND role IN ('ADMIN', 'PASTOR')
        )
    );

-- Users table policies  
CREATE POLICY "Users can view same church users" ON public.users
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage users in their church" ON public.users
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'PASTOR')
        )
    );

-- Members table policies
CREATE POLICY "Church members access" ON public.members
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- Positions table policies
CREATE POLICY "Church positions access" ON public.positions
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- Departments table policies
CREATE POLICY "Church departments access" ON public.departments
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- Offerings table policies
CREATE POLICY "Church offerings access" ON public.offerings
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- Attendances table policies
CREATE POLICY "Church attendances access" ON public.attendances
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- Visitations table policies
CREATE POLICY "Church visitations access" ON public.visitations
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- Expense reports table policies
CREATE POLICY "Church expense reports access" ON public.expense_reports
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- Account codes table policies (Global system data - all authenticated users can read)
CREATE POLICY "Authenticated users can view account codes" ON public.account_codes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify account codes" ON public.account_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid() 
            AND role IN ('SUPER_ADMIN', 'FINANCIAL_MANAGER')
        )
    );

-- Notification tables policies
CREATE POLICY "Church notifications access" ON public.notification_queue
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Church notification history access" ON public.notification_history
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Church notification templates access" ON public.notification_templates
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM public.users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own notification settings" ON public.notification_settings
    FOR SELECT USING (
        user_id = auth.uid()
    );

CREATE POLICY "Users can update own notification settings" ON public.notification_settings
    FOR UPDATE USING (
        user_id = auth.uid()
    );

CREATE POLICY "Users can insert own notification settings" ON public.notification_settings
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
    FOR ALL USING (
        user_id = auth.uid()
    );

-- Create function for checking church admin privileges
CREATE OR REPLACE FUNCTION public.is_church_admin(church_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE user_id = auth.uid() 
        AND church_id = church_uuid 
        AND role IN ('ADMIN', 'PASTOR')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_church_admin(uuid) TO authenticated;