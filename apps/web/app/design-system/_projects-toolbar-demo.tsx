"use client"

import * as React from "react"

import {
  ProjectsToolbar,
  type FilterCounts,
  type ProjectFilter,
} from "@/components/projects/projects-toolbar"

const COUNTS: FilterCounts = { all: 8, active: 6, archived: 2 }

/** Interactive harness so the catalog shows FilterTabs switching state. */
export function ProjectsToolbarDemo() {
  const [filter, setFilter] = React.useState<ProjectFilter>("all")

  return (
    <ProjectsToolbar
      value={filter}
      counts={COUNTS}
      resultCount={COUNTS[filter]}
      onChange={setFilter}
      className="w-full"
    />
  )
}
