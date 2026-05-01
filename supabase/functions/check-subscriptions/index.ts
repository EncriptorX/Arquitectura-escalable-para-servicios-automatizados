// =====================================================
// Check Subscriptions - Cron Job Edge Function
// Automatically checks and suspends expired subscriptions
// Run daily via cron: 0 0 * * * (midnight UTC)
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    console.log('Starting subscription check...')
    
    const results = {
      checked: 0,
      suspended: 0,
      warned: 0,
      errors: 0
    }

    // =====================================================
    // 1. Check for expired subscriptions
    // =====================================================
    
    const { data: expiredSubs, error: expiredError } = await supabase
      .from('subscriptions')
      .select('id, organization_id, current_period_end, status')
      .in('status', ['active', 'trialing'])
      .lt('current_period_end', new Date().toISOString())

    if (expiredError) {
      console.error('Error fetching expired subscriptions:', expiredError)
      results.errors++
    } else if (expiredSubs && expiredSubs.length > 0) {
      console.log(`Found ${expiredSubs.length} expired subscriptions`)
      
      for (const sub of expiredSubs) {
        try {
          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'canceled',
              canceled_at: new Date().toISOString()
            })
            .eq('id', sub.id)

          // Suspend organization
          await supabase
            .from('organizations')
            .update({ status: 'suspended' })
            .eq('id', sub.organization_id)

          // Send notification
          await supabase
            .from('notifications')
            .insert({
              organization_id: sub.organization_id,
              subject: 'Subscription Expired',
              body: 'Your subscription has expired. Please renew to continue using our services.',
              type: 'error',
              category: 'billing',
              delivery_method: 'both'
            })

          results.suspended++
          console.log(`Suspended organization: ${sub.organization_id}`)
        } catch (error) {
          console.error(`Error suspending organization ${sub.organization_id}:`, error)
          results.errors++
        }
      }
    }

    // =====================================================
    // 2. Warn about expiring subscriptions (7 days)
    // =====================================================
    
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const { data: expiringSubs, error: expiringError } = await supabase
      .from('subscriptions')
      .select('id, organization_id, current_period_end, status')
      .in('status', ['active', 'trialing'])
      .lt('current_period_end', sevenDaysFromNow.toISOString())
      .gt('current_period_end', new Date().toISOString())

    if (expiringError) {
      console.error('Error fetching expiring subscriptions:', expiringError)
      results.errors++
    } else if (expiringSubs && expiringSubs.length > 0) {
      console.log(`Found ${expiringSubs.length} expiring subscriptions`)
      
      for (const sub of expiringSubs) {
        try {
          // Check if warning was already sent today
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('organization_id', sub.organization_id)
            .eq('category', 'billing')
            .ilike('subject', '%expiring%')
            .gte('created_at', new Date().toISOString().split('T')[0])
            .single()

          if (!existingNotif) {
            // Send warning notification
            await supabase
              .from('notifications')
              .insert({
                organization_id: sub.organization_id,
                subject: 'Subscription Expiring Soon',
                body: `Your subscription will expire on ${new Date(sub.current_period_end).toLocaleDateString()}. Please renew to avoid service interruption.`,
                type: 'warning',
                category: 'billing',
                delivery_method: 'both'
              })

            results.warned++
            console.log(`Warned organization: ${sub.organization_id}`)
          }
        } catch (error) {
          console.error(`Error warning organization ${sub.organization_id}:`, error)
          results.errors++
        }
      }
    }

    // =====================================================
    // 3. Check for past_due subscriptions
    // =====================================================
    
    const { data: pastDueSubs, error: pastDueError } = await supabase
      .from('subscriptions')
      .select('id, organization_id, status')
      .eq('status', 'past_due')

    if (pastDueError) {
      console.error('Error fetching past_due subscriptions:', pastDueError)
      results.errors++
    } else if (pastDueSubs && pastDueSubs.length > 0) {
      console.log(`Found ${pastDueSubs.length} past_due subscriptions`)
      
      for (const sub of pastDueSubs) {
        try {
          // Ensure organization is suspended
          const { data: org } = await supabase
            .from('organizations')
            .select('status')
            .eq('id', sub.organization_id)
            .single()

          if (org && org.status !== 'suspended') {
            await supabase
              .from('organizations')
              .update({ status: 'suspended' })
              .eq('id', sub.organization_id)

            results.suspended++
            console.log(`Suspended past_due organization: ${sub.organization_id}`)
          }
        } catch (error) {
          console.error(`Error processing past_due organization ${sub.organization_id}:`, error)
          results.errors++
        }
      }
    }

    // =====================================================
    // 4. Check usage limits and send warnings
    // =====================================================
    
    const { data: activeOrgs, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        subscriptions!inner(
          id,
          plan_id,
          plans!inner(
            max_scans_per_month,
            max_domains,
            max_reports_per_month
          )
        )
      `)
      .eq('status', 'active')

    if (!orgsError && activeOrgs) {
      for (const org of activeOrgs) {
        try {
          // Check scan usage (80% threshold)
          const { data: scanUsage } = await supabase
            .rpc('check_plan_limit', {
              p_organization_id: org.id,
              p_resource_type: 'scan',
              p_quantity: 0
            })

          if (scanUsage && scanUsage[0]) {
            const usage = scanUsage[0]
            const usagePercent = (usage.current_usage / usage.plan_limit) * 100

            if (usagePercent >= 80 && usagePercent < 100) {
              // Send warning at 80%
              await supabase
                .from('notifications')
                .insert({
                  organization_id: org.id,
                  subject: 'Approaching Scan Limit',
                  body: `You've used ${usage.current_usage} of ${usage.plan_limit} scans this month (${Math.round(usagePercent)}%). Consider upgrading your plan.`,
                  type: 'warning',
                  category: 'system',
                  delivery_method: 'in_app'
                })

              results.warned++
            }
          }
        } catch (error) {
          console.error(`Error checking usage for organization ${org.id}:`, error)
          results.errors++
        }
      }
    }

    results.checked = (expiredSubs?.length || 0) + (expiringSubs?.length || 0) + (pastDueSubs?.length || 0)

    console.log('Subscription check completed:', results)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Subscription check error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})