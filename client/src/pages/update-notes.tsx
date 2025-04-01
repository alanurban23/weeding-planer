import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function UpdateNotesPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUpdateNotes = async () => {
    setIsUpdating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/update-notes-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Błąd HTTP: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      
      toast({
        title: 'Sukces',
        description: data.message,
        duration: 5000,
      });
    } catch (err) {
      console.error('Błąd podczas aktualizacji kategorii notatek:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
      
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować kategorii notatek',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Aktualizacja kategorii notatek</CardTitle>
          <CardDescription>
            Ten narzędzie zaktualizuje wszystkie notatki bez przypisanej kategorii, 
            ustawiając im wartość null. Jest to potrzebne, aby poprawnie filtrować 
            notatki na stronie głównej i w kategoriach.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Błąd</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <Alert className="mb-4" variant={result.success ? "default" : "destructive"}>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Wynik aktualizacji</AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  <p>Łączna liczba notatek: {result.totalNotes}</p>
                  <p>Notatki bez kategorii: {result.notesWithoutCategory}</p>
                  {result.updatedNotes !== undefined && (
                    <p>Zaktualizowane notatki: {result.updatedNotes}</p>
                  )}
                  {result.errors !== undefined && (
                    <p>Błędy podczas aktualizacji: {result.errors}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleUpdateNotes} 
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Aktualizowanie...' : 'Aktualizuj kategorie notatek'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
