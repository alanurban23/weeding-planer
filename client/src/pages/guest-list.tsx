import React, { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Guest } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, Upload, Users, UserPlus, CheckCircle2, Clock3, XCircle, FileDown } from 'lucide-react';

const RSVP_OPTIONS: { value: Guest['rsvpStatus']; label: string }[] = [
  { value: 'pending', label: 'Oczekuje' },
  { value: 'confirmed', label: 'Potwierdzony' },
  { value: 'declined', label: 'Odrzucony' },
];

const RSVP_BADGE_STYLES: Record<Guest['rsvpStatus'], string> = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  declined: 'bg-rose-100 text-rose-800 border-rose-200',
};

const DEFAULT_FORM_VALUES = {
  fullName: '',
  email: '',
  phone: '',
  side: '',
  rsvpStatus: 'pending' as Guest['rsvpStatus'],
  notes: '',
};

interface GuestFormValues {
  fullName: string;
  email: string;
  phone: string;
  side: string;
  rsvpStatus: Guest['rsvpStatus'];
  notes: string;
}

interface ParsedCsvResult {
  guests: GuestFormValues[];
  errors: string[];
}

const HEADER_MAP: Record<string, keyof GuestFormValues | null> = {
  'full_name': 'fullName',
  'fullname': 'fullName',
  'name': 'fullName',
  'imie i nazwisko': 'fullName',
  'imię i nazwisko': 'fullName',
  'email': 'email',
  'mail': 'email',
  'phone': 'phone',
  'telefon': 'phone',
  'side': 'side',
  'strona': 'side',
  'rsvp_status': 'rsvpStatus',
  'status': 'rsvpStatus',
  'notes': 'notes',
  'uwagi': 'notes',
};

const normalizeStatus = (value: string): Guest['rsvpStatus'] => {
  if (!value) return 'pending';
  const normalized = value.trim().toLowerCase();
  if (['confirmed', 'potwierdzony', 'potwierdzone', 'tak', 'yes'].includes(normalized)) {
    return 'confirmed';
  }
  if (
    [
      'declined',
      'odrzucony',
      'odrzucone',
      'nie',
      'rezygnacja',
      'nie przyjdzie',
      'nieprzyjdzie',
    ].includes(normalized)
  ) {
    return 'declined';
  }
  return 'pending';
};

const detectDelimiter = (line: string) => {
  if (line.includes(';') && line.includes(',')) {
    return line.split(';').length > line.split(',').length ? ';' : ',';
  }
  if (line.includes(';')) return ';';
  return ',';
};

const parseCsvLine = (line: string, delimiter: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map((value) => value.replace(/^"|"$/g, '').trim());
};

const parseCsvContent = (content: string): ParsedCsvResult => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    return { guests: [], errors: ['Plik jest pusty.'] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerValues = parseCsvLine(lines[0], delimiter).map((header) => header.toLowerCase());
  const headerMap = headerValues.map((header) => HEADER_MAP[header] ?? null);

  if (!headerMap.includes('fullName')) {
    return {
      guests: [],
      errors: ['Nagłówek pliku musi zawierać kolumnę z imieniem i nazwiskiem (full_name).'],
    };
  }

  const guests: GuestFormValues[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const rowIndex = index + 2; // uwzględnij wiersz nagłówka
    const values = parseCsvLine(line, delimiter);
    if (values.every((value) => value.trim().length === 0)) {
      return;
    }

    const record: GuestFormValues = { ...DEFAULT_FORM_VALUES };
    headerMap.forEach((field, headerIndex) => {
      if (!field) return;
      const rawValue = values[headerIndex] ?? '';
      if (field === 'rsvpStatus') {
        record[field] = normalizeStatus(rawValue);
      } else {
        record[field] = rawValue.trim();
      }
    });

    if (!record.fullName) {
      errors.push(`Wiersz ${rowIndex}: brak imienia i nazwiska.`);
      return;
    }

    record.rsvpStatus = normalizeStatus(record.rsvpStatus);
    guests.push(record);
  });

  return { guests, errors };
};

const downloadTemplate = () => {
  const header = 'full_name,email,phone,side,rsvp_status,notes';
  const sample = 'Jan Kowalski,jan@example.com,600700800,Pan młody,confirmed,Bez alergii';
  const blob = new Blob([`${header}\n${sample}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lista-gosci-szablon.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const GuestListPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<GuestFormValues>({ ...DEFAULT_FORM_VALUES });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Guest['rsvpStatus']>('all');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [parsedGuests, setParsedGuests] = useState<GuestFormValues[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [updatingGuestId, setUpdatingGuestId] = useState<number | null>(null);

  const { data: guests = [], isLoading, isError } = useQuery<Guest[]>({
    queryKey: ['/api/guests'],
    queryFn: async () => {
      const response = await apiRequest('/api/guests');
      return (response as Guest[]).map((guest) => {
        if (!guest) return guest;
        const createdAt = guest.createdAt ? new Date(guest.createdAt) : guest.createdAt;
        return {
          ...guest,
          createdAt: createdAt && createdAt instanceof Date && !Number.isNaN(createdAt.getTime()) ? createdAt : guest.createdAt,
        };
      });
    },
  });

  const addGuestMutation = useMutation({
    mutationFn: (payload: GuestFormValues) => apiRequest('/api/guests', 'POST', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      toast({ title: 'Gość dodany', description: 'Nowy gość został dodany do listy.' });
      setFormValues({ ...DEFAULT_FORM_VALUES });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd dodawania gościa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const importGuestsMutation = useMutation({
    mutationFn: (payload: GuestFormValues[]) => apiRequest('/api/guests/import', 'POST', { guests: payload }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      const importedCount = data?.imported?.length ?? 0;
      const skippedCount = data?.skipped?.length ?? 0;
      toast({
        title: 'Import zakończony',
        description: skippedCount
          ? `Zaimportowano ${importedCount} gości. Pominięto ${skippedCount} rekordów.`
          : `Zaimportowano ${importedCount} gości.`,
      });
      setParsedGuests([]);
      setImportErrors(data?.skipped?.map((item: any) => `Wiersz ${item.index + 2}: ${item.reason}`) ?? []);
      setSelectedFileName(null);
      setIsImportOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd importu',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GuestFormValues> }) =>
      apiRequest(`/api/guests/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      setUpdatingGuestId(null);
      toast({ title: 'Dane gościa zaktualizowane' });
    },
    onError: (error: Error) => {
      setUpdatingGuestId(null);
      toast({
        title: 'Błąd aktualizacji',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/guests/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      toast({ title: 'Gość usunięty', description: 'Gość został usunięty z listy.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd usuwania',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredGuests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return guests
      .filter((guest) => {
        if (statusFilter !== 'all' && guest.rsvpStatus !== statusFilter) {
          return false;
        }
        if (!term) return true;
        const searchable = [guest.fullName, guest.email, guest.phone, guest.side, guest.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(term);
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pl'));
  }, [guests, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((guest) => guest.rsvpStatus === 'confirmed').length;
    const pending = guests.filter((guest) => guest.rsvpStatus === 'pending').length;
    const declined = guests.filter((guest) => guest.rsvpStatus === 'declined').length;
    return { total, confirmed, pending, declined };
  }, [guests]);

  const handleFormChange = (field: keyof GuestFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddGuest = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formValues.fullName.trim()) {
      toast({
        title: 'Brak imienia i nazwiska',
        description: 'Podaj imię i nazwisko gościa.',
        variant: 'destructive',
      });
      return;
    }
    addGuestMutation.mutate(formValues);
  };

  const handleStatusChange = (id: number, value: Guest['rsvpStatus']) => {
    setUpdatingGuestId(id);
    updateGuestMutation.mutate({ id, data: { rsvpStatus: value } });
  };

  const handleDeleteGuest = (id: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego gościa?')) {
      return;
    }
    deleteGuestMutation.mutate(id);
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result?.toString() ?? '';
      const { guests: parsed, errors } = parseCsvContent(text);
      setParsedGuests(parsed);
      setImportErrors(errors);
      setSelectedFileName(file.name);
    };
    reader.onerror = () => {
      toast({
        title: 'Błąd odczytu pliku',
        description: 'Nie udało się odczytać zawartości pliku CSV.',
        variant: 'destructive',
      });
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportSubmit = () => {
    if (!parsedGuests.length) {
      setImportErrors((prev) => [...prev, 'Brak poprawnych rekordów do importu.']);
      return;
    }
    importGuestsMutation.mutate(parsedGuests);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lista gości</h1>
            <p className="mt-1 text-sm text-gray-500">
              Zarządzaj listą gości weselnych, importuj ich z pliku CSV lub dodawaj ręcznie pojedyncze osoby.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Pobierz szablon CSV
            </Button>
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Importuj listę
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import listy gości</DialogTitle>
                  <DialogDescription>
                    Wybierz plik CSV zawierający listę gości. Minimalny wymagany nagłówek to <code>full_name</code>.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="guest-import">Plik CSV</Label>
                    <Input id="guest-import" type="file" accept=".csv" onChange={handleFileSelection} />
                    {selectedFileName && (
                      <p className="text-sm text-gray-500">Wybrano: {selectedFileName}</p>
                    )}
                  </div>
                  {parsedGuests.length > 0 && (
                    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4">
                      <p className="text-sm font-medium text-gray-700">
                        Podgląd: {parsedGuests.length} rekordów gotowych do importu.
                      </p>
                      <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-sm text-gray-600">
                        {parsedGuests.slice(0, 10).map((guest, index) => (
                          <li key={`${guest.fullName}-${index}`}>
                            {guest.fullName}
                            {guest.email ? ` • ${guest.email}` : ''}
                            {guest.phone ? ` • ${guest.phone}` : ''}
                          </li>
                        ))}
                        {parsedGuests.length > 10 && (
                          <li className="text-muted-foreground">… i więcej</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {importErrors.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-medium">Uwaga</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {importErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleImportSubmit} disabled={importGuestsMutation.isPending}>
                    {importGuestsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Importuj
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" onClick={() => navigate('/')}>Powrót do strony głównej</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-t-4 border-t-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Łącznie</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Wszyscy goście na liście</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potwierdzeni</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.confirmed}</div>
              <p className="text-xs text-muted-foreground">Goście, którzy potwierdzili obecność</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Oczekujący</CardTitle>
              <Clock3 className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Goście bez odpowiedzi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Odrzuceni</CardTitle>
              <XCircle className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.declined}</div>
              <p className="text-xs text-muted-foreground">Goście, którzy nie przyjdą</p>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Lista gości</CardTitle>
              <CardDescription>Wyszukuj, filtruj i zarządzaj statusami RSVP.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    placeholder="Szukaj po imieniu, e-mailu lub telefonie"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full md:max-w-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={(value: 'all' | Guest['rsvpStatus']) => setStatusFilter(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtruj status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszyscy</SelectItem>
                      {RSVP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i nazwisko</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Strona</TableHead>
                      <TableHead>Status RSVP</TableHead>
                      <TableHead>Uwagi</TableHead>
                      <TableHead className="w-[60px] text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                          Ładowanie listy gości…
                        </TableCell>
                      </TableRow>
                    )}

                    {isError && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-sm text-red-600">
                          Nie udało się pobrać listy gości. Odśwież stronę lub spróbuj ponownie później.
                        </TableCell>
                      </TableRow>
                    )}

                    {!isLoading && filteredGuests.length === 0 && !isError && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                          Brak gości spełniających kryteria wyszukiwania.
                        </TableCell>
                      </TableRow>
                    )}

                    {!isLoading && filteredGuests.map((guest) => (
                      <TableRow key={guest.id} className="align-top">
                        <TableCell>
                          <div className="font-semibold">{guest.fullName}</div>
                          {guest.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Dodano {new Date(guest.createdAt).toLocaleDateString('pl-PL')}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {guest.email && <p>{guest.email}</p>}
                            {guest.phone && <p>{guest.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{guest.side || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={RSVP_BADGE_STYLES[guest.rsvpStatus]}>
                              {RSVP_OPTIONS.find((option) => option.value === guest.rsvpStatus)?.label ?? guest.rsvpStatus}
                            </Badge>
                            <Select
                              value={guest.rsvpStatus}
                              onValueChange={(value: Guest['rsvpStatus']) => handleStatusChange(guest.id, value)}
                              disabled={updateGuestMutation.isPending && updatingGuestId === guest.id}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RSVP_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {updateGuestMutation.isPending && updatingGuestId === guest.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-pre-wrap text-sm text-muted-foreground">
                          {guest.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGuest(guest.id)}
                            disabled={deleteGuestMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Usuń</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Dodaj gościa ręcznie</CardTitle>
              <CardDescription>Wypełnij formularz, aby dodać pojedynczego gościa.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleAddGuest}>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Imię i nazwisko *</Label>
                  <Input
                    id="fullName"
                    value={formValues.fullName}
                    onChange={(event) => handleFormChange('fullName', event.target.value)}
                    placeholder="np. Jan Kowalski"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formValues.email}
                      onChange={(event) => handleFormChange('email', event.target.value)}
                      placeholder="jan@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={formValues.phone}
                      onChange={(event) => handleFormChange('phone', event.target.value)}
                      placeholder="600 700 800"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="side">Strona</Label>
                  <Input
                    id="side"
                    value={formValues.side}
                    onChange={(event) => handleFormChange('side', event.target.value)}
                    placeholder="np. Panna Młoda"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status RSVP</Label>
                  <Select
                    value={formValues.rsvpStatus}
                    onValueChange={(value: Guest['rsvpStatus']) => handleFormChange('rsvpStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RSVP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Uwagi</Label>
                  <Textarea
                    id="notes"
                    value={formValues.notes}
                    onChange={(event) => handleFormChange('notes', event.target.value)}
                    placeholder="Np. preferencje żywieniowe, dodatkowe informacje"
                    rows={4}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addGuestMutation.isPending}>
                  {addGuestMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Zapisywanie…
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Dodaj gościa
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default GuestListPage;
