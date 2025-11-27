import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Payment {
  id: number;
  cost_id: number;
  amount: number;
  payment_date: string;
  note: string | null;
  created_at: string;
}

interface PaymentHistoryProps {
  costId: number;
  totalAmount: number;
  onUpdate?: () => void;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ costId, totalAmount, onUpdate }) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<'amount' | 'percent'>('amount');
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalAmount - totalPaid;
  const percentPaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
  const isPaidFully = percentPaid >= 100;

  // Payment status
  const getPaymentStatus = () => {
    if (isPaidFully) return { label: 'Zapłacono', variant: 'default' as const };
    if (totalPaid > 0) return { label: 'Częściowo zapłacono', variant: 'secondary' as const };
    return { label: 'Nieopłacone', variant: 'destructive' as const };
  };

  const status = getPaymentStatus();

  // Fetch payments
  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest(`/api/payments?cost_id=${costId}`);
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać historii płatności.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [costId]);

  // Add payment mutation
  const addPaymentMutation = useMutation({
    mutationFn: (payment: { cost_id: number; amount: number; note?: string }) =>
      apiRequest('/api/payments', 'POST', payment),
    onSuccess: () => {
      fetchPayments();
      setShowPaymentForm(false);
      setPaymentValue('');
      setPaymentNote('');
      onUpdate?.();
      toast({
        title: 'Płatność dodana',
        description: 'Płatność została pomyślnie dodana.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: `Nie udało się dodać płatności: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => apiRequest(`/api/payments/${paymentId}`, 'DELETE'),
    onSuccess: () => {
      fetchPayments();
      onUpdate?.();
      toast({
        title: 'Płatność usunięta',
        description: 'Płatność została pomyślnie usunięta.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: `Nie udało się usunąć płatności: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handle add payment
  const handleAddPayment = () => {
    let amount = 0;

    if (paymentType === 'percent') {
      const percent = parseFloat(paymentValue);
      if (isNaN(percent) || percent <= 0 || percent > 100) {
        toast({
          title: 'Błąd walidacji',
          description: 'Wprowadź poprawny procent (0-100).',
          variant: 'destructive',
        });
        return;
      }
      amount = (totalAmount * percent) / 100;
    } else {
      amount = parseFloat(paymentValue);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Błąd walidacji',
          description: 'Wprowadź poprawną kwotę.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (amount > remaining) {
      toast({
        title: 'Błąd walidacji',
        description: `Kwota płatności nie może przekraczać pozostałej kwoty (${remaining.toFixed(2)} zł).`,
        variant: 'destructive',
      });
      return;
    }

    addPaymentMutation.mutate({
      cost_id: costId,
      amount: amount,
      note: paymentNote.trim() || undefined,
    });
  };

  // Handle paid fully checkbox
  const handlePaidFullyToggle = (checked: boolean) => {
    if (checked) {
      // Add payment for remaining amount
      addPaymentMutation.mutate({
        cost_id: costId,
        amount: remaining,
        note: 'Zapłacono w całości',
      });
    } else {
      // Remove last payment
      if (payments.length > 0) {
        deletePaymentMutation.mutate(payments[0].id);
      }
    }
  };

  // Calculate amount from percent
  const getAmountFromPercent = () => {
    const percent = parseFloat(paymentValue);
    if (!isNaN(percent) && percent > 0) {
      return ((totalAmount * percent) / 100).toFixed(2);
    }
    return '0.00';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historia płatności</CardTitle>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <CardDescription>
          Całkowita kwota: {totalAmount.toFixed(2)} zł
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Zapłacono:</span>
            <span className="text-sm font-bold text-green-600">
              {totalPaid.toFixed(2)} zł
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Pozostało:</span>
            <span className="text-sm font-bold text-red-600">
              {remaining.toFixed(2)} zł
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Procent zapłacony:</span>
            <span className="text-sm font-bold">
              {percentPaid.toFixed(1)}%
            </span>
          </div>
        </div>

        <Separator />

        {/* Paid Fully Checkbox */}
        {!isPaidFully && remaining > 0 && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="paid-fully"
              checked={false}
              onCheckedChange={handlePaidFullyToggle}
              disabled={addPaymentMutation.isPending}
            />
            <Label
              htmlFor="paid-fully"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Zapłacono w całości ({remaining.toFixed(2)} zł)
            </Label>
          </div>
        )}

        {/* Payment List */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : payments.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <h4 className="text-sm font-semibold">Płatności:</h4>
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-start justify-between p-3 border rounded-lg bg-muted/40"
              >
                <div className="flex-1">
                  <p className="font-semibold">{payment.amount.toFixed(2)} zł</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(payment.payment_date), 'PPp', { locale: pl })}
                  </p>
                  {payment.note && (
                    <p className="text-xs text-muted-foreground mt-1">{payment.note}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deletePaymentMutation.mutate(payment.id)}
                  disabled={deletePaymentMutation.isPending}
                  title="Usuń płatność"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak płatności
          </p>
        )}

        <Separator />

        {/* Add Payment Form */}
        {showPaymentForm ? (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Dodaj płatność</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowPaymentForm(false);
                  setPaymentValue('');
                  setPaymentNote('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="amount" id="type-amount" />
                <Label htmlFor="type-amount">Kwota (zł)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percent" id="type-percent" />
                <Label htmlFor="type-percent">Procent (%)</Label>
              </div>
            </RadioGroup>

            <div>
              <Label htmlFor="payment-value">
                {paymentType === 'percent' ? 'Procent' : 'Kwota'}
              </Label>
              <Input
                id="payment-value"
                type="number"
                step={paymentType === 'percent' ? '0.1' : '0.01'}
                min="0"
                max={paymentType === 'percent' ? '100' : remaining.toString()}
                value={paymentValue}
                onChange={(e) => setPaymentValue(e.target.value)}
                placeholder={paymentType === 'percent' ? 'np. 50' : 'np. 1000'}
              />
              {paymentType === 'percent' && paymentValue && (
                <p className="text-xs text-muted-foreground mt-1">
                  = {getAmountFromPercent()} zł
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="payment-note">Notatka (opcjonalnie)</Label>
              <Textarea
                id="payment-note"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Dodatkowe informacje o płatności..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddPayment}
                disabled={addPaymentMutation.isPending || !paymentValue}
                className="flex-1"
              >
                {addPaymentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Zapisz
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentForm(false);
                  setPaymentValue('');
                  setPaymentNote('');
                }}
              >
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          !isPaidFully && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPaymentForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Dodaj płatność
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
