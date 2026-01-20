import React from 'react';

interface SubCategoryTabsProps {
  subcategories: string[];
  activeSubCategory: string;
  onSubCategoryChange: (subCategory: string) => void;
}

export const SubCategoryTabs: React.FC<SubCategoryTabsProps> = ({
  subcategories,
  activeSubCategory,
  onSubCategoryChange,
}) => {
  if (subcategories.length === 0) {
    return null;
  }

  return (
    <div className="subcategory-tabs-container">
      {subcategories.map((subCategory) => {
        const isActive = activeSubCategory === subCategory;
        return (
          <button
            key={subCategory}
            type="button"
            onClick={() => onSubCategoryChange(subCategory)}
            className={isActive ? 'tab-sub tab-sub-active' : 'tab-sub tab-sub-inactive'}
          >
            {subCategory}
          </button>
        );
      })}
    </div>
  );
};
