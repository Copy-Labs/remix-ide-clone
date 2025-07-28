import React, { useEffect, useState } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Download, Info, Trash2 } from 'lucide-react';

/**
 * GitLFSPanel component for managing Git LFS files
 */
const GitLFSPanel: React.FC = () => {
  // State for LFS files
  const [lfsFiles, setLFSFiles] = useState<
    Array<{
      oid: string;
      filepath: string;
      size: number;
      date: string;
    }>
  >([]);

  // State for LFS settings
  const [sizeThreshold, setSizeThreshold] = useState<number>(5 * 1024 * 1024); // 5MB default
  const [lfsExtensions, setLFSExtensions] = useState<string[]>([]);
  const [newExtension, setNewExtension] = useState<string>('');

  // State for storage stats
  const [totalSize, setTotalSize] = useState<number>(0);
  const [usedStorage, setUsedStorage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Get Git store
  const { isInitialized } = useGitStore();

  // Load LFS files and stats
  const loadLFSFiles = async () => {
    if (!isInitialized) return;

    setLoading(true);
    try {
      // This is a placeholder - in a real implementation, we would get this data from gitLFSService
      // const files = await gitLFSService.listLFSFiles();
      // setLFSFiles(files);

      // For now, use mock data
      setLFSFiles([
        {
          oid: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          filepath: 'images/large-image.png',
          size: 7340032, // ~7MB
          date: new Date().toISOString(),
        },
        {
          oid: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          filepath: 'videos/demo.mp4',
          size: 15728640, // ~15MB
          date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
      ]);

      // Get total LFS size
      // const total = await gitLFSService.getTotalLFSSize();
      // setTotalSize(total);

      // Mock total size
      setTotalSize(23068672); // ~22MB

      // Mock used storage (percentage of browser storage)
      setUsedStorage(30); // 30%

      // Get LFS settings
      // const settings = await gitLFSService.getSettings();
      // setSizeThreshold(settings.sizeThreshold);
      // setLFSExtensions(settings.lfsExtensions);

      // Mock LFS extensions
      setLFSExtensions(['.png', '.jpg', '.mp4', '.zip']);
    } catch (err) {
      console.error('Failed to load LFS files:', err);
      toast.error('Failed to load LFS files');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadLFSFiles();
  }, [isInitialized]);

  // Format bytes to human-readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle adding a new extension
  const handleAddExtension = () => {
    if (!newExtension) return;

    // Ensure extension starts with a dot
    let ext = newExtension;
    if (!ext.startsWith('.')) {
      ext = '.' + ext;
    }

    // Check if extension already exists
    if (lfsExtensions.includes(ext)) {
      toast.error(`Extension ${ext} is already in the list`);
      return;
    }

    // Add extension
    setLFSExtensions([...lfsExtensions, ext]);
    setNewExtension('');

    // In a real implementation, we would save the settings
    // await gitLFSService.saveSettings({ sizeThreshold, lfsExtensions: [...lfsExtensions, ext] });

    toast.success(`Added ${ext} to LFS extensions`);
  };

  // Handle removing an extension
  const handleRemoveExtension = (ext: string) => {
    setLFSExtensions(lfsExtensions.filter((e) => e !== ext));

    // In a real implementation, we would save the settings
    // await gitLFSService.saveSettings({ sizeThreshold, lfsExtensions: lfsExtensions.filter(e => e !== ext) });

    toast.success(`Removed ${ext} from LFS extensions`);
  };

  // Handle changing size threshold
  const handleSizeThresholdChange = (value: string) => {
    const numValue = parseInt(value);
    setSizeThreshold(numValue * 1024 * 1024); // Convert MB to bytes

    // In a real implementation, we would save the settings
    // await gitLFSService.saveSettings({ sizeThreshold: numValue * 1024 * 1024, lfsExtensions });

    toast.success(`Set LFS size threshold to ${numValue}MB`);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Git LFS Manager</h2>
        <Button onClick={loadLFSFiles} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <div className="flex gap-4 mb-4 bg-gray-50 p-3 rounded">
        <div className="flex flex-col">
          <span className="text-xs text-gray-600">Total LFS Files</span>
          <span className="text-base font-bold">{lfsFiles.length}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-600">Total Size</span>
          <span className="text-base font-bold">{formatBytes(totalSize)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-600">Storage Usage</span>
          <div className="w-32">
            <Progress value={usedStorage} className="h-2" />
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 border border-gray-200 rounded">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-medium">LFS Settings</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>These settings control which files are stored in LFS</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center mb-2">
          <span className="w-36 mr-2">Size Threshold:</span>
          <Select
            value={String(sizeThreshold / (1024 * 1024))}
            onValueChange={handleSizeThresholdChange}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 MB</SelectItem>
              <SelectItem value="5">5 MB</SelectItem>
              <SelectItem value="10">10 MB</SelectItem>
              <SelectItem value="50">50 MB</SelectItem>
              <SelectItem value="100">100 MB</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-2">Files larger than this will use LFS</span>
        </div>

        <div className="flex items-center mb-2">
          <span className="w-36 mr-2">LFS Extensions:</span>
          <div className="flex flex-wrap gap-2">
            {lfsExtensions.map((ext) => (
              <Button
                key={ext}
                variant="outline"
                size="sm"
                onClick={() => handleRemoveExtension(ext)}
              >
                {ext} <Trash2 className="h-3 w-3 ml-1" />
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <span className="w-36 mr-2">Add Extension:</span>
          <Input
            value={newExtension}
            onChange={(e) => setNewExtension(e.target.value)}
            placeholder=".png"
            className="w-32"
            onKeyPress={(e) => e.key === 'Enter' && handleAddExtension()}
          />
          <Button onClick={handleAddExtension} className="ml-2" disabled={!newExtension}>
            Add
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">File</th>
              <th className="px-4 py-2 text-left">Size</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lfsFiles.map((file) => (
              <tr key={file.oid} className="border-t">
                <td className="px-4 py-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        {file.filepath.split('/').pop() || file.filepath}
                      </TooltipTrigger>
                      <TooltipContent>{file.filepath}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="px-4 py-2">{formatBytes(file.size)}</td>
                <td className="px-4 py-2">{new Date(file.date).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // In a real implementation, we would download the file
                              // await gitLFSService.downloadLFSFile(file.oid);
                              toast.success(`Downloaded ${file.filepath}`);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // In a real implementation, we would delete the file
                              // await gitLFSService.deleteLFSFile(file.oid);
                              setLFSFiles(lfsFiles.filter((f) => f.oid !== file.oid));
                              toast.success(`Deleted ${file.filepath}`);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lfsFiles.length === 0 && (
          <div className="p-8 text-center text-gray-500">No LFS files found</div>
        )}
      </div>
    </div>
  );
};

export default GitLFSPanel;
