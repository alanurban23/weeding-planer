import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Błąd: Brak zmiennych środowiskowych SUPABASE_URL lub SUPABASE_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStructure() {
  try {
    // Dodajemy jedno proste zadanie testowe
    const testTask = {
      id: '999',
      title: 'Zadanie testowe',
      notes: ['Notatka testowa'],
      completed: false,
      category: 'Test'
    };

    console.log('Dodawanie zadania testowego...');
    const { data, error } = await supabase
      .from('tasks')
      .insert(testTask)
      .select();

    if (error) {
      console.error('Błąd podczas dodawania zadania testowego:', error);
      return;
    }

    console.log('Zadanie testowe zostało dodane:', data);

    // Pobieranie schematu tabeli (opcjonalne - działa tylko z bezpośrednim dostępem do bazy danych)
    console.log('\nPróba pobrania pierwszego zadania z tabeli tasks...');
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);

    if (taskError) {
      console.error('Błąd podczas pobierania zadania:', taskError);
      return;
    }

    if (taskData && taskData.length > 0) {
      console.log('Struktura pierwszego zadania z tabeli:');
      console.log(taskData[0]);
      console.log('\nDostępne kolumny:');
      console.log(Object.keys(taskData[0]).join(', '));
    } else {
      console.log('Brak zadań w tabeli.');
    }

    // Usunięcie zadania testowego
    console.log('\nUsuwanie zadania testowego...');
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', '999');

    if (deleteError) {
      console.error('Błąd podczas usuwania zadania testowego:', deleteError);
      return;
    }

    console.log('Zadanie testowe zostało usunięte.');
  } catch (error) {
    console.error('Wystąpił błąd:', error);
  }
}

testStructure();