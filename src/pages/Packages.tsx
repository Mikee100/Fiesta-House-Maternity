import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL as API_BASE } from '@/config';
import { Plus, Pencil, Trash2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Package {
  id: string;
  name: string;
  type: string;
  price: number;
  deposit: number;
  duration: string;
  images: number;
  makeup: boolean;
  outfits: number;
  styling: boolean;
  photobook: boolean;
  photobookSize?: string;
  mount: boolean;
  balloonBackdrop: boolean;
  wig: boolean;
  notes?: string;
}

const emptyPackage: Partial<Package> = {
  name: '',
  type: 'studio',
  price: 0,
  deposit: 2000,
  duration: '',
  images: 0,
  makeup: false,
  outfits: 0,
  styling: false,
  photobook: false,
  photobookSize: '',
  mount: false,
  balloonBackdrop: false,
  wig: false,
  notes: '',
};

function inclusionSummary(pkg: Package): string {
  const items: string[] = [];
  if (pkg.makeup) items.push('Makeup');
  if (pkg.styling) items.push('Styling');
  if (pkg.photobook) items.push('Photobook');
  if (pkg.mount) items.push('Mount');
  if (pkg.balloonBackdrop) items.push('Balloon backdrop');
  if (pkg.wig) items.push('Wig');
  return items.length > 0 ? items.join(', ') : '—';
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [editing, setEditing] = useState<Partial<Package> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/bookings/packages`);
      const data = Array.isArray(res.data) ? res.data : [];
      data.sort((a: Package, b: Package) => a.price - b.price);
      setPackages(data);
    } catch (err) {
      setPackages([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleEdit = (pkg: Package) => {
    setEditing(pkg);
    setIsNew(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await axios.delete(`${API_BASE}/api/bookings/packages/${deleteTarget.id}`);
    setDeleteTarget(null);
    fetchPackages();
  };

  const handleAdd = () => {
    setEditing({ ...emptyPackage });
    setIsNew(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let fieldValue: any = value;
    if (type === 'checkbox' && 'checked' in e.target) {
      fieldValue = (e.target as HTMLInputElement).checked;
    }
    setEditing(editing => ({ ...editing!, [name]: fieldValue }));
  };

  const setField = (name: keyof Package, value: any) => {
    setEditing(editing => ({ ...editing!, [name]: value }));
  };

  const handleSave = async () => {
    if (!editing) return;
    const payload = {
      ...editing,
      price: editing.price ? Number(editing.price) : 0,
      deposit: editing.deposit ? Number(editing.deposit) : 0,
      images: editing.images ? Number(editing.images) : 0,
      outfits: editing.outfits ? Number(editing.outfits) : 0,
    };
    if (isNew) {
      await axios.post(`${API_BASE}/api/bookings/packages`, payload);
    } else {
      await axios.put(`${API_BASE}/api/bookings/packages/${editing.id}`, payload);
    }
    setEditing(null);
    fetchPackages();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Packages</h1>
        <Button onClick={handleAdd} size="sm" className="gap-1.5">
          <Plus size={16} />
          Add Package
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">Loading…</div>
      ) : packages.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-lg">
          <Camera size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No packages yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first package to get started.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Includes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map(pkg => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{pkg.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 capitalize">{pkg.type || 'unspecified'} · {pkg.images} images</div>
                  </TableCell>
                  <TableCell className="text-foreground">KSH {pkg.price.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">KSH {pkg.deposit.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{pkg.duration}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{inclusionSummary(pkg)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(pkg)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(pkg)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Add Package' : 'Edit Package'}</DialogTitle>
          </DialogHeader>

          {editing && (
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={editing.name || ''} onChange={handleChange} placeholder="e.g. Gold Package" required className="mt-1.5" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={editing.type || 'studio'} onValueChange={(v) => setField('type', v)}>
                    <SelectTrigger id="type" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input id="duration" name="duration" value={editing.duration || ''} onChange={handleChange} placeholder="e.g. 2 hrs" required className="mt-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price (KSH)</Label>
                  <Input id="price" name="price" type="number" value={editing.price ?? 0} onChange={handleChange} required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="deposit">Deposit (KSH)</Label>
                  <Input id="deposit" name="deposit" type="number" value={editing.deposit ?? 0} onChange={handleChange} required className="mt-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="images">Images</Label>
                  <Input id="images" name="images" type="number" value={editing.images ?? 0} onChange={handleChange} required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="outfits">Outfits</Label>
                  <Input id="outfits" name="outfits" type="number" value={editing.outfits ?? 0} onChange={handleChange} required className="mt-1.5" />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                {[
                  { key: 'makeup', label: 'Professional makeup' },
                  { key: 'styling', label: 'Styling included' },
                  { key: 'photobook', label: 'Photobook included' },
                  { key: 'mount', label: 'A3 mount included' },
                  { key: 'balloonBackdrop', label: 'Balloon backdrop' },
                  { key: 'wig', label: 'Styled wig' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="font-normal text-foreground">{label}</Label>
                    <Switch
                      id={key}
                      checked={!!(editing as any)[key]}
                      onCheckedChange={(checked) => setField(key as keyof Package, checked)}
                    />
                  </div>
                ))}
                {editing.photobook && (
                  <Input
                    name="photobookSize"
                    value={editing.photobookSize || ''}
                    onChange={handleChange}
                    placeholder='Photobook size, e.g. 8x8"'
                  />
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={editing.notes || ''} onChange={handleChange} placeholder="Additional details…" className="mt-1.5 min-h-[80px]" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit">Save Package</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
