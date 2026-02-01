'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteRecipe, useChangeRecipeStatus } from '@/hooks/useRecipes';

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
  const deleteRecipe = useDeleteRecipe();
  const changeStatus = useChangeRecipeStatus();

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

  function handleStatusChange(recipeId: string, newStatus: string) {
    changeStatus.mutate(
      { id: recipeId, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Status changed to ${statusLabels[newStatus] || newStatus}`);
          fetchRecipes();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleDelete(recipeId: string) {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    deleteRecipe.mutate(recipeId, {
      onSuccess: () => {
        toast.success('Recipe deleted');
        fetchRecipes();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if (!user || (role !== 'editor' && role !== 'admin')) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Recipe Management</h1>
        </div>

        <div className="flex items-center gap-3">
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

          <Button asChild>
            <Link href="/dashboard/recipes/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Recipe
            </Link>
          </Button>
        </div>
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
                    <Link
                      href={`/recipes/${r.id}`}
                      className="hover:underline"
                    >
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.status}
                      onValueChange={(val) => handleStatusChange(r.id, val)}
                      disabled={changeStatus.isPending}
                    >
                      <SelectTrigger className="h-7 w-36">
                        <Badge className={`${statusBadge[r.status] || ''} pointer-events-none`}>
                          {statusLabels[r.status] || r.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending_review">Pending Review</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {r.reviewNote || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        asChild
                      >
                        <Link href={`/dashboard/recipes/${r.id}/edit`}>
                          <Pencil className="h-3 w-3" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-destructive"
                        onClick={() => handleDelete(r.id)}
                        disabled={deleteRecipe.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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
