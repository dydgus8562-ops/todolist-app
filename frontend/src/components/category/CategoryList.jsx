import { useGetCategories } from '@/hooks/useCategories.js'
import { CategoryItem } from './CategoryItem.jsx'
import { AddCategoryForm } from './AddCategoryForm.jsx'

export function CategoryList({ activeCategoryId, onCategorySelect }) {
  const { data: categories, isLoading, isError } = useGetCategories()

  if (isLoading) {
    return <p className="px-2 py-2 text-xs text-slate-400">불러오는 중...</p>
  }

  if (isError) {
    return <p className="px-2 py-2 text-xs text-rose-500">불러오기 실패</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-0.5">
        {categories?.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            isActive={activeCategoryId === category.id}
            onSelect={onCategorySelect}
          />
        ))}
        {categories?.length === 0 && (
          <li className="px-2 py-2 text-xs text-slate-400">카테고리가 없습니다.</li>
        )}
      </ul>
      <AddCategoryForm />
    </div>
  )
}
