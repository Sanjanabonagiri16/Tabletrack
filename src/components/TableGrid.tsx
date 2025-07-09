
import React from 'react';
import { usePOS } from '@/contexts/POSContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/types/pos';

interface TableGridProps {
  onTableSelect: (tableId: number) => void;
}

const TableGrid = ({ onTableSelect }: TableGridProps) => {
  const { tables } = usePOS();

  const getTableColor = (status: Table['status']) => {
    return status === 'available' 
      ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
      : 'bg-amber-50 border-amber-200 hover:bg-amber-100';
  };

  const getStatusColor = (status: Table['status']) => {
    return status === 'available' 
      ? 'bg-emerald-500 text-white' 
      : 'bg-amber-400 text-white';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Table Overview</h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-sm text-slate-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
            <span className="text-sm text-slate-600">Occupied</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 max-w-4xl mx-auto">
        {tables.slice(0, 25).map((table) => (
          <Card
            key={table.id}
            className={`${getTableColor(table.status)} cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md aspect-square`}
            onClick={() => onTableSelect(table.id)}
          >
            <div className="p-4 text-center h-full flex flex-col justify-center">
              <div className="text-xl font-bold text-slate-700 mb-2">
                Table {table.id}
              </div>
              <Badge className={`${getStatusColor(table.status)} text-xs`}>
                {table.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TableGrid;
