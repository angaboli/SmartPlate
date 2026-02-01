'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { BookOpen, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface RecipeRow {
  id: string;
  title: string;
  status: string;
  authorId: string | null;
  createdAt: string;
  publishedAt: string | null;
  reviewNote: string | null;
}

const statusBadge: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending',
  published: 'Published',
  rejected: 'Rejected',
};

export default function RecipeManagePage() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const role = user?.role;

  useEffect(() => {
    if (user && role !== 'editor' && role !== 'admin') {
      router.replace('/');
    }
  }, [user, role, router]);

  const fetchRecipes = useCallback(async () => {
    if (!accessToken) return;
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);

    try {
      const res = await fetch(`/api/v1/recipes?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed');
      setRecipes(await res.json());
    } catch {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  async function handleReview(recipeId: string, decision: 'published' | 'rejected') {
    const reviewNote =
      decision === 'rejected'
        ? window.prompt('Rejection reason (optional):') ?? undefined
        : undefined;

    try {
      const res = await fetch(`/api/v1/recipes/${recipeId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: decision, reviewNote }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Review failed');
        return;
      }

      toast.success(decision === 'published' ? 'Recipe published' : 'Recipe rejected');
      fetchRecipes();
    } catch {
      toast.error('Review failed');
    }
  }

  if (!user || (role !== 'editor' && role !== 'admin')) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Recipe Management</h1>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading recipes...</p>
      ) : recipes.length === 0 ? (
        <p className="text-muted-foreground">No recipes found.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {r.title}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadge[r.status] || ''}>
                      {statusLabels[r.status] || r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {r.reviewNote || '—'}
                  </TableCell>
                  <TableCell>
                    {r.status === 'pending_review' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-green-700"
                          onClick={() => handleReview(r.id, 'published')}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-red-700"
                          onClick={() => handleReview(r.id, 'rejected')}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
