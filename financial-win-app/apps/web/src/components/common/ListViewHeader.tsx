import React from 'react';
import { PageHeader, type PageHeaderAction } from '../layout';

export type ViewType = 'table' | 'cards';

export interface ListViewHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
  onFilterClick: () => void;
  onDownloadClick: () => void;
  onAddClick: () => void;
}

export const ListViewHeader: React.FC<ListViewHeaderProps> = ({
  title,
  showBackButton = false,
  onBack,
  showSearch = true,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  viewType,
  onViewTypeChange,
  onFilterClick,
  onDownloadClick,
  onAddClick,
}) => {
  const handleToggleView = () => {
    const newViewType: ViewType = viewType === 'table' ? 'cards' : 'table';
    onViewTypeChange(newViewType);
  };

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'filter_list',
      label: 'Filtros',
      onClick: onFilterClick,
      variant: 'default',
    },
    {
      icon: viewType === 'table' ? 'grid_view' : 'format_list_bulleted',
      label: viewType === 'table' ? 'Vista tarjetas' : 'Vista tabla',
      onClick: handleToggleView,
      variant: 'default',
    },
    {
      icon: 'download',
      label: 'Descargar',
      onClick: onDownloadClick,
      variant: 'default',
    },
    {
      icon: 'add',
      label: 'Añadir',
      onClick: onAddClick,
      variant: 'primary',
    },
  ];

  return (
    <PageHeader
      title={title}
      showBackButton={showBackButton}
      onBack={onBack}
      showSearch={showSearch}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      actions={headerActions}
    />
  );
};
