import Stripe from 'stripe';

// Stripe's constructor throws immediately if the key is falsy (unlike the
// S3/OpenAI clients elsewhere in this codebase, which stay lazy) — fall
// back to a placeholder so modules that only transitively import this
// (e.g. in tests) don't crash at import time. Real calls still require the
// genuine STRIPE_SECRET_KEY to be set.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
