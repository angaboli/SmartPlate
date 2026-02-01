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
import { useLanguage } from '@/contexts/LanguageContext';
import { bi } from '@/lib/bilingual';
import { formatDate } from '@/lib/date-locale';

interface RecipeRow {
  id: string;
  title: string;
  titleFr: string | null;
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

const statusLabelKeys: Record<string, string> = {
  draft: 'recipes.status.draft',
  pending_review: 'recipes.status.pendingReview',
  published: 'recipes.status.published',
  rejected: 'recipes.status.rejected',
};

export default function RecipeManagePage() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();
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
      toast.error(t('manage.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, t]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  function handleStatusChange(recipeId: string, newStatus: string) {
    changeStatus.mutate(
      { id: recipeId, status: newStatus },
      {
        onSuccess: () => {
          toast.success(t('manage.statusChanged') + ' ' + (t(statusLabelKeys[newStatus] || '') || newStatus));
          fetchRecipes();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleDelete(recipeId: string) {
    if (!window.confirm(t('manage.confirmDelete'))) return;
    deleteRecipe.mutate(recipeId, {
      onSuccess: () => {
        toast.success(t('deleteRecipe.deleted'));
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
          <h1 className="text-2xl font-bold">{t('manage.title')}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('manage.filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('manage.allStatuses')}</SelectItem>
              <SelectItem value="draft">{t('recipes.status.draft')}</SelectItem>
              <SelectItem value="pending_review">{t('recipes.status.pendingReview')}</SelectItem>
              <SelectItem value="published">{t('recipes.status.published')}</SelectItem>
              <SelectItem value="rejected">{t('recipes.status.rejected')}</SelectItem>
            </SelectContent>
          </Select>

          <Button asChild>
            <Link href="/dashboard/recipes/create">
              <Plus className="mr-2 h-4 w-4" />
              {t('manage.createRecipe')}
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t('manage.loadingRecipes')}</p>
      ) : recipes.length === 0 ? (
        <p className="text-muted-foreground">{t('manage.noRecipes')}</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('manage.tableTitle')}</TableHead>
                <TableHead>{t('manage.tableStatus')}</TableHead>
                <TableHead>{t('manage.tableCreated')}</TableHead>
                <TableHead>{t('manage.tableNote')}</TableHead>
                <TableHead>{t('manage.tableActions')}</TableHead>
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
                      {bi(r.title, r.titleFr, language)}
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
                          {t(statusLabelKeys[r.status] || '') || r.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{t('recipes.status.draft')}</SelectItem>
                        <SelectItem value="pending_review">{t('recipes.status.pendingReview')}</SelectItem>
                        <SelectItem value="published">{t('recipes.status.published')}</SelectItem>
                        <SelectItem value="rejected">{t('recipes.status.rejected')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.createdAt, 'PP', language)}
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
