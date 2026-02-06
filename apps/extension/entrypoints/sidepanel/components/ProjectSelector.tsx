import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { sendToBackground } from '../../../src/messaging';
import type { ProjectsResponse, ProjectSummary } from '../../../src/types';

interface ProjectSelectorProps {
  selectedId: string | null;
  onSelect: (projectId: string) => void;
}

/**
 * Project dropdown selector
 *
 * Fetches user's projects from background and displays in dropdown.
 * Per CONTEXT.md: Empty dropdown on first open, user must choose project.
 */
export function ProjectSelector({ selectedId, onSelect }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    setError(null);

    try {
      const response = await sendToBackground<ProjectsResponse>({ type: 'GET_PROJECTS' });

      if (response.success) {
        setProjects(response.data.projects);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value) {
      onSelect(value);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={loadProjects}
          className="text-sm text-blue-600 hover:text-blue-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No projects found.{' '}
        <a
          href="http://localhost:3000/projects"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 underline"
        >
          Create one in the web app
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor="project-select" className="text-xs font-medium text-gray-500">
        Project
      </label>
      <select
        id="project-select"
        value={selectedId ?? ''}
        onChange={handleChange}
        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      >
        <option value="">Select a project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
