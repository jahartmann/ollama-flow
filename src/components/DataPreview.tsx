import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, X } from 'lucide-react';
import { CSVFile } from '@/lib/transformationEngine';

interface DataPreviewProps {
  file: CSVFile | null;
  isOpen: boolean;
  onClose: () => void;
}

const DataPreview: React.FC<DataPreviewProps> = ({ file, isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 20;

  if (!file) return null;

  const totalPages = Math.ceil(file.data.length / rowsPerPage);
  const startIndex = currentPage * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, file.data.length);
  const currentData = file.data.slice(startIndex, endIndex);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {file.name} - Datenvorschau
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{file.data.length} Zeilen</span>
            <span>{file.headers.length} Spalten</span>
            <Badge variant="outline">
              Zeige {startIndex + 1}-{endIndex} von {file.data.length}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                {file.headers.map((header, index) => (
                  <TableHead key={index} className="min-w-[120px]">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((row, rowIndex) => (
                <TableRow key={startIndex + rowIndex}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {startIndex + rowIndex + 1}
                  </TableCell>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="max-w-[200px] truncate">
                      {cell || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Seite {currentPage + 1} von {totalPages}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              Zurück
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Weiter
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Schließen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataPreview;