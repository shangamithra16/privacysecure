
-- Fix the permissive policy: restrict login_attempts insert to authenticated or service role
DROP POLICY "Anyone can insert login attempts" ON public.login_attempts;
CREATE POLICY "Service can insert login attempts" ON public.login_attempts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR current_setting('request.jwt.claim.role', true) = 'service_role');
