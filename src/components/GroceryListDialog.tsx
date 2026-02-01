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
import { ShoppingCart, Download, Share2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useGroceryList } from '@/hooks/usePlanner';

interface GroceryListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string | null;
}

export function GroceryListDialog({ open, onOpenChange, planId }: GroceryListDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Weekly Grocery List
          </DialogTitle>
          <DialogDescription>
            AI-generated shopping list for your weekly meal plan
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Generating your grocery list...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">
              {error.message || 'Failed to load grocery list'}
            </p>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No grocery items to display. Generate a meal plan first.
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
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share List
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary p-3 text-sm">
              <span className="text-muted-foreground">Items checked:</span>
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
