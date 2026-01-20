import React from 'react';

export interface Category {
  id: string;
  label: string;
  icon: string;
  subcategories?: string[];
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
}) => {
  return (
    <div className="category-tabs-container">
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={isActive ? 'tab-main tab-main-active' : 'tab-main tab-main-inactive'}
          >
            <span className="material-symbols-outlined tab-main-icon">
              {category.icon}
            </span>
            <span className="tab-main-label">{category.label}</span>
          </button>
        );
      })}
    </div>
  );
};
