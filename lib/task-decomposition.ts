/**
 * Task Decomposition Utility
 * 
 * Breaks large features into manageable sub-tasks
 * Each task targets a single file with max 200 lines
 */

export interface Task {
  id: string;
  feature: string;
  filePath: string;
  description: string;
  maxLines: number;
  dependencies: string[];
  template?: string;
}

/**
 * Decompose a feature into file-level tasks
 */
export function decomposeFeature(featureName: string, files: string[]): Task[] {
  return files.map((file, index) => ({
    id: `${featureName}-${index}`,
    feature: featureName,
    filePath: file,
    description: `Build ${file} component`,
    maxLines: 200,
    dependencies: index > 0 ? [`${featureName}-${index-1}`] : [],
  }));
}

/**
 * Example: Drive Detail Feature
 */
export const driveDetailTasks: Task[] = [
  {
    id: 'drive-detail-0',
    feature: 'Drive Detail',
    filePath: 'components/PhotoGallery.tsx',
    description: 'Photo gallery with horizontal scroll and pagination',
    maxLines: 150,
    dependencies: [],
  },
  {
    id: 'drive-detail-1',
    feature: 'Drive Detail',
    filePath: 'components/DriveHeader.tsx',
    description: 'Drive title, author info, rating, tags',
    maxLines: 120,
    dependencies: [],
  },
  {
    id: 'drive-detail-2',
    feature: 'Drive Detail',
    filePath: 'components/EngagementBar.tsx',
    description: 'Like, save, comment, share buttons',
    maxLines: 100,
    dependencies: [],
  },
  {
    id: 'drive-detail-3',
    feature: 'Drive Detail',
    filePath: 'components/StopsList.tsx',
    description: 'List of stops/points of interest',
    maxLines: 100,
    dependencies: [],
  },
  {
    id: 'drive-detail-4',
    feature: 'Drive Detail',
    filePath: 'components/CommentsSection.tsx',
    description: 'Comments list and input',
    maxLines: 150,
    dependencies: [],
  },
  {
    id: 'drive-detail-5',
    feature: 'Drive Detail',
    filePath: 'app/drive/[id].tsx',
    description: 'Main drive detail screen assembling all components',
    maxLines: 200,
    dependencies: ['drive-detail-0', 'drive-detail-1', 'drive-detail-2', 'drive-detail-3', 'drive-detail-4'],
  },
];
