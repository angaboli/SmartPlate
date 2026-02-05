'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Download, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useGroceryList } from '@/hooks/usePlanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateGroceryPDF } from '@/lib/generatePDF';
import { toast } from 'sonner';

interface GroceryListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string | null;
}

export function GroceryListDialog({ open, onOpenChange, planId }: GroceryListDialogProps) {
  const { t, language } = useLanguage();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const { data, isLoading, error } = useGroceryList(open ? planId : null);

  const items = data?.items ?? [];
  const categories = Array.from(new Set(items.map((item) => item.category)));

  const toggleItem = (name: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleDownloadPDF = async () => {
    if (items.length === 0) return;
    await generateGroceryPDF(items, checkedItems, language);
    toast.success(t('grocery.downloaded'));
  };

  const handleCopyList = async () => {
    if (items.length === 0) return;

    // Generate text content for copying
    let content = '🛒 SmartPlate Grocery List\n\n';
    categories.forEach((category) => {
      const categoryItems = items.filter((item) => item.category === category);
      if (categoryItems.length > 0) {
        content += `📦 ${category}\n`;
        categoryItems.forEach((item) => {
          content += `  • ${item.name} (${item.quantity})\n`;
        });
        content += '\n';
      }
    });

    await navigator.clipboard.writeText(content);
    toast.success(t('grocery.copiedToClipboard'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t('grocery.title')}
          </DialogTitle>
          <DialogDescription>
            {t('grocery.description')}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t('grocery.generating')}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">
              {error.message || t('grocery.failedLoad')}
            </p>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t('grocery.noItems')}
            </p>
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <>
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items
                      .filter((item) => item.category === category)
                      .map((item) => {
                        const itemKey = `${item.name}-${item.quantity}`;
                        const isChecked = checkedItems.has(itemKey);
                        return (
                          <div
                            key={itemKey}
                            className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-secondary/50"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleItem(itemKey)}
                              id={itemKey}
                            />
                            <label
                              htmlFor={itemKey}
                              className={`flex-1 cursor-pointer ${
                                isChecked ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              <span className="font-medium">{item.name}</span>
                              <span className="ml-2 text-sm text-muted-foreground">
                                ({item.quantity})
                              </span>
                            </label>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 border-t pt-4">
              <Button variant="outline" className="flex-1" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                {t('grocery.downloadPDF')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleCopyList}>
                <Copy className="h-4 w-4 mr-2" />
                {t('grocery.shareList')}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary p-3 text-sm">
              <span className="text-muted-foreground">{t('grocery.itemsChecked')}</span>
              <Badge variant="secondary">
                {checkedItems.size} / {items.length}
              </Badge>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
