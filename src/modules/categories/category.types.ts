export interface ListCategoriesQuery {
  leaf_only?: string;
}

export interface CreateCategoryInput {
  name: string;
  parent_id?: number | null;
}

export interface UpdateCategoryInput {
  name?: string;
  parent_id?: number | null;
}

