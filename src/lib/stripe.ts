import Stripe from 'stripe'

// Use placeholder key for build time
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_build'

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-07-30.basil',
})

export const getStripePublishableKey = () => {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder_key_for_build'
}