import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.aiCoach': 'AI Coach',
    'nav.recipes': 'Recipes',
    'nav.profile': 'Profile',
    'nav.menu': 'Menu',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // Import Recipe
    'import.title': 'Import Recipe',
    'import.button': 'Import Recipe',
    'import.subtitle': 'Import a recipe from social media',
    'import.placeholder': 'Paste Instagram, TikTok, YouTube or any recipe link...',
    'import.fetch': 'Fetch Recipe',
    'import.fetching': 'Fetching recipe...',
    'import.partialDetection': 'Some details couldn\'t be detected — you can edit manually',
    'import.invalidLink': 'Invalid or inaccessible link',
    'import.saved': 'Saved to Cook Later',
    'import.source': 'Source',
    'import.author': 'Author',
    'import.prepTime': 'Prep Time',
    'import.ingredients': 'Ingredients',
    'import.steps': 'Steps',
    'import.addToCookLater': 'Add to Cook Later',
    
    // Cook Later
    'cookLater.title': 'Cook Later',
    'cookLater.subtitle': 'Recipes saved for later',
    'cookLater.empty': 'No recipes saved yet',
    'cookLater.emptyDesc': 'Import recipes from social media to save them here',
    'cookLater.open': 'Open Recipe',
    'cookLater.addToPlanner': 'Add to Planner',
    'cookLater.remove': 'Remove',
    'cookLater.markCooked': 'Mark as Cooked',
    'cookLater.addedOn': 'Added on',
    
    // Recipe Tags
    'tag.breakfast': 'Breakfast',
    'tag.lunch': 'Lunch',
    'tag.dinner': 'Dinner',
    'tag.snack': 'Snack',
    
    // Recipes Page
    'recipes.title': 'Recipe Discovery',
    'recipes.subtitle': 'Explore global flavors with AI-recommended healthy recipes',
    'recipes.search': 'Search recipes...',
    'recipes.safariTasteOnly': 'SafariTaste Only',
    'recipes.allGoals': 'All Goals',
    'recipes.aiRecommended': 'AI Recommended',
    'recipes.allRecipes': 'All Recipes',
    'recipes.noResults': 'No recipes found',
    'recipes.noResultsDesc': 'Try adjusting your filters or search query',
    
    // Profile Page
    'profile.title': 'Profile & Goals',
    'profile.subtitle': 'Customize your nutrition preferences and health goals',
    'profile.tabProfile': 'Profile',
    'profile.tabGoals': 'Goals',
    'profile.tabPreferences': 'Preferences',
    'profile.tabCookLater': 'Cook Later',
  },
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.aiCoach': 'Coach IA',
    'nav.recipes': 'Recettes',
    'nav.profile': 'Profil',
    'nav.menu': 'Menu',
    
    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.close': 'Fermer',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    
    // Import Recipe
    'import.title': 'Importer une recette',
    'import.button': 'Importer une recette',
    'import.subtitle': 'Importer une recette depuis les réseaux sociaux',
    'import.placeholder': 'Collez un lien Instagram, TikTok, YouTube ou autre...',
    'import.fetch': 'Récupérer la recette',
    'import.fetching': 'Récupération de la recette...',
    'import.partialDetection': 'Certains détails n\'ont pas pu être détectés — vous pouvez modifier manuellement',
    'import.invalidLink': 'Lien invalide ou inaccessible',
    'import.saved': 'Enregistrée pour plus tard',
    'import.source': 'Source',
    'import.author': 'Auteur',
    'import.prepTime': 'Temps de préparation',
    'import.ingredients': 'Ingrédients',
    'import.steps': 'Étapes',
    'import.addToCookLater': 'À cuisiner plus tard',
    
    // Cook Later
    'cookLater.title': 'À cuisiner plus tard',
    'cookLater.subtitle': 'Recettes enregistrées pour plus tard',
    'cookLater.empty': 'Aucune recette enregistrée',
    'cookLater.emptyDesc': 'Importez des recettes depuis les réseaux sociaux pour les sauvegarder ici',
    'cookLater.open': 'Ouvrir la recette',
    'cookLater.addToPlanner': 'Ajouter au planning',
    'cookLater.remove': 'Retirer',
    'cookLater.markCooked': 'Marquer comme cuisinée',
    'cookLater.addedOn': 'Ajoutée le',
    
    // Recipe Tags
    'tag.breakfast': 'Petit-déjeuner',
    'tag.lunch': 'Déjeuner',
    'tag.dinner': 'Dîner',
    'tag.snack': 'Collation',
    
    // Recipes Page
    'recipes.title': 'Découverte de recettes',
    'recipes.subtitle': 'Explorez des saveurs mondiales avec des recettes saines recommandées par l\'IA',
    'recipes.search': 'Rechercher des recettes...',
    'recipes.safariTasteOnly': 'SafariTaste seulement',
    'recipes.allGoals': 'Tous les objectifs',
    'recipes.aiRecommended': 'Recommandées par l\'IA',
    'recipes.allRecipes': 'Toutes les recettes',
    'recipes.noResults': 'Aucune recette trouvée',
    'recipes.noResultsDesc': 'Essayez d\'ajuster vos filtres ou votre recherche',
    
    // Profile Page
    'profile.title': 'Profil & Objectifs',
    'profile.subtitle': 'Personnalisez vos préférences nutritionnelles et objectifs de santé',
    'profile.tabProfile': 'Profil',
    'profile.tabGoals': 'Objectifs',
    'profile.tabPreferences': 'Préférences',
    'profile.tabCookLater': 'À cuisiner',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
