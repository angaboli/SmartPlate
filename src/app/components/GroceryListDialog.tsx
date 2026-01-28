import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { ShoppingCart, Download, Share2 } from 'lucide-react';
import { useState } from 'react';

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
}

interface GroceryListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroceryListDialog({ open, onOpenChange }: GroceryListDialogProps) {
  const [items, setItems] = useState<GroceryItem[]>([
    { id: '1', name: 'Chicken breast', quantity: '500g', category: 'Protein', checked: false },
    { id: '2', name: 'Quinoa', quantity: '2 cups', category: 'Grains', checked: false },
    { id: '3', name: 'Broccoli', quantity: '1 head', category: 'Vegetables', checked: false },
    { id: '4', name: 'Salmon fillet', quantity: '400g', category: 'Protein', checked: false },
    { id: '5', name: 'Sweet potato', quantity: '3 medium', category: 'Vegetables', checked: false },
    { id: '6', name: 'Spinach', quantity: '200g', category: 'Vegetables', checked: false },
    { id: '7', name: 'Greek yogurt', quantity: '500g', category: 'Dairy', checked: false },
    { id: '8', name: 'Avocado', quantity: '2 pieces', category: 'Produce', checked: false },
    { id: '9', name: 'Olive oil', quantity: '1 bottle', category: 'Pantry', checked: false },
    { id: '10', name: 'Brown rice', quantity: '1kg', category: 'Grains', checked: false },
  ]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const categories = Array.from(new Set(items.map((item) => item.category)));

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

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category} className="space-y-3">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                {category}
              </h3>
              <div className="space-y-2">
                {items
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-secondary/50"
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleItem(item.id)}
                        id={item.id}
                      />
                      <label
                        htmlFor={item.id}
                        className={`flex-1 cursor-pointer ${
                          item.checked ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({item.quantity})
                        </span>
                      </label>
                    </div>
                  ))}
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
            {items.filter((item) => item.checked).length} / {items.length}
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
