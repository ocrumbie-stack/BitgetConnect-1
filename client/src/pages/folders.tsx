import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FolderPlus, 
  Folder, 
  FileText, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Star,
  TrendingUp,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Bot
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TradingFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  tradingPairs: string[];
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function FoldersPage() {
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<TradingFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderColor, setFolderColor] = useState('#3b82f6');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Fetch folders (using screeners API as base for now)
  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['/api/folders', 'default-user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/screeners/default-user');
        if (!response.ok) {
          throw new Error('Failed to fetch folders');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching folders:', error);
        return [];
      }
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: any) => {
      try {
        const response = await fetch('/api/screeners', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(folderData),
        });
        if (!response.ok) {
          throw new Error('Failed to create folder');
        }
        return await response.json();
      } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', 'default-user'] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Create folder mutation error:', error);
    }
  });

  // Update folder mutation
  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, ...folderData }: any) => {
      try {
        const response = await fetch(`/api/screeners/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(folderData),
        });
        if (!response.ok) {
          throw new Error('Failed to update folder');
        }
        return await response.json();
      } catch (error) {
        console.error('Error updating folder:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', 'default-user'] });
      setShowEditDialog(false);
      resetForm();
    }
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const response = await fetch(`/api/screeners/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to delete folder');
        }
        return await response.json();
      } catch (error) {
        console.error('Error deleting folder:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', 'default-user'] });
    }
  });

  const resetForm = () => {
    setFolderName('');
    setFolderDescription('');
    setFolderColor('#3b82f6');
    setSelectedFolder(null);
  };

  const toggleFolderExpansion = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;

    console.log('Creating folder with data:', {
      userId: 'default-user',
      name: folderName,
      description: folderDescription,
      color: folderColor,
      tradingPairs: [],
      isStarred: false
    });

    createFolderMutation.mutate({
      userId: 'default-user',
      name: folderName,
      description: folderDescription,
      color: folderColor,
      tradingPairs: [],
      isStarred: false
    });
  };

  const handleEditFolder = () => {
    if (!selectedFolder || !folderName.trim()) return;

    updateFolderMutation.mutate({
      id: selectedFolder.id,
      userId: 'default-user',
      name: folderName,
      description: folderDescription,
      color: folderColor,
      tradingPairs: selectedFolder.tradingPairs || [],
      isStarred: selectedFolder.isStarred || false
    });
  };

  const openEditDialog = (folder: any) => {
    setSelectedFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || '');
    setFolderColor(folder.color || '#3b82f6');
    setShowEditDialog(true);
  };

  const colorOptions = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Indigo', value: '#6366f1' }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <Folder className="h-6 w-6" />
              Trading Folders
            </h1>
            <p className="text-muted-foreground text-sm">
              Organize your trading pairs into custom folders for better portfolio management
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
            data-testid="button-create-folder"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading folders...</div>
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No folders yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first folder to organize trading pairs by strategy, risk level, or any custom criteria
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              Create First Folder
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map((folder: any) => {
              const isExpanded = expandedFolders.has(folder.id);
              return (
                <Card key={folder.id} className="overflow-hidden">
                  {/* Folder Header - Always Visible */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleFolderExpansion(folder.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: folder.color || '#3b82f6' }}
                      />
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{folder.name}</h3>
                        {folder.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {folder.tradingPairs?.length || 0} pairs
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/folders/${folder.id}`);
                        }}
                        className="text-xs"
                      >
                        View Details
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteFolderMutation.mutate(folder.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {isExpanded && (
                    <div className="border-t bg-accent/20">
                      <div className="p-4 space-y-3">
                        {folder.description && (
                          <p className="text-sm text-muted-foreground">
                            {folder.description}
                          </p>
                        )}
                        
                        {folder.tradingPairs && folder.tradingPairs.length > 0 ? (
                          <div>
                            <div className="text-sm text-muted-foreground mb-2">Trading Pairs:</div>
                            <div className="flex flex-wrap gap-1">
                              {folder.tradingPairs.map((pair: string) => (
                                <Badge 
                                  key={pair} 
                                  variant="outline" 
                                  className="text-sm cursor-pointer hover:bg-accent"
                                  onClick={() => setLocation(`/charts?pair=${pair}`)}
                                >
                                  {pair}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">No pairs added yet</p>
                            <p className="text-xs mt-1">Right-click on pairs in Markets to add them</p>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2"
                            onClick={() => setLocation(`/folders/${folder.id}`)}
                          >
                            <BarChart3 className="h-4 w-4" />
                            Manage Pairs
                          </Button>
                          {folder.tradingPairs && folder.tradingPairs.length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                              onClick={() => setLocation(`/folders/${folder.id}`)}
                            >
                              <Bot className="h-4 w-4" />
                              Deploy Bots
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your trading pairs into a custom folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Folder Name</label>
              <Input
                placeholder="e.g., High Risk, DeFi Tokens, Long Term"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                data-testid="input-folder-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Input
                placeholder="Brief description of this folder"
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                data-testid="input-folder-description"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded-full border-2 ${
                      folderColor === color.value ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFolderColor(color.value)}
                    data-testid={`color-${color.name.toLowerCase()}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFolder}
              disabled={!folderName.trim() || createFolderMutation.isPending}
              data-testid="button-save-folder"
            >
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Update folder details and organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Folder Name</label>
              <Input
                placeholder="e.g., High Risk, DeFi Tokens, Long Term"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Input
                placeholder="Brief description of this folder"
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded-full border-2 ${
                      folderColor === color.value ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFolderColor(color.value)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditFolder}
              disabled={!folderName.trim() || updateFolderMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}