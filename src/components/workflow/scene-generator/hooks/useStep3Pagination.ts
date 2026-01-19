'use client';

import { useState, useEffect, useMemo } from 'react';
import { SCENES_PER_PAGE } from '@/lib/constants/workflow';
import type { Scene } from '@/types/project';

export function useStep3Pagination(scenes: Scene[]) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(scenes.length / SCENES_PER_PAGE);
  const startIndex = (currentPage - 1) * SCENES_PER_PAGE;
  const endIndex = startIndex + SCENES_PER_PAGE;

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedScenes = useMemo(() => {
    return scenes.slice(startIndex, endIndex);
  }, [scenes, startIndex, endIndex]);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedScenes,
  };
}
