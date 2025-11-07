import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { URL } from 'url';
import nodeFetch from 'node-fetch';

// Load environment variables
dotenv.config();

// --- Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL ERROR: Supabase URL and Anon Key must be defined.");
  throw new Error("Missing Supabase configuration.");
}

// --- Initialize Supabase Client ---
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
  global: {
    fetch: nodeFetch,
  },
});

const PAYMENT_HISTORY_TABLE = 'payment_history';
const COSTS_TABLE = 'costs';

// Helper function to parse JSON body from request stream
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({});
          return;
        }
        resolve(JSON.parse(body));
      } catch (e) {
        console.error("JSON Parsing Error:", e);
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on('error', (err) => {
      console.error("Request Stream Error:", err);
      reject(err);
    });
  });
}

// Helper function to recalculate payment status
async function recalculatePaymentStatus(costId) {
  // Get cost details
  const { data: cost, error: costError } = await supabase
    .from(COSTS_TABLE)
    .select('total_amount, value')
    .eq('id', costId)
    .single();

  if (costError) throw costError;

  // Get all payments for this cost
  const { data: payments, error: paymentsError } = await supabase
    .from(PAYMENT_HISTORY_TABLE)
    .select('amount')
    .eq('cost_id', costId);

  if (paymentsError) throw paymentsError;

  // Calculate total paid
  const amountPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalAmount = parseFloat(cost.total_amount || cost.value);

  // Determine status
  let paymentStatus = 'unpaid';
  if (amountPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = 'paid';
  } else if (amountPaid > 0) {
    paymentStatus = 'partial';
  }

  // Update cost
  const { error: updateError } = await supabase
    .from(COSTS_TABLE)
    .update({
      amount_paid: amountPaid,
      payment_status: paymentStatus
    })
    .eq('id', costId);

  if (updateError) throw updateError;

  return { amountPaid, paymentStatus };
}

// --- Vercel Serverless Function Handler ---
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, url } = req;
  const parsedUrl = new URL(url, `http://${req.headers.host}`);
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

  try {
    // --- GET /api/payments?cost_id=X ---
    if (method === 'GET' && pathSegments.length === 2 && pathSegments[1] === 'payments') {
      const costId = parsedUrl.searchParams.get('cost_id');

      if (!costId) {
        return res.status(400).json({ error: 'cost_id parameter is required' });
      }

      console.log(`GET /api/payments?cost_id=${costId}`);

      const { data, error } = await supabase
        .from(PAYMENT_HISTORY_TABLE)
        .select('*')
        .eq('cost_id', costId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount),
      })) || [];

      console.log(`Returning ${formattedData.length} payments for cost ${costId}.`);
      return res.status(200).json(formattedData);
    }

    // --- POST /api/payments ---
    if (method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'payments') {
      const body = await parseJsonBody(req);
      console.log('POST /api/payments - Parsed Body:', body);
      const { cost_id, amount, note } = body;

      if (!cost_id) {
        return res.status(400).json({ error: 'cost_id is required.' });
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: 'Valid positive amount is required.' });
      }

      // Insert payment
      const { data, error } = await supabase
        .from(PAYMENT_HISTORY_TABLE)
        .insert({
          cost_id: cost_id,
          amount: numericAmount,
          note: note?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Recalculate payment status
      await recalculatePaymentStatus(cost_id);

      const formattedPayment = {
        ...data,
        amount: parseFloat(data.amount),
      };

      console.log(`Payment added with ID ${formattedPayment.id} for cost ${cost_id}.`);
      return res.status(201).json(formattedPayment);
    }

    // --- DELETE /api/payments/:id ---
    if (method === 'DELETE' && pathSegments.length === 3 && pathSegments[1] === 'payments') {
      const id = pathSegments[2];
      console.log(`DELETE /api/payments/${id}`);

      const paymentId = parseInt(id, 10);
      if (isNaN(paymentId)) {
        return res.status(400).json({ error: 'Valid payment ID is required.' });
      }

      // Get payment details before deleting (to get cost_id)
      const { data: payment, error: fetchError } = await supabase
        .from(PAYMENT_HISTORY_TABLE)
        .select('cost_id')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found.' });
      }

      // Delete payment
      const { error, count } = await supabase
        .from(PAYMENT_HISTORY_TABLE)
        .delete({ count: 'exact' })
        .eq('id', paymentId);

      if (error) throw error;

      if (count === 0) {
        return res.status(404).json({ error: 'Payment not found.' });
      }

      // Recalculate payment status
      await recalculatePaymentStatus(payment.cost_id);

      console.log(`Payment ID ${id} deleted.`);
      return res.status(200).json({ success: true, message: 'Payment deleted successfully.' });
    }

    // --- Not Found ---
    res.status(404).json({ error: 'Not Found', path: parsedUrl.pathname });

  } catch (error) {
    console.error(`API Error (${method} ${url}):`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }
}
