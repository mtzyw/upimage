"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateFreepikApiKey } from "@/actions/freepik/admin";
import { toast } from "sonner";
import { Database } from "@/lib/supabase/types";

type FreepikApiKey = Database["public"]["Tables"]["freepik_api_keys"]["Row"];

interface EditKeyDialogProps {
  apiKey: FreepikApiKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditKeyDialog({ apiKey, open, onOpenChange }: EditKeyDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: apiKey.name || "",
    key: apiKey.key,
    dailyLimit: apiKey.daily_limit || 100,
    isActive: apiKey.is_active ?? true,
  });

  useEffect(() => {
    setFormData({
      name: apiKey.name || "",
      key: apiKey.key,
      dailyLimit: apiKey.daily_limit || 100,
      isActive: apiKey.is_active ?? true,
    });
  }, [apiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateFreepikApiKey(apiKey.id, {
        name: formData.name,
        key: formData.key,
        daily_limit: formData.dailyLimit,
        is_active: formData.isActive,
      });

      if (result.success) {
        toast.success("API key updated successfully");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update API key");
      }
    } catch (error) {
      toast.error("An error occurred while updating the API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update the Freepik API key details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="col-span-3"
                placeholder="e.g., Key-001"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-key" className="text-right">
                API Key
              </Label>
              <Input
                id="edit-key"
                value={formData.key}
                onChange={(e) =>
                  setFormData({ ...formData, key: e.target.value })
                }
                className="col-span-3"
                placeholder="Your Freepik API key"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-dailyLimit" className="text-right">
                Daily Limit
              </Label>
              <Input
                id="edit-dailyLimit"
                type="number"
                value={formData.dailyLimit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dailyLimit: parseInt(e.target.value) || 100,
                  })
                }
                className="col-span-3"
                min="1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-isActive" className="text-right">
                Active
              </Label>
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="bg-pink-600 hover:bg-pink-700 text-white">
              {loading ? "Updating..." : "Update API Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}