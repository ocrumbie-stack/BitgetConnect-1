import { apiRequest } from '@/lib/queryClient';

export interface TradingFolder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  tradingPairs: string[];
  isStarred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FolderService {
  private static instance: FolderService;

  private constructor() {}

  static getInstance(): FolderService {
    if (!FolderService.instance) {
      FolderService.instance = new FolderService();
    }
    return FolderService.instance;
  }

  // Get all folders for a user
  async getFolders(userId: string): Promise<TradingFolder[]> {
    try {
      return await apiRequest(`/api/screeners/${userId}`);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      return [];
    }
  }

  // Create a new folder
  async createFolder(folder: Omit<TradingFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<TradingFolder> {
    return await apiRequest('/api/screeners', 'POST', folder);
  }

  // Update an existing folder
  async updateFolder(id: string, updates: Partial<Omit<TradingFolder, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TradingFolder> {
    return await apiRequest(`/api/screeners/${id}`, 'PUT', updates);
  }

  // Delete a folder
  async deleteFolder(id: string): Promise<void> {
    await apiRequest(`/api/screeners/${id}`, 'DELETE');
  }

  // Add trading pair to folder
  async addTradingPair(folderId: string, tradingPair: string): Promise<TradingFolder> {
    // First get the current folder
    const folders = await this.getFolders('default-user');
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      throw new Error('Folder not found');
    }

    const updatedPairs = [...(folder.tradingPairs || []), tradingPair];
    return await this.updateFolder(folderId, { tradingPairs: updatedPairs });
  }

  // Remove trading pair from folder
  async removeTradingPair(folderId: string, tradingPair: string): Promise<TradingFolder> {
    // First get the current folder
    const folders = await this.getFolders('default-user');
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      throw new Error('Folder not found');
    }

    const updatedPairs = (folder.tradingPairs || []).filter(pair => pair !== tradingPair);
    return await this.updateFolder(folderId, { tradingPairs: updatedPairs });
  }

  // Toggle folder star status
  async toggleStar(folderId: string): Promise<TradingFolder> {
    const folders = await this.getFolders('default-user');
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      throw new Error('Folder not found');
    }

    return await this.updateFolder(folderId, { isStarred: !folder.isStarred });
  }

  // Get folders containing a specific trading pair
  async getFoldersForPair(tradingPair: string): Promise<TradingFolder[]> {
    const folders = await this.getFolders('default-user');
    return folders.filter(folder => 
      folder.tradingPairs && folder.tradingPairs.includes(tradingPair)
    );
  }

  // Organize folders by categories
  getOrganizedFolders(folders: TradingFolder[]) {
    return {
      starred: folders.filter(f => f.isStarred),
      recent: folders
        .filter(f => !f.isStarred)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
      all: folders.sort((a, b) => a.name.localeCompare(b.name))
    };
  }

  // Generate folder statistics
  getFolderStats(folder: TradingFolder) {
    return {
      pairCount: folder.tradingPairs?.length || 0,
      isEmpty: !folder.tradingPairs || folder.tradingPairs.length === 0,
      lastUpdated: folder.updatedAt,
      color: folder.color
    };
  }
}

export const folderService = FolderService.getInstance();