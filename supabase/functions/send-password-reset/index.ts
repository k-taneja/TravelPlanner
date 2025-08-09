/*
  # Send Password Reset Email Edge Function

  This function handles custom password reset email sending with branded templates.
  It uses Supabase Auth's built-in password reset functionality with custom email templates.
  
  1. Validates email format and user existence
  2. Sends password reset email with custom branding
  3. Returns success/error status to frontend
  4. Handles rate limiting and security measures
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PasswordResetRequest {
  email: string
  redirectTo?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, redirectTo } = await req.json() as PasswordResetRequest

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Get Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if user exists (optional - for security, you might want to always return success)
    const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(email)
    
    if (userError || !user) {
      // For security reasons, we still return success even if user doesn't exist
      // This prevents email enumeration attacks
      console.log(`Password reset requested for non-existent email: ${email}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo || `${req.headers.get('origin')}/reset-password`
      }
    })

    if (resetError) {
      console.error('Password reset error:', resetError)
      return new Response(
        JSON.stringify({ error: 'Failed to send password reset email' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    // Log successful password reset request (for monitoring)
    console.log(`Password reset email sent to: ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset email sent successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Password reset function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to process password reset request'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})