import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import nodeFetch from 'node-fetch';

dotenv.config();

// ── Supabase ────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { global: { fetch: nodeFetch } }
);

// ── Gemini ───────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `Jesteś inteligentnym asystentem AI do planowania wesela. Pomagasz parze zaplanować ślub poprzez naturalną rozmowę wyłącznie po polsku.

DOSTĘPNE AKCJE:

1. ADD_COST - Dodanie wydatku weselnego
   Wymagane: name (nazwa kosztu), value (kwota w PLN jako liczba bez symbolu)
   Opcjonalne: due_date (data w formacie YYYY-MM-DD), notes
   Przykład: "Dodaj koszt sala weselna 5000 zł" → name="Sala weselna", value=5000

2. LIST_COSTS - Wyświetlenie wszystkich wydatków (backend pobierze dane)
   Brak wymaganych pól

3. BUDGET_SUMMARY - Podsumowanie budżetu (ile wydano, ile zostało z 80000 zł)
   Brak wymaganych pól

4. ADD_GUEST - Dodanie gościa weselnego
   Wymagane: fullName (imię i nazwisko)
   Opcjonalne: guestCount (liczba osób w grupie, domyślnie 1), email, phone,
               side (strona: "panna_mloda" lub "pan_mlody"),
               rsvpStatus ("pending"|"confirmed"|"declined"), notes
   Przykład: "Dodaj gościa Anna Kowalska potwierdzona" → fullName="Anna Kowalska", rsvpStatus="confirmed"

5. UPDATE_GUEST_STATUS - Zmiana statusu RSVP gościa
   Wymagane: guestName (imię i nazwisko lub fragment), rsvpStatus ("confirmed"|"declined"|"pending")
   Przykład: "Potwierdź Annę Kowalską" → guestName="Anna Kowalska", rsvpStatus="confirmed"
   Przykład: "Kowalski odmówił" → guestName="Kowalski", rsvpStatus="declined"

6. LIST_GUESTS - Wyświetlenie listy gości (backend pobierze dane)
   Opcjonalne: statusFilter ("confirmed"|"pending"|"declined")

7. ADD_TASK - Dodanie zadania do zrobienia
   Wymagane: title (tytuł zadania)
   Opcjonalne: dueDate (data w formacie YYYY-MM-DD)

8. LIST_TASKS - Wyświetlenie listy zadań (backend pobierze dane)
   Brak wymaganych pól

9. ADD_NOTE - Dodanie notatki
   Wymagane: content (treść notatki)

10. LIST_NOTES - Wyświetlenie notatek (backend pobierze dane)
    Brak wymaganych pól

11. CHAT - Zwykła rozmowa, pytania ogólne, dziękowanie, powitanie itp.

ZASADY:
- Odpowiadaj WYŁĄCZNIE w języku polskim w polu "message"
- Gdy masz wszystkie wymagane pola → ustaw readyToExecute: true (backend wykona akcję)
- Gdy brakuje wymaganych pól → zapytaj o nie w message, ustaw readyToExecute: false
- Ekstrakcja danych: wyciągaj dane z całej historii rozmowy, nie tylko ostatniej wiadomości
- Kwoty: zawsze jako liczba (5000, nie "5000 zł")
- Daty: zawsze YYYY-MM-DD (dzisiaj: ${new Date().toISOString().split('T')[0]}, rok: ${new Date().getFullYear()})
- Bądź ciepły, entuzjastyczny, krótki i konkretny
- Przy CHAT odpowiadaj naturalnie jak pomocny asystent weselny

FORMAT ODPOWIEDZI (czysty JSON, bez markdown):
{
  "action": "NAZWA_AKCJI",
  "data": {},
  "missingFields": [],
  "message": "Twoja odpowiedź po polsku",
  "readyToExecute": false
}`;

// ── Body parser ──────────────────────────────────────────────────────────────

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

// ── DB Actions ───────────────────────────────────────────────────────────────

async function addCost(data) {
  const { name, value, due_date, notes } = data;
  const { error } = await supabase.from('costs').insert({
    name: String(name).trim(),
    value: parseFloat(value),
    total_amount: parseFloat(value),
    due_date: due_date || null,
    notes: notes || null,
    payment_status: 'unpaid',
    amount_paid: 0,
  });
  if (error) throw new Error(error.message);
  return `✅ Dodano koszt: **${name}** — ${Number(value).toLocaleString('pl-PL')} zł${due_date ? `, termin: ${due_date}` : ''}.`;
}

async function listCosts() {
  const { data, error } = await supabase
    .from('costs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!data?.length) return 'Brak wydatków w bazie.';
  const total = data.reduce((s, c) => s + (c.total_amount || c.value || 0), 0);
  const paid = data.reduce((s, c) => s + (c.amount_paid || 0), 0);
  const lines = data.map(c => {
    const status = c.amount_paid >= (c.total_amount || c.value)
      ? '✅' : c.amount_paid > 0 ? '🔶' : '⏳';
    return `${status} **${c.name}** — ${Number(c.total_amount || c.value).toLocaleString('pl-PL')} zł`;
  });
  return `📋 **Wydatki weselne** (${data.length}):\n\n${lines.join('\n')}\n\n💰 Suma: ${total.toLocaleString('pl-PL')} zł | Zapłacono: ${paid.toLocaleString('pl-PL')} zł`;
}

async function budgetSummary() {
  const TOTAL = 80000;
  const { data, error } = await supabase.from('costs').select('value, total_amount, amount_paid');
  if (error) throw new Error(error.message);
  const spent = (data || []).reduce((s, c) => s + (c.total_amount || c.value || 0), 0);
  const paid = (data || []).reduce((s, c) => s + (c.amount_paid || 0), 0);
  const remaining = TOTAL - spent;
  const pct = Math.round((spent / TOTAL) * 100);
  return `💍 **Budżet weselny**\n\n🎯 Całkowity: ${TOTAL.toLocaleString('pl-PL')} zł\n💸 Zaplanowane: ${spent.toLocaleString('pl-PL')} zł (${pct}%)\n✅ Zapłacone: ${paid.toLocaleString('pl-PL')} zł\n💰 Pozostało: ${remaining.toLocaleString('pl-PL')} zł`;
}

async function addGuest(data) {
  const { fullName, guestCount = 1, email, phone, side, rsvpStatus = 'pending', notes } = data;
  const { error } = await supabase.from('guests').insert({
    full_name: String(fullName).trim(),
    guest_count: parseInt(guestCount) || 1,
    email: email || null,
    phone: phone || null,
    side: side || null,
    rsvp_status: rsvpStatus,
    notes: notes || null,
  });
  if (error) throw new Error(error.message);
  const statusLabel = { confirmed: 'potwierdzony', declined: 'odmówił', pending: 'oczekuje' }[rsvpStatus] || rsvpStatus;
  return `✅ Dodano gościa: **${fullName}**${guestCount > 1 ? ` (${guestCount} os.)` : ''} — ${statusLabel}.`;
}

async function updateGuestStatus(data) {
  const { guestName, rsvpStatus } = data;
  const { data: guests, error: fetchErr } = await supabase
    .from('guests')
    .select('id, full_name')
    .ilike('full_name', `%${guestName}%`)
    .limit(5);
  if (fetchErr) throw new Error(fetchErr.message);
  if (!guests?.length) return `❌ Nie znaleziono gościa pasującego do "${guestName}". Sprawdź pisownię.`;
  const guest = guests[0];
  const { error: updateErr } = await supabase
    .from('guests')
    .update({ rsvp_status: rsvpStatus })
    .eq('id', guest.id);
  if (updateErr) throw new Error(updateErr.message);
  const statusLabel = { confirmed: 'potwierdzony ✅', declined: 'odmówił ❌', pending: 'oczekuje ⏳' }[rsvpStatus] || rsvpStatus;
  return `✅ Zaktualizowano status gościa **${guest.full_name}**: ${statusLabel}.`;
}

async function listGuests(data) {
  const { statusFilter } = data || {};
  let query = supabase.from('guests').select('*').order('full_name');
  if (statusFilter) query = query.eq('rsvp_status', statusFilter);
  const { data: guests, error } = await query;
  if (error) throw new Error(error.message);
  if (!guests?.length) return 'Brak gości' + (statusFilter ? ` o statusie "${statusFilter}"` : '') + '.';
  const confirmed = guests.filter(g => g.rsvp_status === 'confirmed').length;
  const pending = guests.filter(g => g.rsvp_status === 'pending').length;
  const declined = guests.filter(g => g.rsvp_status === 'declined').length;
  const total = guests.reduce((s, g) => s + (g.guest_count || 1), 0);
  const lines = guests.map(g => {
    const icon = g.rsvp_status === 'confirmed' ? '✅' : g.rsvp_status === 'declined' ? '❌' : '⏳';
    const count = g.guest_count > 1 ? ` ×${g.guest_count}` : '';
    return `${icon} **${g.full_name}**${count}`;
  });
  const header = `👥 **Lista gości** (${guests.length} grup, ${total} os.) — ✅ ${confirmed} | ⏳ ${pending} | ❌ ${declined}\n\n`;
  return header + lines.join('\n');
}

async function addTask(data) {
  const { title, dueDate } = data;
  const { error } = await supabase.from('tasks').insert({
    title: String(title).trim(),
    notes: [],
    completed: false,
    due_date: dueDate || null,
  });
  if (error) throw new Error(error.message);
  return `✅ Dodano zadanie: **${title}**${dueDate ? `, termin: ${dueDate}` : ''}.`;
}

async function listTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!data?.length) return 'Brak zadań na liście.';
  const done = data.filter(t => t.completed).length;
  const lines = data.slice(0, 15).map(t =>
    `${t.completed ? '✅' : '⬜'} ${t.title}${t.due_date ? ` _(${t.due_date})_` : ''}`
  );
  return `📋 **Zadania** (${data.length}, ukończone: ${done}):\n\n${lines.join('\n')}${data.length > 15 ? `\n\n…i ${data.length - 15} więcej.` : ''}`;
}

async function addNote(data) {
  const { content } = data;
  const { error } = await supabase.from('notes').insert({ content: String(content).trim() });
  if (error) throw new Error(error.message);
  return `✅ Notatka zapisana.`;
}

async function listNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!data?.length) return 'Brak notatek.';
  const lines = data.slice(0, 10).map((n, i) =>
    `**${i + 1}.** ${n.content.slice(0, 100)}${n.content.length > 100 ? '…' : ''}`
  );
  return `📝 **Notatki** (${data.length}):\n\n${lines.join('\n\n')}`;
}

// ── Execute action ────────────────────────────────────────────────────────────

async function executeAction(action, data) {
  switch (action) {
    case 'ADD_COST': return addCost(data);
    case 'LIST_COSTS': return listCosts();
    case 'BUDGET_SUMMARY': return budgetSummary();
    case 'ADD_GUEST': return addGuest(data);
    case 'UPDATE_GUEST_STATUS': return updateGuestStatus(data);
    case 'LIST_GUESTS': return listGuests(data);
    case 'ADD_TASK': return addTask(data);
    case 'LIST_TASKS': return listTasks();
    case 'ADD_NOTE': return addNote(data);
    case 'LIST_NOTES': return listNotes();
    default: return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      message: '⚠️ Brak klucza GEMINI_API_KEY w zmiennych środowiskowych. Dodaj go w ustawieniach Vercel.',
      action: 'CHAT',
      readyToExecute: false,
    });
  }

  try {
    const body = await parseJsonBody(req);
    const { messages = [] } = body;

    if (!messages.length) {
      return res.status(400).json({ error: 'Brak wiadomości' });
    }

    // Build Gemini chat history (all messages except the last one)
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const lastMessage = messages[messages.length - 1].content;

    // Call Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    const rawText = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Fallback if JSON parsing fails
      return res.status(200).json({
        message: rawText,
        action: 'CHAT',
        readyToExecute: false,
      });
    }

    const { action, data, message, readyToExecute } = parsed;
    let finalMessage = message;

    // Execute action if AI says it's ready
    if (readyToExecute && action && action !== 'CHAT') {
      try {
        const dbResult = await executeAction(action, data || {});
        if (dbResult) {
          finalMessage = dbResult;
        }
      } catch (dbErr) {
        finalMessage = `❌ Błąd: ${dbErr.message}`;
      }
    }

    return res.status(200).json({
      message: finalMessage,
      action,
      readyToExecute,
      data,
    });

  } catch (err) {
    console.error('AI chat error:', err);
    return res.status(500).json({
      message: `❌ Błąd serwera: ${err.message}`,
      action: 'CHAT',
    });
  }
}
