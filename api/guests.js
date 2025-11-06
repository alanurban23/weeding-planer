import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL ERROR: Supabase URL and Anon Key must be defined.");
  throw new Error("Missing Supabase configuration.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});

const GUESTS_TABLE = 'guests';
const RSVP_STATUSES = ['pending', 'confirmed', 'declined'];

const parseGuestId = (id) => {
  if (id === undefined || id === null || id === '') {
    return null;
  }
  const parsed = parseInt(String(id), 10);
  if (Number.isNaN(parsed)) {
    console.warn(`Received non-numeric guest id '${id}', treating as null.`);
    return null;
  }
  return parsed;
};

const normalizeRsvpStatus = (value) => {
  if (!value && value !== 0) return 'pending';
  const normalized = String(value).trim().toLowerCase();

  if (['confirmed', 'potwierdzony', 'potwierdzone', 'tak'].includes(normalized)) {
    return 'confirmed';
  }
  if (
    [
      'declined',
      'odrzucony',
      'odrzucone',
      'nie',
      'nieprzyjdzie',
      'nie przyjdzie',
      'rezygnacja',
    ].includes(normalized)
  ) {
    return 'declined';
  }
  if (RSVP_STATUSES.includes(normalized)) {
    return normalized;
  }
  return 'pending';
};

const sanitizeText = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const formatGuest = (guest) => {
  if (!guest) return null;
  return {
    id: guest.id,
    fullName: guest.full_name,
    email: guest.email,
    phone: guest.phone,
    side: guest.side,
    rsvpStatus: guest.rsvp_status || 'pending',
    notes: guest.notes,
    createdAt: guest.created_at,
  };
};

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
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
        console.error('JSON Parsing Error:', e);
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', (err) => {
      console.error('Request Stream Error:', err);
      reject(err);
    });
  });
}

const buildGuestPayload = (payload, { allowPartial = false } = {}) => {
  const result = {};
  if ('fullName' in payload || !allowPartial) {
    const fullName = sanitizeText(payload.fullName);
    if (!fullName) {
      throw new Error('Guest fullName is required.');
    }
    result.full_name = fullName;
  }
  if ('email' in payload || !allowPartial) {
    result.email = sanitizeText(payload.email);
  }
  if ('phone' in payload || !allowPartial) {
    result.phone = sanitizeText(payload.phone);
  }
  if ('side' in payload || !allowPartial) {
    result.side = sanitizeText(payload.side);
  }
  if ('rsvpStatus' in payload || !allowPartial) {
    result.rsvp_status = normalizeRsvpStatus(payload.rsvpStatus);
  }
  if ('notes' in payload || !allowPartial) {
    result.notes = sanitizeText(payload.notes);
  }
  return result;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, url } = req;
  const parsedUrl = new URL(url, `http://${req.headers.host}`);
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

  try {
    if (method === 'GET' && pathSegments.length === 2 && pathSegments[1] === 'guests') {
      const { data, error } = await supabase
        .from(GUESTS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formatted = data?.map(formatGuest) || [];
      return res.status(200).json(formatted);
    }

    if (method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'guests') {
      const body = await parseJsonBody(req);
      try {
        const guestToInsert = buildGuestPayload(body);
        const { data, error } = await supabase.from(GUESTS_TABLE).insert(guestToInsert).select().single();
        if (error) throw error;
        return res.status(201).json(formatGuest(data));
      } catch (payloadError) {
        return res.status(400).json({ error: payloadError.message });
      }
    }

    if (method === 'POST' && pathSegments.length === 3 && pathSegments[1] === 'guests' && pathSegments[2] === 'import') {
      const body = await parseJsonBody(req);
      const guests = Array.isArray(body.guests) ? body.guests : [];
      if (!guests.length) {
        return res.status(400).json({ error: 'Brak rekordów do importu.' });
      }

      const validPayloads = [];
      const skipped = [];
      guests.forEach((guest, index) => {
        try {
          const guestPayload = buildGuestPayload(guest);
          validPayloads.push(guestPayload);
        } catch (e) {
          skipped.push({ index, reason: e.message, guest });
        }
      });

      if (!validPayloads.length) {
        return res.status(400).json({ error: 'Brak poprawnych rekordów do importu.', skipped });
      }

      const { data, error } = await supabase.from(GUESTS_TABLE).insert(validPayloads).select();
      if (error) throw error;

      return res.status(201).json({ imported: data?.map(formatGuest) || [], skipped });
    }

    if (method === 'PATCH' && pathSegments.length === 3 && pathSegments[1] === 'guests') {
      const guestId = parseGuestId(pathSegments[2]);
      if (guestId === null) {
        return res.status(400).json({ error: 'Valid Guest ID parameter is required.' });
      }
      const body = await parseJsonBody(req);
      const updatePayload = {};
      if ('fullName' in body) {
        const fullName = sanitizeText(body.fullName);
        if (!fullName) {
          return res.status(400).json({ error: 'fullName must be a non-empty string.' });
        }
        updatePayload.full_name = fullName;
      }
      if ('email' in body) updatePayload.email = sanitizeText(body.email);
      if ('phone' in body) updatePayload.phone = sanitizeText(body.phone);
      if ('side' in body) updatePayload.side = sanitizeText(body.side);
      if ('rsvpStatus' in body) updatePayload.rsvp_status = normalizeRsvpStatus(body.rsvpStatus);
      if ('notes' in body) updatePayload.notes = sanitizeText(body.notes);

      if (!Object.keys(updatePayload).length) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
      }

      const { data, error } = await supabase
        .from(GUESTS_TABLE)
        .update(updatePayload)
        .eq('id', guestId)
        .select()
        .single();
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Guest not found for update.' });
        }
        throw error;
      }
      return res.status(200).json(formatGuest(data));
    }

    if (method === 'DELETE' && pathSegments.length === 3 && pathSegments[1] === 'guests') {
      const guestId = parseGuestId(pathSegments[2]);
      if (guestId === null) {
        return res.status(400).json({ error: 'Valid Guest ID parameter is required.' });
      }
      const { error } = await supabase.from(GUESTS_TABLE).delete().eq('id', guestId);
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Guest not found for deletion.' });
        }
        throw error;
      }
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Endpoint not found.' });
  } catch (error) {
    console.error('Guests API error:', error);
    return res.status(500).json({ error: 'Błąd serwera: ' + error.message });
  }
}
