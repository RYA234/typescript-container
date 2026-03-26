export interface Recipe {
  name: string;
  ingredients: string[];
  timeMinutes?: number;
  description: string;
}

export interface RecipeIngestRequest {
  recipes: Recipe[];
}

export interface RecipeIngestResponse {
  success: boolean;
  registeredCount: number;
  executionTimeMs: number;
}

export interface RecipeSuggestRequest {
  query: string;
}

export interface RecipeSuggestion extends Recipe {
  id: string;
  similarity: number;
}

export interface RecipeSuggestResponse {
  suggestions: RecipeSuggestion[];
  executionTimeMs: number;
}

export interface RecipeDeleteResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}
