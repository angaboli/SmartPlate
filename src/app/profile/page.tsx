'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { User, Target, AlertCircle, Heart, TrendingUp, ChefHat, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CookLaterList } from '@/components/CookLaterList';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  // ─── Profile tab state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');

  // ─── Goals tab state
  const [selectedGoal, setSelectedGoal] = useState('maintain');

  // ─── Preferences tab state
  const [preferences, setPreferences] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false,
  });
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  // ─── Nutrition targets state
  const [calorieTarget, setCalorieTarget] = useState('2000');
  const [proteinTarget, setProteinTarget] = useState('60');

  // Initialize form state when profile loads
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    setAge(profile.settings.age?.toString() ?? '');
    setWeight(profile.settings.weightKg?.toString() ?? '');
    setHeight(profile.settings.heightCm?.toString() ?? '');
    setActivityLevel(profile.settings.activityLevel ?? 'moderate');
    setSelectedGoal(profile.settings.goal);
    setCalorieTarget(profile.settings.calorieTarget.toString());
    setProteinTarget(profile.settings.proteinTargetG.toString());
    setPreferences({
      vegetarian: profile.settings.vegetarian,
      vegan: profile.settings.vegan,
      glutenFree: profile.settings.glutenFree,
      dairyFree: profile.settings.dairyFree,
    });
    setSelectedAllergies(profile.settings.allergies);
  }, [profile]);

  const goals = [
    { id: 'weight-loss', label: 'Weight Loss', icon: '📉' },
    { id: 'muscle-gain', label: 'Muscle Gain', icon: '💪' },
    { id: 'maintain', label: 'Maintain Health', icon: '⚖️' },
    { id: 'energy', label: 'Boost Energy', icon: '⚡' },
  ];

  const allergies = ['Nuts', 'Shellfish', 'Eggs', 'Soy', 'Wheat', 'Fish'];

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy],
    );
  };

  function handleSaveProfile() {
    updateProfile.mutate(
      {
        name,
        settings: {
          age: age ? parseInt(age, 10) : null,
          weightKg: weight ? parseFloat(weight) : null,
          heightCm: height ? parseFloat(height) : null,
          activityLevel: activityLevel || null,
          calorieTarget: parseInt(calorieTarget, 10) || 2000,
          proteinTargetG: parseInt(proteinTarget, 10) || 60,
        },
      },
      {
        onSuccess: () => toast.success('Profile saved'),
        onError: () => toast.error('Failed to save profile'),
      },
    );
  }

  function handleSaveGoals() {
    updateProfile.mutate(
      { settings: { goal: selectedGoal } },
      {
        onSuccess: () => toast.success('Goals saved'),
        onError: () => toast.error('Failed to save goals'),
      },
    );
  }

  function handleSavePreferences() {
    updateProfile.mutate(
      {
        settings: {
          ...preferences,
          allergies: selectedAllergies,
        },
      },
      {
        onSuccess: () => toast.success('Preferences saved'),
        onError: () => toast.error('Failed to save preferences'),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground">
          {t('profile.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="profile">{t('profile.tabProfile')}</TabsTrigger>
          <TabsTrigger value="goals">{t('profile.tabGoals')}</TabsTrigger>
          <TabsTrigger value="preferences">{t('profile.tabPreferences')}</TabsTrigger>
          <TabsTrigger value="cook-later">{t('profile.tabCookLater')}</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Your Profile</h2>
                <p className="text-sm text-muted-foreground">
                  Personal information and metrics
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-input-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email ?? ''}
                    disabled
                    className="bg-input-background"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="30"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="bg-input-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="bg-input-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="bg-input-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity">Activity Level</Label>
                <select
                  id="activity"
                  className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                >
                  <option value="sedentary">Sedentary (little or no exercise)</option>
                  <option value="light">Light (exercise 1-3 days/week)</option>
                  <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                  <option value="active">Active (exercise 6-7 days/week)</option>
                  <option value="very-active">Very Active (intense exercise daily)</option>
                </select>
              </div>

              <Button
                className="bg-primary"
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Daily Metrics */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-semibold">Daily Nutrition Targets</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="calorieTarget">Calories (kcal/day)</Label>
                <Input
                  id="calorieTarget"
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(e.target.value)}
                  className="bg-input-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proteinTarget">Protein (g/day)</Label>
                <Input
                  id="proteinTarget"
                  type="number"
                  value={proteinTarget}
                  onChange={(e) => setProteinTarget(e.target.value)}
                  className="bg-input-background"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Health Goals</h2>
                <p className="text-sm text-muted-foreground">
                  Select your primary nutrition goal
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`flex items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                    selectedGoal === goal.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <span className="text-3xl">{goal.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold">{goal.label}</h3>
                  </div>
                  {selectedGoal === goal.id && (
                    <Badge className="bg-primary text-primary-foreground">Active</Badge>
                  )}
                </button>
              ))}
            </div>

            <Button
              className="mt-6 bg-primary"
              onClick={handleSaveGoals}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Goals'}
            </Button>
          </div>

          {/* Progress Tracking */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Progress Tracking</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Track daily meals</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Weekly progress emails</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">AI suggestions notifications</span>
                <Switch />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Dietary Preferences</h2>
                <p className="text-sm text-muted-foreground">
                  Customize your dietary restrictions
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(preferences).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <span className="font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#F4A261]" />
              <h3 className="font-semibold">Allergies & Intolerances</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Select ingredients you want to avoid in recipes
            </p>
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy) => (
                <Badge
                  key={allergy}
                  variant={selectedAllergies.includes(allergy) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    selectedAllergies.includes(allergy)
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : 'hover:bg-secondary'
                  }`}
                  onClick={() => toggleAllergy(allergy)}
                >
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-primary"
            onClick={handleSavePreferences}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </TabsContent>

        {/* Cook Later Tab */}
        <TabsContent value="cook-later" className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <ChefHat className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t('cookLater.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('cookLater.subtitle')}
                </p>
              </div>
            </div>

            <CookLaterList />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
