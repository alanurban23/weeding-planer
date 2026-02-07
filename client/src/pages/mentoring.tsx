import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, MessageCircle } from "lucide-react";

const benefitBlocks = [
  {
    title: "A) Kompletne przygotowanie do rekrutacji",
    bullets: [
      "pełna analiza Twojej sytuacji",
      "wybieramy kierunek (frontend, backend, fullstack, kontrakty, praca stała)",
      "układamy strategię działania na najbliższe 4–8 tygodni",
    ],
  },
  {
    title: "B) CV, portfolio, profil LinkedIn",
    bullets: [
      "CV, które faktycznie odpowiada na wymagania rynku",
      "portfolio, które Cię wyróżnia (i wiem dokładnie, co tam ma być)",
      "profil LinkedIn tak ustawiony, żeby rekruterzy sami pisali",
    ],
  },
  {
    title: "C) Wybór projektów i budowa portfolio",
    bullets: [
      "jakie projekty faktycznie mają sens",
      "czego nie robić, bo tylko tracisz czas",
      "jak projekt opakować, żeby wyglądał jak komercyjny",
    ],
  },
  {
    title: "D) Testowe interview + przygotowanie do rozmów",
    bullets: [
      "testowe rozmowy techniczne i z HR",
      "review Twoich odpowiedzi i checklisty do każdej rozmowy",
      "lista pytań i odpowiedzi przygotowana pod konkretne stanowisko",
    ],
  },
  {
    title: "E) Narzędzia, które oszczędzają tygodnie pracy",
    bullets: [
      "analiza ofert i szybsze wysyłanie aplikacji",
      "AI wspierające rozmowy i zadania techniczne",
      "automatyzacje, których używam w pracy z klientami",
    ],
  },
  {
    title: "F) Strategia do kontraktów / klientów",
    bullets: [
      "gotowy sposób docierania do klientów i szablony wiadomości",
      "lista portali i miejsc pozyskiwania zleceń",
      "pomoc w pierwszych rozmowach sprzedażowych i referencje ode mnie",
    ],
  },
  {
    title: "G) Bonus: networking, kontakty, realne wsparcie",
    bullets: [
      "kontakty do firm, rekruterów i klientów",
      "realne wsparcie i referencje",
      "spojrzenie biznesowe i technologiczne na Twoją ścieżkę",
    ],
  },
];

const quickPitch = [
  "Wejście do IT lub podwyżka bez błądzenia przez rok.",
  "Plan działania na 4–8 tygodni, a nie na zawsze.",
  "Cotygodniowe spotkania 1:1 + wsparcie na Discordzie i w wiadomościach.",
  "Gotowe szablony, narzędzia i checklisty zamiast ogólnych porad.",
];

export default function MentoringPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="px-6 py-12 md:py-16 max-w-5xl mx-auto text-center space-y-4">
        <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">🔥 Mentoring kariery IT 1:1</Badge>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Jeśli chcesz wejść do IT lub ułożyć swoją karierę – ten mentoring rozwiązuje Twój problem
        </h1>
        <p className="text-lg text-slate-200 max-w-3xl mx-auto">
          Zero kursów, zero ogólników. Pracujemy razem, tydzień po tygodniu, aż osiągniemy: pierwszą pracę, większe zarobki
          albo kontrakt.
        </p>
        <div className="flex gap-3 justify-center">
          <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
            Umów krótką rozmowę
          </Button>
          <Button size="lg" variant="outline" className="text-white border-slate-600 hover:bg-white/10">
            Zobacz plan na pierwsze 4 tygodnie
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-12">
        <section className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary" className="bg-white/10 text-white">
              1️⃣ Jak wygląda mentoring?
            </Badge>
            <Separator className="bg-white/20" />
          </div>
          <p className="text-lg text-slate-200 mb-4">
            To nie jest kurs, to nie jest grupa na Discordzie, ani „porady ogólne”.
          </p>
          <p className="text-lg text-slate-200 mb-4">
            To pełna współpraca 1:1, w której przez kilka tygodni pracujemy nad jednym celem: praca w IT / większe zarobki /
            wejście na kontrakty.
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-slate-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-400 mt-0.5" />
              <span>cotygodniowe spotkania 1:1 (plan, analiza, poprawki, strategia)</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-400 mt-0.5" />
              <span>dostęp do mnie na bieżąco (Discord / wiadomości)</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-400 mt-0.5" />
              <span>regularne zadania do wykonania — z feedbackiem</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-400 mt-0.5" />
              <span>gotowe narzędzia, szablony i systemy do wdrożenia krok po kroku</span>
            </div>
          </div>
          <p className="text-lg text-slate-200 mt-4">
            Mentoring, w którym nie jesteś sam ani przez jeden tydzień.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/10 text-white">
              2️⃣ Co dokładnie zyskujesz?
            </Badge>
            <Separator className="bg-white/20" />
          </div>
          <p className="text-slate-200 text-lg">Konkret, etap po etapie.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {benefitBlocks.map((benefit) => (
              <Card key={benefit.title} className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-slate-200">
                  {benefit.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-2">
                      <CheckCircle2 className="text-emerald-400 mt-0.5" size={18} />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/10 text-white">
              3️⃣ Opinie i podopieczni
            </Badge>
            <Separator className="bg-white/20" />
          </div>
          <p className="text-slate-200 text-lg">
            Mogę skierować Cię do osób, które przeszły mentoring i chętnie podzielą się opinią.
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-slate-100">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6 space-y-2">
                <p>🔹 znaleźli pracę mimo wysyłania setek CV bez efektu</p>
                <p>🔹 zwiększyli zarobki z 6k → 12–18k</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6 space-y-2">
                <p>🔹 zdobyli pierwsze kontrakty jako freelancerzy</p>
                <p>🔹 przebranżowili się z zerowej wiedzy do pierwszej pracy</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-emerald-900/40 border border-emerald-600/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-500 text-white">💬 Podsumowanie</Badge>
            <Separator className="bg-emerald-200/40" />
          </div>
          <p className="text-lg text-emerald-50">
            Możesz próbować samemu jeszcze 6–12 miesięcy, albo w 4–8 tygodni ze mną zrobić to, co innym zajmuje rok.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-emerald-950/60 border-emerald-700/60">
              <CardHeader>
                <CardTitle className="text-white">Dlaczego to działa?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-emerald-50">
                <p>• jasna kolejność działań i gotowe narzędzia</p>
                <p>• stały feedback, poprawki i testowe rozmowy</p>
                <p>• system, który wyprzedza 98% kandydatów</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-950/60 border-emerald-700/60">
              <CardHeader>
                <CardTitle className="text-white">Jak zacząć?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-emerald-50">
                <p>Chcesz zobaczyć, jak wyglądałby Twój plan działania? Rozpiszę go już na pierwszej rozmowie.</p>
                <Button size="lg" className="w-full bg-white text-emerald-700 hover:bg-emerald-100">
                  Umów termin rozmowy 🚀
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/10 text-white flex items-center gap-2">
              <MessageCircle size={16} /> Krótka wersja (Messenger / LinkedIn DM)
            </Badge>
            <Separator className="bg-white/20" />
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-slate-100">
            {quickPitch.map((pitch) => (
              <div key={pitch} className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-400 mt-0.5" />
                <span>{pitch}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-200">
            Napisz, kiedy masz chwilę na 15 minut rozmowy — pokażę Ci konkretny plan dla Twojej sytuacji.
          </p>
        </section>
      </main>
    </div>
  );
}
