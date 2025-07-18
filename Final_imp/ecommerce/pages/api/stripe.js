// import { NextResponse } from 'next/server'
// import { headers } from 'next/headers'
import Stripe from "stripe";

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method === 'POST') {
      try {
        const params = {
          submit_type: 'pay',
          mode: 'payment',
          payment_method_types: ['card'],
          billing_address_collection: 'auto',
          shipping_options: [
            { shipping_rate: 'shr_1RNb6ECiNOLHqqFbjdiWXl10' },
          ],          line_items: req.body.map((item) => {
            // Use the image URL from our backend or a placeholder
            const imageUrl = item.image || item.images?.[0] || '/assets/placeholder.png';
            const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${req.headers.origin}${imageUrl}`;
            
            return {
                price_data: { 
                  currency: 'usd',
                  product_data: { 
                    name: item.name || item.productName,
                    images: [fullImageUrl],
                  },
                  unit_amount: Math.round((item.price || 0) * 100),
                },
                adjustable_quantity: {
                  enabled:true,
                  minimum: 1,
                },
                quantity: item.quantity || 1
              }
            }),
            success_url: `${req.headers.origin}/success`,
            cancel_url: `${req.headers.origin}/canceled`,
          }
    
          // Create Checkout Sessions from body params.
          const session = await stripe.checkout.sessions.create(params);
    
          res.status(200).json(session);
        } catch (err) {
          res.status(err.statusCode || 500).json(err.message);
        }
      } else {
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
      }
    }