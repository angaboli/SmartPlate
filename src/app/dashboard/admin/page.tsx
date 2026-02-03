'use client';

import { useEffect, useState } from 'react';
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
import { Shield } from 'lucide-react';
import { TableSkeleton } from '@/components/skeletons';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/date-locale';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

const roleBadgeStyle: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user: 'bg-muted text-muted-foreground',
};

export default function AdminPage() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (!accessToken) return;

    fetch('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load users');
        return res.json();
      })
      .then(setUsers)
      .catch(() => toast.error(t('admin.failedLoadUsers')))
      .finally(() => setLoading(false));
  }, [accessToken, t]);

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t('admin.failedUpdateRole'));
        return;
      }

      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)),
      );
      toast.success(t('admin.roleUpdated') + ' ' + updated.role);
    } catch {
      toast.error(t('admin.failedUpdateRole'));
    }
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.tableName')}</TableHead>
                <TableHead>{t('admin.tableEmail')}</TableHead>
                <TableHead>{t('admin.tableRole')}</TableHead>
                <TableHead>{t('admin.tableJoined')}</TableHead>
                <TableHead>{t('admin.tableActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name || '—'}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge className={roleBadgeStyle[u.role] || ''}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(u.createdAt, 'PP', language)}
                  </TableCell>
                  <TableCell>
                    {u.id === user.id ? (
                      <span className="text-xs text-muted-foreground">
                        {t('common.you')}
                      </span>
                    ) : (
                      <Select
                        defaultValue={u.role}
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">user</SelectItem>
                          <SelectItem value="editor">editor</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
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
