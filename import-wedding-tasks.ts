import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { format } from 'date-fns';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Błąd: Brak zmiennych środowiskowych SUPABASE_URL lub SUPABASE_API_KEY');
  process.exit(1);
}

console.log(`Używam URL Supabase: ${supabaseUrl}`);
console.log('Klucz API został poprawnie znaleziony');

const supabase = createClient(supabaseUrl, supabaseKey);

interface TaskData {
  zadanie: string;
  notatki: string | null;
}

interface SectionTask {
  zadanie: string;
  notatki: string | null;
}

async function importTasksFromJson() {
  try {
    // Wczytanie danych z pliku JSON
    const jsonData = fs.readFileSync('./attached_assets/Pasted--ustalenie-daty-i-miejsca-zadanie-Ustalenie-daty-lubu-notatki--1743157718473.txt', 'utf8');
    const parsedData = JSON.parse(jsonData);

    // Usuwanie istniejących zadań
    console.log('Usuwanie istniejących zadań...');
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .neq('id', '0'); // Usunie wszystkie zadania

    if (deleteError) {
      console.error('Błąd podczas usuwania istniejących zadań:', deleteError);
      return;
    }
    
    console.log('Istniejące zadania zostały usunięte.');

    // Przygotowanie danych do importu
    const tasksToImport: Array<{
      id: string;
      title: string;
      notes: string[];
      completed: boolean;
      category: string;
      due_date: string | null;
    }> = [];

    // Dodajemy ręcznie zadania dla II. Usługodawcy
    const uslugodawcyTasks = [
      {
        title: "Wybór fotografa i kamerzysty",
        notes: ["Wybrana firma: Cozawesele. Umowa podpisana. Koszt: 12300 zł po weselu. Każda dodatkowa godzina to 500 złotych."],
        category: "II. Usługodawcy"
      },
      {
        title: "Ustalenie miejsca spotkania z fotografem i kamerzystą",
        notes: ["Dzień przed ślubem."],
        category: "II. Usługodawcy"
      },
      {
        title: "Wybór zespołu muzycznego",
        notes: ["Podpisana umowa: całość 10 000 zł w dniu wesela, kaucja 1 000 zł zapłacona."],
        category: "II. Usługodawcy"
      },
      {
        title: "Wybór i rezerwacja florysty",
        notes: ["Wybrana florystka, skontaktować się z nią, co dokładnie chcemy."],
        category: "II. Usługodawcy"
      },
      {
        title: "Bukiet dla panny młodej",
        notes: ["Zamówienie bukietu ślubnego."],
        category: "II. Usługodawcy"
      },
      {
        title: "Barman",
        notes: ["Wysłać umowę, płatność w dzień wesela: 3350 zł (150 os). Weddingcoctail.pl Marcin."],
        category: "II. Usługodawcy"
      }
    ];
    
    // Dodajemy zadania usługodawców
    let taskId = 1;
    
    for (const task of uslugodawcyTasks) {
      tasksToImport.push({
        id: taskId.toString(),
        title: task.title,
        notes: task.notes,
        completed: false,
        category: task.category,
        due_date: null
      });
      taskId++;
    }

    // Funkcja pomocnicza do przetwarzania pojedynczego zadania
    const processTask = (task: any, category: string) => {
      if (!task || typeof task !== 'object' || !task.zadanie) {
        console.log('Pominięto nieprawidłowe zadanie:', task);
        return;
      }
      
      const notes: string[] = [];
      if (task.notatki) {
        notes.push(task.notatki);
      }

      const title = typeof task.zadanie === 'string' 
        ? task.zadanie.replace(/^\*\*|\*\*$/g, '') // Usuwanie gwiazdek z początku i końca
        : String(task.zadanie);

      tasksToImport.push({
        id: taskId.toString(),
        title,
        notes,
        completed: false,
        category,
        due_date: null
      });

      taskId++;
    };

    // Przetwarzanie każdej sekcji
    for (const [category, tasks] of Object.entries(parsedData)) {
      let categoryName = '';
      
      // Konwersja nazwy kategorii na odpowiedni format
      switch (category) {
        case 'ustalenie_daty_i_miejsca':
          categoryName = 'I. Ustalenia Ogólne';
          break;
        case 'budzet_i_goscie':
          categoryName = 'I. Ustalenia Ogólne';
          break;
        case 'styl_i_charakter_uroczystosci':
          categoryName = 'I. Ustalenia Ogólne';
          break;
        case 'uslugodawcy':
          categoryName = 'II. Usługodawcy';
          break;
        case 'formalnosci_koscielne':
          categoryName = 'I. Ustalenia Ogólne';
          break;
        case 'wybor_strojow_i_akcesoriow':
          categoryName = 'IV. Dekoracje i dodatki';
          break;
        case 'obraczki':
          categoryName = 'IV. Dekoracje i dodatki';
          break;
        case 'zaproszenia_i_papeteria':
          categoryName = 'IV. Dekoracje i dodatki';
          break;
        case 'atrakcje_weselne':
          categoryName = 'V. Atrakcje';
          break;
        case 'tort_i_menu':
          categoryName = 'III. Catering';
          break;
        case 'fryzura_i_makijaz':
          categoryName = 'IV. Dekoracje i dodatki';
          break;
        case 'harmonogram_i_plan_dnia':
          categoryName = 'I. Ustalenia Ogólne';
          break;
        case 'pierwszy_taniec':
          categoryName = 'V. Atrakcje';
          break;
        case 'platnosci':
          categoryName = 'I. Ustalenia Ogólne';
          break;
        case 'dzien_przed_slubem':
          categoryName = 'VI. Dzień ślubu';
          break;
        case 'w_dniu_slubu':
          categoryName = 'VI. Dzień ślubu';
          break;
        case 'swiadkowie':
          categoryName = 'I. Ustalenia Ogólne';
          break;
        default:
          categoryName = 'I. Ustalenia Ogólne';
      }

      // Sprawdzanie typu danych w tej sekcji
      if (Array.isArray(tasks)) {
        // Jeśli to prosta tablica zadań
        for (const task of tasks as TaskData[]) {
          processTask(task, categoryName);
        }
      } else if (category === 'uslugodawcy') {
        // Specjalne przetwarzanie dla sekcji uslugodawcy
        const uslugi = tasks as any;
        
        if (Array.isArray(uslugi)) {
          // Jeśli to tablica zadań bezpośrednio
          for (const task of uslugi) {
            processTask(task, categoryName);
          }
        } else {
          // Jeśli to struktura z podsekcjami
          Object.entries(uslugi).forEach(([sekcjaName, sekcja]) => {
            if (sekcja && typeof sekcja === 'object') {
              console.log(`Przetwarzanie sekcji usługodawców: ${sekcjaName}`);
              
              if ('zadania' in sekcja && Array.isArray(sekcja.zadania)) {
                // Jeśli mamy strukturę { sekcja_name: { zadania: [...] } }
                for (const task of sekcja.zadania) {
                  if (task && typeof task === 'object' && 'zadanie' in task) {
                    // Ekstraktujemy zadania bezpośrednio z podsekcji
                    const title = typeof task.zadanie === 'string' 
                      ? task.zadanie.replace(/^\*\*|\*\*$/g, '') // Usuwanie gwiazdek z początku i końca
                      : String(task.zadanie);
                    
                    const notes: string[] = [];
                    if (task.notatki) {
                      notes.push(task.notatki);
                    }
                    
                    tasksToImport.push({
                      id: taskId.toString(),
                      title,
                      notes,
                      completed: false,
                      category: categoryName,
                      due_date: null
                    });
                    
                    taskId++;
                    console.log(`Dodano zadanie usługodawcy: ${title}`);
                  }
                }
              }
            }
          });
        }
      } else {
        // Jeśli to obiekt z podsekcjami
        const obj = tasks as any;
        if (obj.sekcja && obj.zadania && Array.isArray(obj.zadania)) {
          // Jeśli obiekt ma strukturę { sekcja, zadania }
          for (const task of obj.zadania as SectionTask[]) {
            processTask(task, categoryName);
          }
        } else {
          // Sprawdzamy czy to jest tablica podsekcji
          for (const subSection of Object.values(obj)) {
            if (subSection && typeof subSection === 'object' && 'sekcja' in subSection && 'zadania' in subSection) {
              const subSectionObj = subSection as { sekcja: string; zadania: SectionTask[] };
              for (const task of subSectionObj.zadania) {
                processTask(task, categoryName);
              }
            }
          }
        }
      }
    }

    // Dodawanie przygotowanych zadań do Supabase
    console.log(`Dodawanie ${tasksToImport.length} zadań do Supabase...`);
    const { data, error } = await supabase
      .from('tasks')
      .insert(tasksToImport)
      .select();

    if (error) {
      console.error('Błąd podczas dodawania zadań:', error);
      return;
    }

    console.log(`Pomyślnie dodano ${tasksToImport.length} zadań do bazy danych Supabase.`);

    // Pobieranie i wyświetlanie dodanych zadań
    const { data: allTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .order('id');

    if (fetchError) {
      console.error('Błąd podczas pobierania zadań:', fetchError);
      return;
    }

    console.log(`\nW bazie danych Supabase znajduje się ${allTasks.length} zadań:`);
    for (const task of allTasks.slice(0, 10)) { // Pokazujemy tylko pierwsze 10 zadań
      console.log(`- ${task.title} (${task.category})`);
    }
    if (allTasks.length > 10) {
      console.log(`... oraz ${allTasks.length - 10} więcej`);
    }

    console.log('\nOperacja zakończona pomyślnie.');
  } catch (error) {
    console.error('Błąd podczas importu zadań:', error);
  }
}

importTasksFromJson();