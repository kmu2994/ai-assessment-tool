import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    User,
    Mail,
    Lock,
    Volume2,
    Contrast,
    Save,
    UserCircle
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { authApi } from "@/lib/api";
import { useAccessibility } from "@/hooks/useAccessibility";
import { toast } from "sonner";

const ProfileSettings = () => {
    const user = authApi.getStoredUser();
    const {
        textToSpeech,
        highContrast,
        toggleTextToSpeech,
        toggleHighContrast
    } = useAccessibility();

    const [formData, setFormData] = useState({
        full_name: user?.full_name || "",
        email: user?.email || "",
        username: user?.username || ""
    });

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, we'd call an API here
        toast.success("Profile updated successfully (Demo)");
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto p-6 max-w-4xl space-y-8 animate-fade-in">
                <div>
                    <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                        <UserCircle className="h-10 w-10 text-primary" />
                        Settings
                    </h1>
                    <p className="text-muted-foreground">Manage your account settings and preferences</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Profile Information */}
                    <Card className="md:col-span-2 shadow-sm border-muted-foreground/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Profile Information
                            </CardTitle>
                            <CardDescription>Update your personal details</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Full Name</Label>
                                        <Input
                                            id="full_name"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input
                                            id="username"
                                            value={formData.username}
                                            disabled
                                            className="bg-muted"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            className="pl-10"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="gap-2">
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Accessibility Preferences */}
                    <Card className="shadow-sm border-muted-foreground/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-accent" />
                                Preferences
                            </CardTitle>
                            <CardDescription>Customize your experience</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="flex items-center gap-2">
                                        <Volume2 className="h-4 w-4" />
                                        Text-to-Speech
                                    </Label>
                                    <p className="text-xs text-muted-foreground">Hear questions read aloud</p>
                                </div>
                                <Switch
                                    checked={textToSpeech}
                                    onCheckedChange={toggleTextToSpeech}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="flex items-center gap-2">
                                        <Contrast className="h-4 w-4" />
                                        High Contrast
                                    </Label>
                                    <p className="text-xs text-muted-foreground">Improve UI visibility</p>
                                </div>
                                <Switch
                                    checked={highContrast}
                                    onCheckedChange={toggleHighContrast}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security */}
                    <Card className="md:col-span-3 shadow-sm border-muted-foreground/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-destructive" />
                                Security
                            </CardTitle>
                            <CardDescription>Manage your password and account security</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-dashed">
                                <div>
                                    <p className="font-medium">Change Password</p>
                                    <p className="text-sm text-muted-foreground">It's a good idea to use a strong password that you're not using elsewhere</p>
                                </div>
                                <Button variant="outline">Update Password</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

// Placeholder for Activity icon if not imported
const Activity = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

export default ProfileSettings;
