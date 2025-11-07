import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import PaymentHistory from './payment-history';

interface Cost {
  id: number;
  name: string;
  value: number;
  created_at: string;
  category_id: number | null;
  category_name?: string | null;
  total_amount?: number | null;
  due_date?: string | null;
  paid_date?: string | null;
  notes?: string | null;
  amount_paid?: number;
  payment_status?: 'unpaid' | 'partial' | 'paid';
}

interface Category {
  id: number;
  name: string;
}

interface EditCostDialogProps {
  cost: Cost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditCostDialog: React.FC<EditCostDialogProps> = ({ cost, open, onOpenChange }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    category_id: 'none',
    total_amount: '',
    due_date: '',
    paid_date: '',
    notes: '',
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories'),
  });

  useEffect(() => {
    if (cost && open) {
      setFormData({
        name: cost.name,
        value: String(cost.value),
        category_id: cost.category_id ? String(cost.category_id) : 'none',
        total_amount: cost.total_amount ? String(cost.total_amount) : '',
        due_date: cost.due_date || '',
        paid_date: cost.paid_date || '',
        notes: cost.notes || '',
      });
    }
  }, [cost, open]);

  const updateCostMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/costs/${cost?.id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/costs'] });
      toast({
        title: 'Koszt zaktualizowany',
        description: 'Koszt został pomyślnie zaktualizowany.',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: `Nie udało się zaktualizować kosztu: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericValue = parseFloat(formData.value);
    if (isNaN(numericValue) || numericValue <= 0) {
      toast({
        title: 'Błąd walidacji',
        description: 'Wprowadź poprawną wartość kosztu.',
        variant: 'destructive',
      });
      return;
    }

    const numericTotalAmount = formData.total_amount
      ? parseFloat(formData.total_amount)
      : null;

    if (numericTotalAmount !== null && (isNaN(numericTotalAmount) || numericTotalAmount < numericValue)) {
      toast({
        title: 'Błąd walidacji',
        description: 'Całkowita kwota musi być większa lub równa kwocie zapłaconej.',
        variant: 'destructive',
      });
      return;
    }

    const dataToSend = {
      name: formData.name.trim(),
      value: numericValue,
      category_id: formData.category_id === 'none' ? null : parseInt(formData.category_id, 10),
      total_amount: numericTotalAmount,
      due_date: formData.due_date || null,
      paid_date: formData.paid_date || null,
      notes: formData.notes.trim() || null,
    };

    updateCostMutation.mutate(dataToSend);
  };

  const handlePaymentUpdate = () => {
    // Odśwież dane po aktualizacji płatności
    queryClient.invalidateQueries({ queryKey: ['/api/costs'] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj koszt</DialogTitle>
          <DialogDescription>
            Zaktualizuj informacje o koszcie i zarządzaj płatnościami.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment History Section */}
          {cost && cost.total_amount && (
            <div>
              <PaymentHistory
                costId={cost.id}
                totalAmount={cost.total_amount}
                onUpdate={handlePaymentUpdate}
              />
            </div>
          )}

          {/* Edit Form Section */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Nazwa kosztu *</Label>
            <Input
              id="edit-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="np. Kaucja za salę weselną"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-value">Kwota zapłacona/do zapłaty (PLN) *</Label>
              <Input
                id="edit-value"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="np. 3500"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Może być kaucją lub częścią płatności
              </p>
            </div>

            <div>
              <Label htmlFor="edit-total">Całkowita kwota (PLN)</Label>
              <Input
                id="edit-total"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder="np. 10000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Opcjonalne - jeśli koszt to tylko część
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="edit-category">Kategoria</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger id="edit-category">
                <SelectValue placeholder="Wybierz kategorię" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Bez kategorii</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-due-date">Termin płatności</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Kiedy należy zapłacić
              </p>
            </div>

            <div>
              <Label htmlFor="edit-paid-date">Data zapłaty</Label>
              <Input
                id="edit-paid-date"
                type="date"
                value={formData.paid_date}
                onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Kiedy zapłacono
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="edit-notes">Notatki</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Dodatkowe informacje o płatności..."
              rows={3}
            />
          </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={updateCostMutation.isPending}
                >
                  Anuluj
                </Button>
                <Button type="submit" disabled={updateCostMutation.isPending}>
                  {updateCostMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Zapisz zmiany
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCostDialog;
