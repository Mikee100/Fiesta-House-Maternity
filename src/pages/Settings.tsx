import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useUIStore } from '@/state/uiStore';
import { PageHeader } from '@/components/PageHeader';
import { Palette, User, Bell } from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme } = useUIStore();

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Settings"
        description="Manage preferences and configuration"
      />

      <div className="space-y-4 mt-6">
        {/* Appearance Section */}
        <div className="border border-border/30 rounded-md p-4">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Appearance</h3>
          </div>
          <div className="flex items-center justify-between pl-6">
            <div>
              <p className="text-xs font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Enable dark theme</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              className="scale-90"
            />
          </div>
        </div>

        {/* Profile Section */}
        <div className="border border-border/30 rounded-md p-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Profile</h3>
          </div>
          <div className="space-y-3 pl-6">
            <div>
              <Label htmlFor="name" className="text-xs">Name</Label>
              <Input 
                id="name" 
                placeholder="Your name" 
                className="h-8 text-xs mt-1" 
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="your@email.com" 
                className="h-8 text-xs mt-1" 
              />
            </div>
            <Button size="sm" className="text-xs h-8">Save</Button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="border border-border/30 rounded-md p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Notifications</h3>
          </div>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">New Bookings</p>
                <p className="text-xs text-muted-foreground">Alert on new bookings</p>
              </div>
              <Switch defaultChecked className="scale-90" />
            </div>
            <div className="flex items-center justify-between border-t border-border/20 pt-3">
              <div>
                <p className="text-xs font-medium">New Messages</p>
                <p className="text-xs text-muted-foreground">Alert on new messages</p>
              </div>
              <Switch defaultChecked className="scale-90" />
            </div>
            <div className="flex items-center justify-between border-t border-border/20 pt-3">
              <div>
                <p className="text-xs font-medium">System Updates</p>
                <p className="text-xs text-muted-foreground">Alert on updates</p>
              </div>
              <Switch className="scale-90" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
